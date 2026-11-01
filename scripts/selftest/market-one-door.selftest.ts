/**
 * Selftest bo-2026-11-02-01: doctrine SATU PINTU rumus change% pasar.
 *
 * Latar: audit data-consistency 1 Nov (row-33) menemukan 16 call-site
 * menghitung ((close - prev) / prev) * 100 inline di luar marketEngine —
 * jalur duplikat yang sama yang memicu insiden drift angka ref-2026-10-17-01.
 * Migrasi ini memindahkan SEMUA call-site ke marketEngine.pctChange().
 *
 * Lapisan A (statis): pattern rumus inline di src/ hanya boleh hidup di dua
 *   file kanon (src/lib/market-engine.ts = definisi, market-snapshot.service
 *   = re-export). Test ini juga mengecek ekstraksi engine murni (0 import
 *   domain/service — bebas circular utk konsumen src/lib).
 * Lapisan B (parity): hasil pctChange bit-identik dengan rumus inline lama
 *   pada input valid; call-site lama yang fallback 0 kini ?? 0 — perilaku
 *   sama untuk semua input finite (incl. hardening anomaly-detection:
 *   prev<=0 dulu menghasilkan Infinity, kini 0).
 *
 * Run: npx tsx scripts/selftest/market-one-door.selftest.ts
 * Exit 0 = PASS semua.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { marketEngine } from "../../src/lib/market-engine";

const here = dirname(fileURLToPath(import.meta.url));

function listTsFiles(dir: string): string[] {
  // walk manual tanpa dep — cukup utk src/
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(e)) out.push(full);
    }
  };
  walk(dir);
  return out;
}
import { readdirSync, statSync } from "node:fs";

const CANON = ["src/lib/market-engine.ts", "src/domains/stock/market-snapshot.service.ts"];
// Pattern rumus pct inline (varian nama var umum di repo ini).
const PATTERNS = [
  /\(\s*close\s*-\s*prevClose\s*\)\s*\/\s*prevClose/,
  /\(\s*close\s*-\s*prev\s*\)\s*\/\s*prev\b/,
  /\(\s*c\.close\s*-\s*p\.close\s*\)\s*\/\s*p\.close/,
  /\(\s*todayClose\s*-\s*yesterdayClose\s*\)\s*\/\s*yesterdayClose/,
  /\(\s*todayPrice\.close\s*-\s*yesterdayPrice\.close\s*\)\s*\/\s*yesterdayPrice\.close/,
];

test("[A1] nol rumus pct inline di src/ di luar 2 file kanon", () => {
  const files = listTsFiles(join(here, "../../src"));
  const offenders: string[] = [];
  for (const f of files) {
    const rel = f.slice(f.indexOf("src/"));
    if (CANON.includes(rel)) continue;
    const src = readFileSync(f, "utf8");
    if (PATTERNS.some((re) => re.test(src))) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `rumus pct inline masih ada di: ${offenders.join(", ")}`);
});

test("[A2] engine murni: 0 import (bebas circular utk konsumen src/lib)", () => {
  const src = readFileSync(join(here, "../../src/lib/market-engine.ts"), "utf8");
  assert.doesNotMatch(src, /^\s*import\s/m, "market-engine.ts tidak boleh import apa pun (pure)");
});

test("[A3] market-snapshot re-export engine (konsumen lama tak berubah jalur)", () => {
  const src = readFileSync(join(here, "../../src/domains/stock/market-snapshot.service.ts"), "utf8");
  assert.match(src, /export\s*\{\s*marketEngine\s*\}\s*from\s*"@\/lib\/market-engine"/);
});

test("[B1] parity pctChange vs rumus inline lama pada input valid", () => {
  const rows = [
    { close: 100, prev: 100 },
    { close: 110, prev: 100 },
    { close: 90, prev: 100 },
    { close: 55.555, prev: 50 },
    { close: 2000, prev: 1285 },
    { close: 125, prev: 100 },
    { close: 0, prev: 100 },
  ];
  for (const r of rows) {
    const oldInline = ((r.close - r.prev) / r.prev) * 100;
    assert.equal(marketEngine.pctChange(r.close, r.prev), oldInline);
  }
});

test("[B2] guard prev invalid -> null (data sampah, bukan sinyal)", () => {
  assert.equal(marketEngine.pctChange(100, 0), null);
  assert.equal(marketEngine.pctChange(100, -5), null);
  assert.equal(marketEngine.pctChange(Number.NaN, 100), null);
});

test("[B3] parity call-site fallback-0 (?? 0 == guard lama prevClose !== 0 ? x : 0)", () => {
  // Pola lama: prevClose !== 0 ? ((c-p)/p)*100 : 0  (technical-screener, ai-context)
  const cases: Array<[number, number]> = [[110, 100], [90, 100], [100, 100]];
  for (const [c, p] of cases) {
    const oldInline = p !== 0 ? ((c - p) / p) * 100 : 0;
    assert.equal(marketEngine.pctChange(c, p) ?? 0, oldInline);
  }
  // prev = 0: lama = 0, kini null ?? 0 = 0 — identik
  assert.equal(marketEngine.pctChange(100, 0) ?? 0, 0);
});
