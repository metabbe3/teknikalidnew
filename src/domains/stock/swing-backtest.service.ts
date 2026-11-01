/**
 * swing-backtest.service.ts — PURE backtest engine untuk Swing Trader Pack.
 *
 * Single source of truth untuk matematika forward return dan akurasi sinyal swing.
 * PURE: tanpa DB call, tanpa side effect, inject rows EOD {date, close, signalScore}.
 *
 * Metodologi:
 *  - Ambang P95 historis (signalScore >= 0.34) dan pembanding (signalScore >= 0.20)
 *  - Forward return horizon 20 hari bursa: (close[T+20] - close[T]) / close[T]
 *  - NULL-SAFE: baris <21 dari T (kurang dari horizon 20 hari) di-skip (tidak dihitung 0)
 *  - Guard data valid: close > 0 dan fwdClose > 0
 */

export interface SwingRow {
  date: string | Date;
  close: number;
  signalScore: number | null;
  signalLabel?: string | null;
  ticker?: string;
  stockId?: number;
}

export interface SwingLabelStats {
  signals: number;
  winRate: number;
  avgReturn: number;
  medianReturn: number;
}

export interface SwingStats {
  threshold: number;
  signals: number;
  avgReturn: number;
  medianReturn: number;
  winRate: number;
  avgHoldDays: number;
  perLabelBreakdown: Record<string, SwingLabelStats>;
}

export interface SwingBacktestOptions {
  threshold?: number;
  horizon?: number;
}

function computeMedian(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Menghitung statistik performa swing backtest secara deterministik.
 * Mendukung deret tunggal per emiten maupun kumpulan emiten (dikelompokkan via ticker / stockId).
 */
export function computeSwingStats(
  rows: SwingRow[],
  thresholdOrOptions: number | SwingBacktestOptions = 0.34
): SwingStats {
  const options: SwingBacktestOptions =
    typeof thresholdOrOptions === "number"
      ? { threshold: thresholdOrOptions }
      : thresholdOrOptions;

  const threshold = options.threshold ?? 0.34;
  const horizon = options.horizon ?? 20;

  if (!rows || rows.length === 0) {
    return {
      threshold,
      signals: 0,
      avgReturn: 0,
      medianReturn: 0,
      winRate: 0,
      avgHoldDays: 0,
      perLabelBreakdown: {},
    };
  }

  // 1. Kelompokkan per emiten
  const byStock = new Map<string, SwingRow[]>();
  for (const r of rows) {
    const key = r.ticker ?? (r.stockId !== undefined ? String(r.stockId) : "__single__");
    let list = byStock.get(key);
    if (!list) {
      list = [];
      byStock.set(key, list);
    }
    list.push(r);
  }

  const allReturns: number[] = [];
  const labelReturns = new Map<string, number[]>();

  // 2. Evaluasi deret tiap emiten
  for (const [, series] of byStock) {
    // Urutkan kronologis ascending (tanggal terlama ke terbaru)
    const sorted = [...series].sort((a, b) => {
      const ta = typeof a.date === "string" ? new Date(a.date).getTime() : a.date.getTime();
      const tb = typeof b.date === "string" ? new Date(b.date).getTime() : b.date.getTime();
      return ta - tb;
    });

    const len = sorted.length;
    for (let i = 0; i < len; i++) {
      const cur = sorted[i];

      // Filter sinyal berdasarkan threshold
      if (cur.signalScore === null || cur.signalScore === undefined || cur.signalScore < threshold) {
        continue;
      }

      // NULL-SAFE: data <21 baris setelah T (butuh index T + horizon)
      // Jika index i + horizon di luar jangkauan deret, sinyal dilewati (jangan hitung 0)
      if (i + horizon >= len) {
        continue;
      }

      const fwd = sorted[i + horizon];

      // Guard data harga valid
      if (
        typeof cur.close !== "number" ||
        cur.close <= 0 ||
        typeof fwd.close !== "number" ||
        fwd.close <= 0 ||
        !Number.isFinite(cur.close) ||
        !Number.isFinite(fwd.close)
      ) {
        continue;
      }

      const fwdReturn = (fwd.close - cur.close) / cur.close;
      allReturns.push(fwdReturn);

      const label = cur.signalLabel || "Lainnya";
      let list = labelReturns.get(label);
      if (!list) {
        list = [];
        labelReturns.set(label, list);
      }
      list.push(fwdReturn);
    }
  }

  const signals = allReturns.length;
  if (signals === 0) {
    return {
      threshold,
      signals: 0,
      avgReturn: 0,
      medianReturn: 0,
      winRate: 0,
      avgHoldDays: 0,
      perLabelBreakdown: {},
    };
  }

  const wins = allReturns.filter((r) => r > 0).length;
  const winRate = wins / signals;
  const avgReturn = allReturns.reduce((sum, r) => sum + r, 0) / signals;
  const medianReturn = computeMedian(allReturns);

  const perLabelBreakdown: Record<string, SwingLabelStats> = {};
  for (const [label, rets] of labelReturns.entries()) {
    const n = rets.length;
    const w = rets.filter((r) => r > 0).length;
    perLabelBreakdown[label] = {
      signals: n,
      winRate: n > 0 ? w / n : 0,
      avgReturn: n > 0 ? rets.reduce((s, r) => s + r, 0) / n : 0,
      medianReturn: computeMedian(rets),
    };
  }

  return {
    threshold,
    signals,
    avgReturn,
    medianReturn,
    winRate,
    avgHoldDays: horizon,
    perLabelBreakdown,
  };
}
