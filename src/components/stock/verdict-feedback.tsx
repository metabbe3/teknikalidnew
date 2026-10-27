"use client";

import { useState } from "react";

/**
 * VerdictFeedback — micro-feedback 👍/👎 pasif di kartu verdict halaman saham.
 * Owner 27 Okt: pengganti popup rating (yang annoying). Anonymous, 1 vote/hari/ticker.
 * Satu klik, langsung sumbat; UI minimal — jangan ganggu baca chart.
 */
export function VerdictFeedback({ ticker }: { ticker: string }) {
  const [voted, setVoted] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);

  const vote = async (isAccurate: boolean) => {
    if (busy || voted !== null) return;
    setBusy(true);
    try {
      await fetch(`/api/stocks/${ticker}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAccurate }),
      });
      setVoted(isAccurate);
    } catch {
      /* silent — feedback gagal jangan ganggu UX */
    } finally {
      setBusy(false);
    }
  };

  if (voted !== null) {
    return (
      <span className="text-[11px] text-text-tertiary" aria-live="polite">
        {voted ? "👍 Terima kasih" : "👎 Noted — kami perbaiki"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" aria-label="Apakah verdik ini membantu?">
      <span className="text-[11px] text-text-tertiary mr-0.5">Akurat?</span>
      <button
        type="button"
        onClick={() => vote(true)}
        disabled={busy}
        className="px-1.5 py-0.5 rounded text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
        aria-label="Verdik akurat"
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => vote(false)}
        disabled={busy}
        className="px-1.5 py-0.5 rounded text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
        aria-label="Verdik kurang tepat"
      >
        👎
      </button>
    </span>
  );
}
