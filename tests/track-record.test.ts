/**
 * AC2 (prd-2026-10-16-01): unit test window-return math dari fixture —
 * golden_cross @T -> close(T+5) vs close(T) == angka render.
 * Pragmatic node script (no jest infra): node --experimental-strip-types tests/track-record.test.ts
 * (fallback: npx tsx tests/track-record.test.ts)
 */
import { computeWindowStats, isDirectionWin, rankBestWindow, type SignalRow } from "../src/lib/track-record-math";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

// ── Fixture 1: PRD literal — golden_cross @2026-10-01, close T=1000, T+5=1030 → +3,00% ──
const fixture1: SignalRow[] = [
  { stockId: 1, date: "2026-10-01", signal: "golden_cross", close0: 1000, closeN: 1030 },
  { stockId: 2, date: "2026-10-01", signal: "golden_cross", close0: 2000, closeN: 1960 }, // -2%
  { stockId: 3, date: "2026-10-01", signal: "golden_cross", close0: 500, closeN: null }, // n/a — belum terukur
];
const stats1 = computeWindowStats(fixture1, 5, () => "all");
assert(stats1.length === 1, "satu grup agregat");
const s1 = stats1[0];
assert(s1.nSignals === 3, `nSignals=3 (semua sinyal dihitung), got ${s1.nSignals}`);
assert(s1.nResolved === 2, `nResolved=2, got ${s1.nResolved}`);
assert(s1.nUnresolved === 1, `nUnresolved=1 (n/a eksplisit, bukan dibuang), got ${s1.nUnresolved}`);
assert(s1.meanPct === 0.5, `mean=(3.00 + -2.00)/2=0.50%, got ${s1.meanPct}`);
assert(s1.medianPct === 0.5, `median=0.50%, got ${s1.medianPct}`);
assert(s1.winRatePct === 50, `akurasi arah golden: 1 naik dari 2 = 50%, got ${s1.winRatePct}`);

// ── Fixture 2: death_cross direction — turun = benar ──
const fixture2: SignalRow[] = [
  { stockId: 4, date: "2026-09-15", signal: "death_cross", close0: 1000, closeN: 950 },  // -5% benar arah
  { stockId: 5, date: "2026-09-15", signal: "death_cross", close0: 800, closeN: 816 },   // +2% salah arah
  { stockId: 6, date: "2026-09-15", signal: "death_cross", close0: 640, closeN: 600 },   // -6.25% benar
];
const s2 = computeWindowStats(fixture2, 20, () => "all")[0];
assert(s2.winRatePct === 66.67, `akurasi arah death: 2 turun dari 3 = 66.67%, got ${s2.winRatePct}`);
assert(s2.meanPct === -3.08, `mean=(-5 + 2 - 6.25)/3=-3.08%, got ${s2.meanPct}`);

// ── Fixture 3: window 20d vs 5d terpisah + grouping bulanan ──
const fixture3: SignalRow[] = [
  { stockId: 7, date: "2026-08-04", signal: "golden_cross", close0: 1000, closeN: 1100 },
  { stockId: 7, date: "2026-09-04", signal: "golden_cross", close0: 1000, closeN: 900 },
];
const byMonth = computeWindowStats(fixture3, 5, (d) => d.slice(0, 7));
assert(byMonth.length === 2, "2 bulan terpisah");
assert(byMonth[0].month === "2026-09", "urut bulan terbaru dulu");
assert(byMonth[0].meanPct === -10, `Sep mean=-10%, got ${byMonth[0].meanPct}`);
assert(byMonth[1].month === "2026-08" && byMonth[1].meanPct === 10, `Ags mean=+10%, got ${byMonth[1].meanPct}`);

// ── Fixture 4: semua unresolved → null metrics, tetap dirender n/a ──
const fixture4: SignalRow[] = [
  { stockId: 8, date: "2026-10-15", signal: "golden_cross", close0: 1000, closeN: null },
];
const s4 = computeWindowStats(fixture4, 5, () => "all")[0];
assert(s4.meanPct === null && s4.winRatePct === null, "window tanpa data → null (render 'n/a')");
assert(s4.nUnresolved === 1 && s4.nResolved === 0, "unresolved tetap terhitung");

// ── Fixture 5: superlatif HARUS dari ranking query ──
const ranked = [
  ...computeWindowStats(fixture1, 5, () => "all"),
  ...computeWindowStats(fixture2, 20, () => "all"),
  ...computeWindowStats(fixture3, 5, () => "all"),
];
assert(rankBestWindow(ranked, 2)?.winRatePct === 66.67, "rankBestWindow pilih akurasi tertinggi (66.67)");
assert(rankBestWindow(ranked, 100) === null, "minSample filter: tak ada yang lolos → null (tanpa klaim manual)");

// ── Fixture 6: isDirectionWin kontrak arah ──
assert(isDirectionWin("golden_cross", 0.5) && !isDirectionWin("golden_cross", -0.5), "golden: naik=benar");
assert(isDirectionWin("death_cross", -0.5) && !isDirectionWin("death_cross", 0.5), "death: turun=benar");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll track-record window math tests passed");
