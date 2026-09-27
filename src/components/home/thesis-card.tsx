"use client";

import Link from "next/link";
import { useTheses, type ThesisBreach } from "@/hooks/use-thesis";
import { stripJk, formatRp } from "@/lib/utils";

const BREACH_LABEL: Record<NonNullable<ThesisBreach>, { text: string; cls: string }> = {
  target_hit: { text: "Target tercapai", cls: "text-bullish bg-bullish/10" },
  stop_hit: { text: "Stop tersentuh", cls: "text-bearish bg-bearish/10" },
  verdict_flipped: { text: "Sinyal berbalik", cls: "text-amber-600 bg-amber-500/10" },
};

const BIAS_LABEL: Record<string, string> = { BULLISH: "Bullish", BEARISH: "Bearish", NEUTRAL: "Netral" };

export function ThesisCard() {
  const { data, isLoading } = useTheses();

  if (isLoading) {
    return <div className="bg-bg-card border border-border rounded-xl h-[80px] animate-pulse" />;
  }
  if (!data || data.length === 0) return null;

  // surface breached theses first — those are the "your past self is being tested" pulls
  const sorted = [...data].sort((a, b) => {
    if (!!a.breach !== !!b.breach) return a.breach ? -1 : 1;
    return 0;
  });

  return (
    <section className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-text-primary">Tesis Anda</h2>
        <span className="text-[11px] text-text-tertiary">{data.length} tesis aktif</span>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((t) => {
          const breach = t.breach ? BREACH_LABEL[t.breach] : null;
          return (
            <Link
              key={t.id}
              href={`/stocks/${t.ticker}`}
              className="flex items-center justify-between gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-accent/5 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-text-primary">{stripJk(t.ticker)}</span>
                  <span className="text-[11px] text-text-tertiary">{BIAS_LABEL[t.bias]}</span>
                  {breach && (
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${breach.cls}`}>
                      {breach.text}
                    </span>
                  )}
                </div>
                {t.rationale && (
                  <p className="text-xs text-text-tertiary truncate mt-0.5">{t.rationale}</p>
                )}
              </div>
              {t.close !== null && (
                <span className="font-mono text-xs text-text-secondary tabular-nums shrink-0">
                  {formatRp(t.close)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
