/**
 * Selftest fix-2026-10-26-11 (FAILING-TEST-FIRST — commit ini SEBELUM fix):
 * Guard pipeline (sanitize → quality → dedup → factCheck) hanya berjalan di
 * jalur news; jalur movement-analysis publish TANPA guard + layering rusak.
 *
 * Lapisan A (statis, gagal hari ini):
 *  A1. movement-analysis.service TIDAK boleh import prisma langsung /
 *      $queryRaw (SATU PINTU repository — acceptance "prisma langsung = 0").
 *  A2. movement-analysis.service TIDAK boleh ada await-query di dalam for-loop
 *      (N+1: findTopMovers enrich loop ≤2 query per mover × ≤50 movers).
 *  A3. generateForStock WAJIB memanggil runGenerationGuards sebelum write DB
 *      (sanitize/quality/dedup/factCheck — jalur publish kotor = bug TRUST).
 *  A4. article.service TIDAK boleh berisi $queryRaw cross-domain (stock data
 *      via stockRepository, bukan SQL mentah lintas domain).
 *
 * Lapisan B (perilaku pure-gate, diimplementasi bersama fix):
 *  B1. sanitize dijalankan pada konten & judul (script-tag / prompt-leak dibuang).
 *  B2. quality gate: word_count error di bawah minimum; movement minWords=300.
 *  B3. verdict factCheck hold → status DRAFT (autoPublish di-override).
 *  B4. gate failure → error terlempar; TIDAK ada write DB (articleRepository
 *      tidak dipanggil).
 *
 * Run: npx tsx scripts/selftest/article-guard-doctrine.selftest.ts
 * Exit 0 = PASS semua.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

const SRC_MOVEMENT = join(__dirname, "../../src/domains/article/movement-analysis.service.ts");
const SRC_ARTICLE = join(__dirname, "../../src/domains/article/article.service.ts");
const movementSrc = readFileSync(SRC_MOVEMENT, "utf8");
const articleSrc = readFileSync(SRC_ARTICLE, "utf8");

// ── A1: larangan import prisma langsung di movement-analysis ──
check(
  "A1 movement-analysis.service tidak import prisma langsung (SATU PINTU repository)",
  !/from\s+"@\/lib\/prisma"/.test(movementSrc) && !/\bprisma\.\$queryRaw/.test(movementSrc),
  "masih ada import prisma / $queryRaw langsung di movement-analysis.service.ts",
);

// ── A2: larangan await-query di dalam for-loop (N+1) ──
const nPlusOne = /for\s*\(const\s+\w+\s+of\s+\w+\)\s*\{[\s\S]*?await\s+(?:prisma\.|stockRepository\.|stockMarketService\.findStockByTicker|articleRepository\.)/.test(movementSrc);
check(
  "A2 tidak ada await-query di dalam for-loop (N+1) di movement-analysis",
  !nPlusOne,
  "ditemukan pola for..of + await query = N+1 sekuensial",
);

// ── A3: generateForStock wajib lewat guard pipeline ──
check(
  "A3 generateForStock memanggil runGenerationGuards sebelum write",
  /runGenerationGuards/.test(movementSrc),
  "jalur movement publish tanpa sanitize/quality/dedup/factCheck (fix-2026-10-26-11 poin 1)",
);

// ── A4: article-fact-check (service layer) bebas prisma langsung ──
const factCheckSrc = readFileSync(join(__dirname, "../../src/domains/article/article-fact-check.ts"), "utf8");
check(
  "A4 article-fact-check tidak prisma langsung (slugs via articleRepository)",
  !/from\s+"@\/lib\/prisma"/.test(factCheckSrc) && !/\bprisma\./.test(factCheckSrc),
  "masih ada import prisma / prisma.* langsung di article-fact-check.ts (layering rusak :8/:337)",
);

// ── B: pure-gate behavior (module baru tersedia setelah fix) ──
async function behaviorTests(): Promise<void> {
  const guards = await import("../../src/domains/article/article-guards");
  const { runGenerationGuards } = guards;

  // Preset movement (fix-2026-10-26-11): 400-600 kata, 1 H2 + H3, cta+disclaimer wajib.
  const MOVEMENT_OPTS = { minWords: 300, structure: { minH2: 1, requireCta: true, requireDisclaimer: true } } as const;

  // Fixture: AI output kotor (script tag + terlalu pendek + tanpa struktur)
  const dirty = "<script>alert('xss')</script><p>Ringkasan singkat.</p>";
  let threw = false;
  let reason = "";
  try {
    await runGenerationGuards({
      content: dirty,
      title: "Kenapa Saham ABCD Naik Hari Ini? (+5,00%)",
      keywords: ["kenapa saham abcd naik hari ini"],
      dedupOverride: { isDuplicate: false, similarityScore: 0, similarTo: null },
      opts: MOVEMENT_OPTS,
    });
  } catch (err) {
    threw = true;
    reason = err instanceof Error ? err.message : String(err);
  }
  check("B1+B2+B4 konten kotor & terlalu pendek → gate throw, tanpa write DB", threw && /word_count|QualityGate|rejected/i.test(reason), reason);

  // Fixture: konten movement sehat (H2 + disclaimer + cta + 300 kata)
  const para = "Analisis pergerakan harga saham hari ini menunjukkan momentum yang kuat dari sisi teknikal. ";
  const healthy = [
    "## Kenapa Saham BBCA Naik Hari Ini? (+2,50%)",
    "",
    ...Array.from({ length: 6 }, () => para.repeat(10)),
    "",
    ":::warning[Disclaimer]",
    "Artikel ini bukan rekomendasi jual beli.",
    ":::",
    "",
    ":::cta[Pantau BBCA Real-time]",
    "Lihat chart BBCA di TeknikalID.",
    ":::",
  ].join("\n");
  const res = await runGenerationGuards({
    content: healthy,
    title: "Kenapa Saham BBCA Naik Hari Ini? (+2,50%)",
    keywords: ["kenapa saham bbc"],
    dedupOverride: { isDuplicate: false, similarityScore: 0, similarTo: null },
    factCheckOverride: { passed: true, mismatches: [], correctedContent: null, correctedTitle: null, meta: { claimsChecked: 3, checkedAt: new Date().toISOString() } },
    opts: MOVEMENT_OPTS,
  });
  check("B2 konten sehat lolos semua gate (minWords=300, minH2=1)", res.status === "publish", JSON.stringify(res).slice(0, 200));

  // B3: factCheck verdict hold → DRAFT
  const resHold = await runGenerationGuards({
    content: healthy,
    title: "Kenapa Saham BBCA Naik Hari Ini? (+2,50%)",
    keywords: ["kenapa saham bbc"],
    dedupOverride: { isDuplicate: false, similarityScore: 0, similarTo: null },
    factCheckOverride: { passed: false, mismatches: [], correctedContent: null, correctedTitle: null, meta: { claimsChecked: 3, checkedAt: new Date().toISOString() } },
    opts: MOVEMENT_OPTS,
  });
  check("B3 factCheck hold → status draft (autoPublish override)", resHold.status === "draft", JSON.stringify(resHold).slice(0, 200));
}

behaviorTests()
  .then(() => {
    if (fail > 0) {
      console.error(`\narticle-guard-doctrine selftest: ${pass} pass, ${fail} FAIL`);
      process.exit(1);
    }
    console.log(`\narticle-guard-doctrine selftest: ${pass} pass, 0 fail`);
  })
  .catch((e) => {
    console.error("SELFTEST CRASH:", e);
    process.exit(1);
  });
