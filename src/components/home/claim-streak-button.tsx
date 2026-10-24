import { Flame, BadgeCheck } from "lucide-react";
import { ReputationBadge } from "@/components/community/reputation-badge";

/**
 * Point & Badge v1 (PRD prd-2026-10-24-01) — display-only card.
 * Daily +5 is awarded automatically server-side during home SSR
 * (reputationService.maybeAwardDaily in WelcomeLoopSection) — no claim
 * button, no POST. Streak/points render fresh from the post-award read.
 */
export function ClaimStreakButton({
  initialStreak,
  reputation = 0,
}: {
  initialStreak: number;
  claimedToday?: boolean; // kept for call-site compat; auto-award makes it redundant
  reputation?: number;
}) {
  const firstToday = initialStreak <= 1;
  return (
    <section aria-label="Poin harian" className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-primary">
          {firstToday ? "Kunjungan pertama hari ini" : `Streak ${initialStreak} hari`}
        </h3>
      </div>
      <p className="text-xs text-text-secondary mb-3 flex items-center gap-1.5">
        <BadgeCheck className="h-3.5 w-3.5 text-bullish" aria-hidden="true" />
        +5 poin otomatis tersimpan hari ini
      </p>
      <div className="flex items-center gap-2">
        <ReputationBadge reputation={reputation} forceShow />
        <span className="text-xs text-text-secondary font-mono tabular-nums">{reputation} poin</span>
      </div>
    </section>
  );
}
