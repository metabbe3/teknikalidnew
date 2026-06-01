"use client";

import { BADGE_TIERS, getBadge } from "@/domains/reputation/badge";

const COLOR_STYLES: Record<string, { bg: string; dot: string }> = {
  amber: { bg: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  purple: { bg: "bg-purple-50 text-purple-700 border border-purple-200", dot: "bg-purple-500" },
  gold: { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", dot: "bg-yellow-500" },
  teal: { bg: "bg-teal-50 text-teal-700 border border-teal-200", dot: "bg-teal-500" },
  blue: { bg: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  indigo: { bg: "bg-indigo-50 text-indigo-700 border border-indigo-200", dot: "bg-indigo-500" },
  cyan: { bg: "bg-cyan-50 text-cyan-700 border border-cyan-200", dot: "bg-cyan-500" },
  slate: { bg: "bg-slate-50 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
};

const SHORT_NAMES: Record<string, string> = {
  "Master Trader": "Master",
  "Senior Analyst": "Senior",
  "Trader Aktif": "Aktif",
};

export function ReputationBadge({
  reputation,
  customTitle,
}: {
  reputation: number;
  customTitle?: string | null;
}) {
  if (customTitle) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200"
        title={customTitle}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {customTitle}
      </span>
    );
  }

  if (reputation < BADGE_TIERS[BADGE_TIERS.length - 1].min) return null;

  const { level, color } = getBadge(reputation);
  const styles = COLOR_STYLES[color];
  const display = SHORT_NAMES[level] || level;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles.bg}`}
      title={level}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      {display}
    </span>
  );
}
