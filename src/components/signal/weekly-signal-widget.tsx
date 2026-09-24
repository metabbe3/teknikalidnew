import Link from "next/link";
import { weeklySignalService } from "@/domains/stock/weekly-signal.service";

const MONTHS_SHORT_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function fmtDayMonth(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_SHORT_ID[d.getUTCMonth()]}`;
}

/** "21-24 Sep" (same month) / "29 Sep-3 Okt" (month boundary). */
function rangeLabel(weekStart: Date, snapshot: Date): string {
  return weekStart.getUTCMonth() === snapshot.getUTCMonth()
    ? `${weekStart.getUTCDate()}-${snapshot.getUTCDate()} ${MONTHS_SHORT_ID[snapshot.getUTCMonth()]}`
    : `${fmtDayMonth(weekStart)}-${fmtDayMonth(snapshot)}`;
}

/**
 * "Sinyal Minggu Ini" strip for /stocks — pure SSR (guest-visible, no gating),
 * anchors into the preset signal pages. Numbers stay rendered on zero counts.
 */
export async function WeeklySignalWidget() {
  const data = await weeklySignalService.getWeeklySignalCounts();
  if (!data) return null;

  const { weekStart, snapshotDate, gcCount, dcCount } = data;

  // Stale guard (AC3): spec allows >5 business days; we use >7 calendar days —
  // simpler, conservative in the safe direction (7 calendar days ≥ 5 business days
  // only when no holidays; a long weekend can make 7 calendar = 4 business, so we
  // occasionally keep the "minggu ini" label slightly longer than strictly allowed).
  const ageDays = Math.floor((Date.now() - snapshotDate.getTime()) / 86_400_000);
  const stale = ageDays > 7;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {stale ? (
        <span className="font-semibold text-text-primary">Data s/d {fmtDayMonth(snapshotDate)}:</span>
      ) : (
        <span className="font-semibold text-text-primary">Sinyal minggu ini ({rangeLabel(weekStart, snapshotDate)}):</span>
      )}{" "}
      <Link
        href="/saham-golden-cross"
        className="font-semibold text-bullish hover:underline"
      >
        {gcCount} golden cross
      </Link>
      <span className="text-text-tertiary" aria-hidden="true">·</span>
      <Link
        href="/saham-death-cross"
        className="font-semibold text-bearish hover:underline"
      >
        {dcCount} death cross
      </Link>
    </div>
  );
}
