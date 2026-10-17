import { formatPercent } from "@/lib/utils";
import type { WindowStat } from "@/lib/track-record-math";

export const SIGNAL_LABEL: Record<string, string> = {
  golden_cross: "Golden Cross",
  death_cross: "Death Cross",
};

const pctFmt = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (v: number | null) => (v === null ? "n/a" : formatPercent(v));
export const fmtRate = (v: number | null) => (v === null ? "n/a" : `${pctFmt.format(v)}%`);
const pctColor = (v: number | null) =>
  v === null ? "text-text-tertiary" : v < 0 ? "text-bearish" : "text-bullish";
const rateColor = (v: number | null) =>
  v === null ? "text-text-tertiary" : v >= 50 ? "text-bullish" : "text-bearish";

export const monthLabel = (ym: string) => {
  if (ym === "all") return "Agregat";
  return new Date(`${ym}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export function SummaryTable({ stats }: { stats: WindowStat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-semibold">Sinyal</th>
            <th className="py-2 pr-4 font-semibold">Window</th>
            <th className="py-2 pr-4 font-semibold">Jumlah sinyal</th>
            <th className="py-2 pr-4 font-semibold">Terukur</th>
            <th className="py-2 pr-4 font-semibold">Belum terukur (n/a)</th>
            <th className="py-2 pr-4 font-semibold">Rata-rata</th>
            <th className="py-2 pr-4 font-semibold">Median</th>
            <th className="py-2 pr-4 font-semibold">Akurasi arah</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={`${stat.signal}-${stat.windowDays}`} className="border-b hover:bg-muted/50">
              <td className="py-2 pr-4 font-medium">{SIGNAL_LABEL[stat.signal] ?? stat.signal}</td>
              <td className="py-2 pr-4">{stat.windowDays} hari bursa</td>
              <td className="py-2 pr-4 tabular-nums">{stat.nSignals}</td>
              <td className="py-2 pr-4 tabular-nums">{stat.nResolved}</td>
              <td className="py-2 pr-4 tabular-nums text-text-tertiary">{stat.nUnresolved}</td>
              <td className={`py-2 pr-4 tabular-nums ${pctColor(stat.meanPct)}`}>{fmtPct(stat.meanPct)}</td>
              <td className={`py-2 pr-4 tabular-nums ${pctColor(stat.medianPct)}`}>{fmtPct(stat.medianPct)}</td>
              <td className={`py-2 pr-4 tabular-nums font-semibold ${rateColor(stat.winRatePct)}`}>
                {fmtRate(stat.winRatePct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthlyTable({ stats5, stats20 }: { stats5: WindowStat[]; stats20: WindowStat[] }) {
  const rows = [...stats5, ...stats20].sort(
    (a, b) =>
      b.month.localeCompare(a.month) ||
      (a.signal === "golden_cross" ? -1 : 1) - (b.signal === "golden_cross" ? -1 : 1) ||
      a.windowDays - b.windowDays,
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-semibold">Bulan sinyal</th>
            <th className="py-2 pr-4 font-semibold">Sinyal</th>
            <th className="py-2 pr-4 font-semibold">Window</th>
            <th className="py-2 pr-4 font-semibold">Terukur</th>
            <th className="py-2 pr-4 font-semibold">Rata-rata</th>
            <th className="py-2 pr-4 font-semibold">Akurasi arah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.month}-${s.signal}-${s.windowDays}`} className="border-b hover:bg-muted/50">
              <td className="py-2 pr-4">{monthLabel(s.month)}</td>
              <td className="py-2 pr-4">{SIGNAL_LABEL[s.signal] ?? s.signal}</td>
              <td className="py-2 pr-4">{s.windowDays} hari bursa</td>
              <td className="py-2 pr-4 tabular-nums">
                {s.nResolved}
                {s.nUnresolved > 0 && <span className="text-text-tertiary"> (+{s.nUnresolved} n/a)</span>}
              </td>
              <td className={`py-2 pr-4 tabular-nums ${pctColor(s.meanPct)}`}>{fmtPct(s.meanPct)}</td>
              <td className={`py-2 pr-4 tabular-nums font-semibold ${rateColor(s.winRatePct)}`}>
                {fmtRate(s.winRatePct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
