import { stockRepository } from "./stock.repository";

/**
 * Weekly market report (/laporan-pasar) — original-data SEO surface.
 * Everything is computed deterministically from our own StockPrice/StockIndicator
 * history (no AI): breadth, sectors, movers, SMA crosses, oversold trend.
 * Prose follows the verdict-prose.ts pattern: pure functions → Indonesian text.
 */

export interface WeeklyChangeRow {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  changePercent: number;
}

export interface WeeklySectorRow {
  sector: string;
  avgChange: number;
  count: number;
}

export interface WeeklyCrossRow {
  ticker: string;
  name: string;
}

export interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date; // exclusive
  label: string; // "7–11 September 2026"
  ihsg: { weekClose: number | null; prevClose: number | null; changePercent: number | null };
  breadth: { advancers: number; decliners: number; unchanged: number; total: number };
  /** Mean weekly change of all active stocks — IHSG fallback (^JKSE history is
   *  too shallow: 1 row) and a honest "market average" stat in its own right. */
  marketAvgChange: number;
  sectors: WeeklySectorRow[];
  topGainers: WeeklyChangeRow[];
  topLosers: WeeklyChangeRow[];
  goldenCrosses: WeeklyCrossRow[];
  deathCrosses: WeeklyCrossRow[];
  oversold: { start: number; end: number };
  prose: { intro: string; sectors: string; signals: string };
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Normalize any date to its ISO week Monday (UTC, matching @db.Date storage). */
export function toMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(mon.getUTCDate() + diff);
  mon.setUTCHours(0, 0, 0, 0);
  return mon;
}

function fmtDay(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function weekLabel(weekStart: Date, weekEnd: Date): string {
  const lastDay = new Date(weekEnd);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const sameMonth = weekStart.getUTCMonth() === lastDay.getUTCMonth();
  const sameYear = weekStart.getUTCFullYear() === lastDay.getUTCFullYear();
  const startStr = sameMonth
    ? `${weekStart.getUTCDate()}`
    : `${weekStart.getUTCDate()} ${MONTHS_ID[weekStart.getUTCMonth()]}${sameYear ? "" : ` ${weekStart.getUTCFullYear()}`}`;
  return `${startStr}–${fmtDay(lastDay)}`;
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function breadthCharacter(b: { advancers: number; decliners: number; unchanged: number }): string {
  const { advancers, decliners } = b;
  const total = advancers + decliners || 1;
  const advPct = (advancers / total) * 100;
  if (advPct >= 65) return "dominan naik (market breadth bullish)";
  if (advPct >= 55) return "cenderung naik";
  if (advPct >= 45) return "berimbang antara naik dan turun";
  if (advPct >= 35) return "cenderung turun";
  return "dominan turun (tekanan jual meluas)";
}

export const weeklyReportService = {
  /** Mondays of the last n weeks that have price data (most recent first).
   * Anchored on the latest DATA date — the in-progress week (e.g. a Monday with
   * no trading yet) would render an empty report as "TERBARU". */
  async getRecentWeeks(n: number): Promise<Date[]> {
    let anchor = new Date();
    anchor.setUTCDate(anchor.getUTCDate() - 7); // pure-date fallback: previous week
    try {
      const latest = await stockRepository.getLatestIndicatorDate("EQUITY");
      if (latest?.date) anchor = latest.date;
    } catch {
      // Build-stage prerender has no DB — pure-date fallback is fine (hourly revalidate refreshes).
    }
    const mon = toMonday(anchor);
    const weeks: Date[] = [];
    for (let i = 0; i < n; i++) {
      const w = new Date(mon);
      w.setUTCDate(w.getUTCDate() - i * 7);
      weeks.push(w);
    }
    return weeks;
  },

  async getWeeklyReport(rawWeekStart: Date): Promise<WeeklyReport | null> {
    const weekStart = toMonday(rawWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    if (weekStart.getTime() > Date.now()) return null; // future week

    const [changesRaw, idxRows, snapshots] = await Promise.all([
      stockRepository.findWeeklyWindowChanges(weekStart, weekEnd),
      stockRepository.findWeeklyIndexClose(weekStart, weekEnd),
      stockRepository.findWeeklyIndicatorSnapshots(weekStart, weekEnd),
    ]);

    const idx = idxRows[0];

    const withChange: WeeklyChangeRow[] = changesRaw
      .filter((r) => r.prev_close !== null && Number(r.prev_close) > 0)
      .map((r) => ({
        ticker: r.ticker,
        name: r.name,
        sector: r.sector,
        close: Number(r.week_close),
        changePercent: ((Number(r.week_close) - Number(r.prev_close)) / Number(r.prev_close)) * 100,
      }));

    const advancers = withChange.filter((s) => s.changePercent > 0).length;
    const decliners = withChange.filter((s) => s.changePercent < 0).length;
    const unchanged = withChange.filter((s) => s.changePercent === 0).length;

    const sectorMap = new Map<string, { total: number; sum: number }>();
    for (const s of withChange) {
      const key = s.sector || "Lainnya";
      const e = sectorMap.get(key) ?? { total: 0, sum: 0 };
      e.total++;
      e.sum += s.changePercent;
      sectorMap.set(key, e);
    }
    const sectors: WeeklySectorRow[] = [...sectorMap.entries()]
      .map(([sector, { total, sum }]) => ({ sector, avgChange: sum / total, count: total }))
      .sort((a, b) => b.avgChange - a.avgChange);

    const sorted = [...withChange].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.slice(-5).reverse();

    const goldenCrosses: WeeklyCrossRow[] = [];
    const deathCrosses: WeeklyCrossRow[] = [];
    let oversoldStart = 0;
    let oversoldEnd = 0;
    for (const s of snapshots) {
      // SQL filters NULL sma pairs; these guards satisfy TS without changing logic.
      if (s.prev_sma50 !== null && s.prev_sma200 !== null && s.sma50 !== null && s.sma200 !== null) {
        const crossedUp = s.prev_sma50 <= s.prev_sma200 && s.sma50 > s.sma200;
        const crossedDown = s.prev_sma50 >= s.prev_sma200 && s.sma50 < s.sma200;
        if (crossedUp) goldenCrosses.push({ ticker: s.ticker, name: s.name });
        if (crossedDown) deathCrosses.push({ ticker: s.ticker, name: s.name });
      }
      if (s.prev_rsi14 !== null && s.prev_rsi14 < 30) oversoldStart++;
      if (s.rsi14 !== null && s.rsi14 < 30) oversoldEnd++;
    }

    const ihsgChange =
      idx?.close_in_week !== null && idx?.close_prev !== null && Number(idx.close_prev) > 0 && idx.close_in_week !== null
        ? ((Number(idx.close_in_week) - Number(idx.close_prev)) / Number(idx.close_prev)) * 100
        : null;

    const breadth = { advancers, decliners, unchanged, total: withChange.length };
    const bc = breadthCharacter(breadth);

    const marketAvgChange =
      withChange.length > 0 ? withChange.reduce((acc, s) => acc + s.changePercent, 0) / withChange.length : 0;

    const ihsgStr =
      ihsgChange === null
        ? `rata-rata saham bergerak ${pct(marketAvgChange)} (data IHSG historis belum tersedia)`
        : `IHSG bergerak ${pct(ihsgChange)} menjadi ${(Number(idx.close_in_week)).toLocaleString("id-ID", { minimumFractionDigits: 2 })}`;

    const intro =
      `Minggu ${weekLabel(weekStart, weekEnd)}: ${ihsgStr}. ` +
      `Dari ${breadth.total} saham aktif, ${advancers} naik, ${decliners} turun, dan ${unchanged} stagnan — pasar ${bc}.`;

    const topSector = sectors[0];
    const bottomSector = sectors[sectors.length - 1];
    const sectorsStr =
      sectors.length === 0
        ? "Data sektor tidak tersedia untuk minggu ini."
        : `Sektor terkuat: ${topSector.sector} (${pct(topSector.avgChange)}, ${topSector.count} saham)` +
          (sectors.length > 1
            ? `; terlemah: ${bottomSector.sector} (${pct(bottomSector.avgChange)}).`
            : ".");

    const signalsParts: string[] = [];
    if (goldenCrosses.length > 0)
      signalsParts.push(
        `${goldenCrosses.length} saham membentuk golden cross (SMA50 menembus ke atas SMA200)` +
          (goldenCrosses.length <= 5
            ? `: ${goldenCrosses.map((g) => g.ticker.replace(".JK", "")).join(", ")}`
            : ""),
      );
    if (deathCrosses.length > 0)
      signalsParts.push(
        `${deathCrosses.length} saham membentuk death cross (SMA50 terpotong ke bawah SMA200)` +
          (deathCrosses.length <= 5
            ? `: ${deathCrosses.map((g) => g.ticker.replace(".JK", "")).join(", ")}`
            : ""),
      );
    const oversoldTrend =
      oversoldEnd > oversoldStart
        ? `Saham oversold (RSI < 30) naik dari ${oversoldStart} menjadi ${oversoldEnd} — tekanan jual masih meluas.`
        : oversoldEnd < oversoldStart
          ? `Saham oversold (RSI < 30) turun dari ${oversoldStart} menjadi ${oversoldEnd} — mulai ada pemulihan.`
          : `Saham oversold (RSI < 30) stabil di ${oversoldEnd}.`;
    signalsParts.push(oversoldTrend);

    return {
      weekStart,
      weekEnd,
      label: weekLabel(weekStart, weekEnd),
      ihsg: {
        weekClose: idx?.close_in_week !== null && idx?.close_in_week !== undefined ? Number(idx.close_in_week) : null,
        prevClose: idx?.close_prev !== null && idx?.close_prev !== undefined ? Number(idx.close_prev) : null,
        changePercent: ihsgChange,
      },
      breadth,
      marketAvgChange,
      sectors,
      topGainers,
      topLosers,
      goldenCrosses: goldenCrosses.slice(0, 10),
      deathCrosses: deathCrosses.slice(0, 10),
      oversold: { start: oversoldStart, end: oversoldEnd },
      prose: { intro, sectors: sectorsStr, signals: signalsParts.join(". ") + "." },
    };
  },
};
