/**
 * Self-test TermTip tooltip istilah inline (PRD im-2026-10-29-2 / task prd-2026-10-31-02).
 * Run: npx tsx scripts/selftest-term-tip.ts
 *
 * Failing-test-first: kontrak didefinisikan sebelum implementasi (pola selftest-reputation-daily).
 * KONTRAK (AC1-AC6):
 *  - AC1 TermTip membungkus Tooltip UI existing; sumber definisi = GLOSSARY_TERMS import tunggal.
 *  - AC4 Fail-diam: istilah tak dikenal -> render teks polos, 0 throw.
 *  - AC5 SSR: definisi dikirim ke client via props (bukan JS-only) — crawler/AI-search baca.
 *  - AC2 Halaman fase-1: minimal 2 istilah ter-anotasi per halaman (cek source literal).
 *  - AC3 Glosarium anchor id per-istilah; AC6 data-nav-label dicek sebelum a[href].
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Komponen baru hasil build malam ini — import di sini agar test GAGAL dulu
// saat perilaku belum ada (stub null = RED).
import { TermTip } from "../src/components/seo/term-tip";
import { GLOSSARY_TERMS } from "../src/lib/glossary-terms";

type TipEl = { type: unknown; props: Record<string, unknown> };

test("[1] AC1 istilah dikenal: element dgn props kamus dari GLOSSARY_TERMS import tunggal", () => {
  const el = TermTip({ term: "golden-cross", children: "golden cross" }) as unknown as TipEl;
  assert.ok(typeof el === "object" && el !== null, "TermTip dikenal mengembalikan element React (bukan null)");
  assert.equal(el.props.slug, "golden-cross", "props.slug = slug istilah (diteruskan ke client)");
  assert.equal(el.props.term, "Golden Cross", "props.term dari GLOSSARY_TERMS");
  assert.ok(String(el.props.definition ?? "").length > 40, "props.definition terisi (definisi asli kamus)");
  assert.equal(el.props.fallbackText, "golden cross", "props.fallbackText = children asli (fail-diam)");
});

test("[2] AC4 fail-diam: istilah TAK dikenal -> teks polos children, 0 throw", () => {
  const el = TermTip({ term: "quantitative-easing-zzz", children: "QE" }) as unknown as TipEl;
  assert.ok(typeof el === "object" && el !== null, "TIDAK throw");
  assert.equal(el.props?.children, "QE", "render teks polos children (bukan tooltip)");
});

test("[3] Semua slug fase-1 valid di GLOSSARY_TERMS", () => {
  const slugs = new Set(GLOSSARY_TERMS.map((t) => t.slug));
  for (const s of ["golden-cross", "death-cross", "moving-average", "oversold", "rsi", "macd", "stop-loss"]) {
    assert.ok(slugs.has(s), `slug '${s}' ada di kamus`);
  }
});

test("[4] AC2 halaman fase-1: minimal 2 TermTip eksplisit per halaman (source literal)", () => {
  const pages = [
    ["saham-golden-cross", ["golden-cross", "moving-average"]],
    ["saham-death-cross", ["death-cross", "moving-average"]],
    ["saham-oversold", ["oversold", "rsi"]],
  ] as const;
  for (const [page, terms] of pages) {
    const src = readFileSync(join(root, `src/app/(public)/${page}/page.tsx`), "utf8");
    const count = terms.filter((t) => src.includes(`<TermTip term="${t}"`)).length;
    assert.ok(count >= 2, `${page}: >=2 TermTip di source (found ${count}/${terms.length})`);
  }
});

test("[5] AC3/AC6 glosarium anchor + telemetri precedence", () => {
  const glos = readFileSync(join(root, "src/app/(public)/akademi/glosarium/page.tsx"), "utf8");
  assert.ok(glos.includes("id={t.slug}"), "glosarium: anchor id per-istilah (scroll target)");
  assert.ok(glos.includes("scroll-mt-"), "glosarium: scroll-mt agar anchor tak tertutup header");
  const eng = readFileSync(join(root, "src/components/engagement-instrument.tsx"), "utf8");
  assert.ok(
    eng.indexOf("data-nav-label") < eng.indexOf('el.closest("a[href]")'),
    "engagement: data-nav-label dicek SEBELUM anchor branch (klik 'Lihat di Kamus' = glossary_open)"
  );
});
