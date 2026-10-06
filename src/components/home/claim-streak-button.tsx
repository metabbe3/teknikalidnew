"use client";

import { useState } from "react";
import { Flame, Gift } from "lucide-react";
import { useClaimDailyReward } from "@/hooks/use-dashboard-summary";

/**
 * First-Session Welcome Loop — daily streak claim (PRD idea-2026-10-02-2 AC2).
 * Pure surface over the existing claim endpoint: POST /api/reputation →
 * reputation.service.claimDailyReward (no-double-claim guard already server-side).
 */
export function ClaimStreakButton({
  initialStreak,
  claimedToday = false,
}: {
  initialStreak: number;
  claimedToday?: boolean;
}) {
  const claim = useClaimDailyReward();
  const [streak, setStreak] = useState(initialStreak);
  const [doneToday, setDoneToday] = useState(claimedToday);

  // Nudge only users who never started a streak AND haven't claimed today —
  // a visible button that always errors on click is worse than no button (trust).
  const canClaim = streak === 0 && !doneToday;

  if (!canClaim) return null;

  return (
    <section aria-label="Klaim harian" className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-primary">Bangun streak belajar</h3>
      </div>
      <p className="text-xs text-text-secondary mb-4">
        Klaim harian menjaga momentum — streak panjang membuka lencana reputasi.
      </p>
      <button
        type="button"
        onClick={() =>
          claim.mutate(undefined, {
            onSuccess: (data: { streak?: number }) => {
              if (typeof data.streak === "number") setStreak(data.streak);
              setDoneToday(true);
            },
          })
        }
        disabled={claim.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all press-scale disabled:opacity-50"
      >
        <Gift className="h-4 w-4" aria-hidden="true" />
        {claim.isPending ? "Mengklaim…" : "Claim harian"}
      </button>
      {claim.isError ? (
        <p className="mt-2 text-xs text-bearish" role="alert">
          {claim.isError && claim.error instanceof Error
            ? claim.error.message
            : "Gagal klaim — coba lagi nanti."}
        </p>
      ) : null}
    </section>
  );
}
