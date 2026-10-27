/**
 * Selftest fix-2026-10-26-10: engine SATU PINTU market-snapshot.
 *
 * PARITY CONTRACT: hasil engine HARUS bit-identik dengan rumus inline lama
 * di weekly-report.service + screener-analysis.service (direkonstruksi di
 * bawah dari kode pre-refactor, commit 87d96bf). Angka /laporan-pasar tidak
 * boleh bergeser sedikit pun — ini refactor konsolidasi, bukan perubahan
 * metode.
 *
 * Run: npx tsx scripts/selftest/market-snapshot-engine.selftest.ts
 * Exit 0 = PASS semua.
 */
import { marketEngine } from "../../src/domains/stock/market-snapshot.service";

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}\n  got : ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
  }
}

// ── Fixture: 7 saham + edge cases, sebagian dirancang menangkap drift ──
const rows = [
  { ticker: "AALI.JK", sector: "A", close: 100, prev: 100 },   // 0%    unchanged
  { ticker: "BBCA.JK", sector: "A", close: 110, prev: 100 },   // +10%  advancer
  { ticker: "BRIS.JK", sector: "B", close: 90, prev: 100 },    // -10%  decliner
  { ticker: "MDKA.JK", sector: "B", close: 55.555, prev: 50 }, // +11.11%
  { ticker: "PTMR.JK", sector: "C", close: 2000, prev: 1285 }, // +55.64% (insiden drift)
  { ticker: "BSWD.JK", sector: "C", close: 125, prev: 100 },   // +25%
  { ticker: "ZERO.JK", sector: "C", prev: 100, close: 0 },     // prev valid, close 0
];

// 1) pctChange parity — rumus lama: prev_close ? ((c-p)/p)*100 : null
function oldPct(close: number, prev: number | null): number | null {
  return prev ? ((close - prev) / prev) * 100 : null;
}
for (const r of rows) {
  const prevArg: number | null = r.prev; // kolom prev_close dari SQL
  check(
    `pctChange(${r.ticker})`,
    marketEngine.pctChange(r.close, prevArg),
    oldPct(r.close, prevArg),
  );
}
// Guard tambahan (semantik baru disengaja, sama tuanya guard lama: prev 0 di-skip):
check("pctChange prev=0 -> null", marketEngine.pctChange(100, 0), null);
check("pctChange prev=null -> null (Number(null)=0)", marketEngine.pctChange(100, Number(null)), null);
check("pctChange prev negatif -> null", marketEngine.pctChange(100, -5), null);

// 2) changeFraction parity — filter lama: prev ? (c-p)/p : 0
function oldFraction(close: number, prev: number | null): number {
  return prev ? (close - prev) / prev : 0;
}
for (const r of rows) {
  check(
    `changeFraction(${r.ticker})`,
    marketEngine.changeFraction(r.close, r.prev),
    oldFraction(r.close, r.prev),
  );
}
check("changeFraction prev=0 -> null (fallback ?? 0 di konsumen)", marketEngine.changeFraction(100, 0), null);

// 3) breadth parity — 3x filter().length lama
const withChange = rows.map((r) => ({ ticker: r.ticker, changePercent: marketEngine.pctChange(r.close, r.prev) ?? 0 }));
check(
  "breadth",
  marketEngine.breadth(withChange),
  { advancers: 4, decliners: 2, unchanged: 1, total: 7 }, // ZERO close=0 -> -100% decliner ke-2
);

// 4) sectorAverages parity — Map first-seen + sum/total lama (weekly)
const withSector = rows.map((r) => ({ sector: r.sector, changePercent: marketEngine.pctChange(r.close, r.prev) ?? 0 }));
const engineSectors = marketEngine.sectorAverages(withSector);
{
  // Implementasi lama weekly-report (pre-refactor) direkonstruksi:
  const m = new Map<string, { total: number; sum: number }>();
  for (const s of withSector) {
    const key = s.sector || "Lainnya";
    const e = m.get(key) ?? { total: 0, sum: 0 };
    e.total++;
    e.sum += s.changePercent;
    m.set(key, e);
  }
  const old = [...m.entries()].map(([sector, { total, sum }]) => ({ sector, avgChange: sum / total, count: total }));
  check("sectorAverages parity (order+values)", engineSectors, old);
  check("sectorAverages A", engineSectors.find((s) => s.sector === "A"), { sector: "A", avgChange: 5, count: 2 });
}

// 5) movers parity — sorted.slice(0,5) / slice(-5).reverse() lama (weekly)
{
  const sorted = [...withChange].sort((a, b) => b.changePercent - a.changePercent);
  const oldGainers = sorted.slice(0, 5);
  const oldLosers = sorted.slice(-5).reverse();
  const { gainers, losers } = marketEngine.movers(withChange, 5);
  check("movers gainers parity", gainers, oldGainers);
  check("movers losers parity", losers, oldLosers);
  // Kasus n*2 >= rows: jalur weekly lama gainers ∩ losers TIDAK kosong by-design.
  const small = withChange.slice(0, 3);
  const { gainers: g2, losers: l2 } = marketEngine.movers(small, 5);
  // input = slice baris ASLI {AALI 0%, BBCA +10%, BRIS -10%} — engine mengurutkan sendiri;
  // n=5 > 3 rows → gainers(desc)=semua, losers(asc)=kebalikannya, overlap by-design.
  check("movers overlap by-design (n*2>rows)", [g2.map((x) => x.ticker), l2.map((x) => x.ticker)],
    [["BBCA.JK", "AALI.JK", "BRIS.JK"], ["BRIS.JK", "AALI.JK", "BBCA.JK"]]);
}

// 6) movers excludeOverlap — jalur snapshot harian (gainerSet filter lama)
{
  const { gainers, losers } = marketEngine.movers(withChange, 2, { excludeOverlap: true });
  check("movers excludeOverlap gainers", gainers.map((g) => g.ticker), ["PTMR.JK", "BSWD.JK"]);
  check("movers excludeOverlap losers", losers.map((l) => l.ticker), ["ZERO.JK", "BRIS.JK"]);
}

// 7) meanChange parity — reduce/length lama (weekly marketAvgChange)
check(
  "meanChange parity",
  marketEngine.meanChange(withChange),
  withChange.reduce((acc, s) => acc + s.changePercent, 0) / withChange.length,
);
check("meanChange empty -> 0", marketEngine.meanChange([]), 0);

// ── Verifikasi doktrin SATU PINTU: tidak ada lagi rumus inline ──
import { readFileSync } from "node:fs";
const files = [
  "../../src/domains/stock/weekly-report.service.ts",
  "../../src/domains/stock/screener-analysis.service.ts",
];
// Baris = pelanggaran iff mengandung rumus persen DAN menyebut prev/close
// sebagai basis (pola lama "((close - prev) / prev) * 100"), TANPA lewat
// marketEngine. "* 100" lain di file-file ini bukan change% pasar
// (advPct ratio prose; jarak SMA20 filter pullback/radar).
let inlineViolations = 0;
const violations: string[] = [];
for (const f of files) {
  const text = readFileSync(new URL(f, import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const isPctFormula = /\*\s*100/.test(line);
    const usesPrevCloseBase = /prev/i.test(line);
    const viaEngine = /marketEngine/.test(line);
    if (isPctFormula && usesPrevCloseBase && !viaEngine) {
      inlineViolations++;
      violations.push(`${f}: ${line.trim()}`);
    }
  }
}
if (violations.length > 0) console.error(`DOCTRINE VIOLATION:\n${violations.join("\n")}`);
check("grep compute duplikat = 0 (doktrin)", inlineViolations, 0);

console.log(`\nmarket-snapshot-engine selftest: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
