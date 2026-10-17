/**
 * Track-record math — pure, tanpa DB (unit-testable).
 * Semua angka superlatif HARUS lahir dari komputasi rows — tidak ada klaim narasi manual.
 */

export type SignalKind = "golden_cross" | "death_cross";

export interface SignalRow {
  stockId: number;
  date: string; // YYYY-MM-DD (hari event sinyal)
  signal: SignalKind;
  close0: number | null; // close hari-T (harga saat sinyal)
  closeN: number | null; // close T+N baris bursa (null = belum terukur)
}

export interface WindowStat {
  signal: SignalKind;
  windowDays: 5 | 20;
  month: string; // YYYY-MM (atau "all" utk agregat)
  nSignals: number;
  nResolved: number;
  nUnresolved: number;
  meanPct: number | null;
  medianPct: number | null;
  /** % sinyal yang arahnya benar: golden_cross benar jika naik, death_cross benar jika turun. */
  winRatePct: number | null;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Sinyal benar arah: bullish signal → return positif; bearish signal → return negatif. */
export function isDirectionWin(signal: SignalKind, pct: number): boolean {
  return signal === "golden_cross" ? pct > 0 : pct < 0;
}

const SIGNAL_ORDER: Record<SignalKind, number> = { golden_cross: 0, death_cross: 1 };

/**
 * Kelompokkan per (signal, month via getMonth). Resolved = close0 & closeN ada, close0 > 0.
 * Unresolved DIHITUNG di nUnresolved dan DIELUARKAN dari mean/median/winrate —
 * jujur di permukaan ("n/a"), tidak dibuang diam-diam. Bulatkan 2 desimal.
 */
export function computeWindowStats(
  rows: SignalRow[],
  windowDays: 5 | 20,
  getMonth: (date: string) => string,
): WindowStat[] {
  const groups = new Map<
    string,
    { signal: SignalKind; month: string; nSignals: number; nResolved: number; nUnresolved: number; pcts: number[] }
  >();

  for (const row of rows) {
    const month = getMonth(row.date);
    const key = `${row.signal}|${month}`;
    let g = groups.get(key);
    if (!g) {
      g = { signal: row.signal, month, nSignals: 0, nResolved: 0, nUnresolved: 0, pcts: [] };
      groups.set(key, g);
    }
    g.nSignals++;
    if (row.close0 !== null && row.closeN !== null && row.close0 > 0) {
      g.nResolved++;
      g.pcts.push(((row.closeN - row.close0) / row.close0) * 100);
    } else {
      g.nUnresolved++;
    }
  }

  const stats: WindowStat[] = [];
  for (const g of groups.values()) {
    const n = g.pcts.length;
    stats.push({
      signal: g.signal,
      windowDays,
      month: g.month,
      nSignals: g.nSignals,
      nResolved: g.nResolved,
      nUnresolved: g.nUnresolved,
      meanPct: n > 0 ? round2(g.pcts.reduce((a, b) => a + b, 0) / n) : null,
      medianPct: n > 0 ? round2(median(g.pcts)) : null,
      winRatePct: n > 0 ? round2((g.pcts.filter((p) => isDirectionWin(g.signal, p)).length / n) * 100) : null,
    });
  }

  return stats.sort(
    (a, b) =>
      b.month.localeCompare(a.month) || SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal] || a.windowDays - b.windowDays,
  );
}

/**
 * Superlatif WAJIB dari ranking (qa-30-01): window terbaik = stat terukur dengan
 * nResolved >= minSample, diurut akurasi arah lalu rata-rata. null jika tak ada yang lolos sample.
 */
export function rankBestWindow(stats: WindowStat[], minSample = 20): WindowStat | null {
  const eligible = stats.filter((s) => s.nResolved >= minSample && s.winRatePct !== null);
  if (eligible.length === 0) return null;
  return eligible.sort((a, b) => (b.winRatePct! - a.winRatePct!) || (b.meanPct! - a.meanPct!))[0];
}
