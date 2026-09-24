import { stockRepository } from "./stock.repository";
import { toMonday } from "./weekly-report.service";

/**
 * Weekly SMA-cross signal counts for the "Sinyal Minggu Ini" widget on /stocks.
 * Read-only aggregates over StockIndicator (interval '1d'):
 * snapshot = MAX(smaCrossDate), week = ISO Monday of the snapshot, counts are
 * DISTINCT stocks whose smaCrossSignal fired at/after weekStart.
 */
export interface WeeklySignalCounts {
  snapshotDate: Date;
  weekStart: Date;
  gcCount: number;
  dcCount: number;
}

export const weeklySignalService = {
  async getWeeklySignalCounts(): Promise<WeeklySignalCounts | null> {
    const latest = await stockRepository.getLatestSmaCrossDate();
    if (!latest?.smaCrossDate) return null;

    const weekStart = toMonday(latest.smaCrossDate);
    const [gc, dc] = await Promise.all([
      stockRepository.findStockIdsWithCrossSignal("golden_cross", weekStart),
      stockRepository.findStockIdsWithCrossSignal("death_cross", weekStart),
    ]);

    return {
      snapshotDate: latest.smaCrossDate,
      weekStart,
      gcCount: gc.length,
      dcCount: dc.length,
    };
  },
};
