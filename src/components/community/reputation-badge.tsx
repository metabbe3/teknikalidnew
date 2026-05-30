"use client";

import { BADGE_TIERS, getBadge } from "@/domains/reputation/badge";

const COLOR_STYLES: Record<string, { bg: string; dot: string }> = {
  gold: { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", dot: "bg-yellow-500" },
  teal: { bg: "bg-teal-50 text-teal-700 border border-teal-200", dot: "bg-teal-500" },
  blue: { bg: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
};

export function ReputationBadge({ reputation }: { reputation: number }) {
  if (reputation < BADGE_TIERS[BADGE_TIERS.length - 1].min) return null;

  const { level, color } = getBadge(reputation);
  const styles = COLOR_STYLES[color];

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles.bg}`}
      title={level}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      {level === "Senior Analyst" ? "Senior" : level}
    </span>
  );
}
