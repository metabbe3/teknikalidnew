interface HypeWarningBadgeProps {
  show: boolean;
  socialScore?: number;
  postCount?: number;
  volumeRatio?: number;
  changePercent?: number | null;
  rsi14?: number | null;
}

export function HypeWarningBadge({ show, socialScore, postCount, volumeRatio, changePercent, rsi14 }: HypeWarningBadgeProps) {
  if (!show) return null;

  let detail: string;
  if (socialScore !== undefined && socialScore >= 10) {
    detail = `${postCount ?? 0} post 7 hari terakhir, RSI ${rsi14?.toFixed(0) ?? "?"}. Hati-hati FOMO.`;
  } else if (volumeRatio !== undefined && volumeRatio >= 2) {
    detail = `Volume ${volumeRatio.toFixed(1)}x rata-rata${changePercent != null ? `, naik ${(changePercent * 100).toFixed(1)}%` : ""}. Hati-hati FOMO.`;
  } else {
    detail = "Indikator menunjukkan aktivitas tidak wajar. Hati-hati FOMO.";
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 inline-flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        Hype Alert
      </span>
      <span className="text-xs text-amber-700">{detail}</span>
    </div>
  );
}
