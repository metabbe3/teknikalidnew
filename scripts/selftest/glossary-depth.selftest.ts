/**
 * Selftest prd-2026-11-02-03 (FAILING-TEST-FIRST — commit test ini SEBELUM konten):
 * Glosarium content-depth — 15 istilah prioritas naik ke >=300 kata + blok contoh
 * angka nyata SSR dari SATU PINTU + internal-link artikel akademi + sitemap re-entry
 * selektif (buka kunci seo-dr-2 hanya utk yang lolos depth gate).
 *
 * A. GLOSSARY_DEEP_DIVES mengekspor TEPAT 15 slug prioritas deterministik
 *    (5 TermTip fase-1 + 10 fundamental/pasar urut slug).
 * B. Tiap slug: total kata (definition GLOSSARY_TERMS + sections deep-dive) >= 300.
 * C. Tiap slug: >=1 internal-link artikel akademi; bila DB reachable → slug HARUS
 *    ada di Article PUBLISHED (dilarang mengarang slug).
 * D. passesDepthGate() mengembalikan tepat 15 slug; sitemap.ts memakai filter gate
 *    (bukan spread buta semua istilah).
 * E. example spec kind valid + preset screener terdaftar di VALID_PRESETS.
 *
 * Run: npx tsx scripts/selftest/glossary-depth.selftest.ts
 * Exit 0 = PASS semua.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOSSARY_TERMS } from "../../src/lib/glossary-terms";
import {
  GLOSSARY_DEEP_DIVES,
  passesDepthGate,
  PRIORITY_SLUGS,
  type GlossaryExampleSpec,
} from "../../src/lib/glossary-deep-dives";
import { VALID_PRESETS } from "../../src/domains/stock/indicator.service";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

const EXPECTED_15 = [
  // 5 TermTip fase-1 (terbukti dipakai 3 halaman kondisi)
  "rsi", "moving-average", "golden-cross", "death-cross", "oversold",
  // 10 kategori fundamental/pasar urut slug
  "blue-chip", "dividen", "eps", "ihsg", "ipo", "lot", "market-cap", "pbv", "per", "saham",
];

// A. tepat 15 slug prioritas
check("A1 PRIORITY_SLUGS = 15 slug deterministik",
  PRIORITY_SLUGS.length === 15 && PRIORITY_SLUGS.every((s) => EXPECTED_15.includes(s)),
  `got ${PRIORITY_SLUGS.length}: ${PRIORITY_SLUGS.join(",")}`);
check("A2 GLOSSARY_DEEP_DIVES keys == PRIORITY_SLUGS",
  Object.keys(GLOSSARY_DEEP_DIVES).sort().join() === [...PRIORITY_SLUGS].sort().join());

const VALID_KINDS = new Set([
  "screener_top", "oversold_count", "dividend_upcoming",
  "fundamental_top", "ipo_recent", "ihsg_snapshot", "lot_math",
]);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function loadPublishedSlugs(): Promise<Set<string> | null> {
  try {
    // Read-only DB check (opsional — null bila DB tak reachable).
    // Prisma 7 + @prisma/adapter-pg — pola persis src/lib/prisma.ts (repo pattern).
    const { PrismaClient } = await import("../../src/generated/prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const pgMod = await import("pg");
    const envLine = readFileSync(join(__dirname, "../../.env"), "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    const url = envLine?.slice("DATABASE_URL=".length).trim();
    if (!url) return null;
    const pool = new pgMod.default.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
    const p = new PrismaClient({ adapter: new PrismaPg(pool) });
    const rows = await p.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    await p.$disconnect();
    return new Set(rows.map((r) => r.slug));
  } catch {
    console.error("(DB tidak reachable — C3 slug-existence di-skip, C1/C2 tetap)");
    return null;
  }
}

async function main(): Promise<void> {
  const publishedSlugs = await loadPublishedSlugs();
  const dbReachable = publishedSlugs !== null;

  // B + C + E per slug
  for (const slug of PRIORITY_SLUGS) {
  const term = GLOSSARY_TERMS.find((t) => t.slug === slug);
  const dd = GLOSSARY_DEEP_DIVES[slug];
  check(`B0 ${slug}: ada di GLOSSARY_TERMS`, !!term);
  if (!term || !dd) continue;

  const words = countWords(term.definition) +
    dd.sections.reduce((n, s) => n + countWords(s.body), 0);
  check(`B1 ${slug}: >=300 kata (got ${words})`, words >= 300);

  check(`C1 ${slug}: >=1 link artikel akademi`, (dd.articles?.length ?? 0) >= 1);
  if (dd.articles?.length) {
    if (publishedSlugs) {
      const missing = dd.articles.filter((a) => !publishedSlugs!.has(a.slug));
      check(`C3 ${slug}: slug artikel ada di DB PUBLISHED`, missing.length === 0,
        `missing: ${missing.map((m) => m.slug).join(",")}`);
    }
    const badFormat = dd.articles.filter((a) => !/^[a-z0-9-]+$/.test(a.slug));
    check(`C2 ${slug}: slug artikel lowercase-dash`, badFormat.length === 0);
  }

  check(`E1 ${slug}: example spec ada`, !!dd.example);
  if (dd.example) {
    const ex = dd.example as GlossaryExampleSpec;
    check(`E2 ${slug}: kind valid (${ex.kind})`, VALID_KINDS.has(ex.kind));
    if (ex.kind === "screener_top") {
      check(`E3 ${slug}: preset '${ex.preset}' di VALID_PRESETS`, VALID_PRESETS.has(ex.preset));
    }
  }
  }

  // D. depth gate = tepat 15
  const gated = GLOSSARY_TERMS.filter(passesDepthGate).map((t) => t.slug);
  check("D1 passesDepthGate = tepat 15 slug", gated.length === 15, `got ${gated.length}`);

  const sitemapSrc = readFileSync(join(__dirname, "../../src/app/sitemap.ts"), "utf8");
  check(
  "D2 sitemap.ts pakai filter passesDepthGate (re-entry selektif, bukan spread buta)",
  sitemapSrc.includes("passesDepthGate"),
  );
  check(
  "D3 sitemap.ts: konstruksi lama tanpa filter (GLOSSARY_TERMS.map ke glossaryPages) tidak boleh kembali",
  !sitemapSrc.includes("const glossaryPages = GLOSSARY_TERMS.map"),
  );

  console.error(`\nglossary-depth.selftest: ${pass} PASS, ${fail} FAIL (dbReachable=${dbReachable})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("selftest crash:", e);
  process.exit(1);
});
