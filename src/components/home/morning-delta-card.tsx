"use client";

import Link from "next/link";
import { useMorningDelta } from "@/hooks/use-morning-delta";
import { stripJk, formatPercent } from "@/lib/utils";
import type { DeltaBullet } from "@/domains/stock/morning-delta.service";

const TONE_TEXT: Record<DeltaBullet["tone"], string> = {
  bullish: "text-bullish",
  bearish: "text-bearish",
  neutral: "text-text-tertiary",
};

function Bullet({ b }: { b: DeltaBullet }) {
  return (
    <Link
      href={`/stocks/${b.ticker}`}
      className="flex items-center justify-between gap-3 py-2.5 group hover:bg-accent/5 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-text-primary">
            {stripJk(b.ticker)}
          </span>
          <span className={`text-sm font-medium ${TONE_TEXT[b.tone]}`}>
            {b.text}
          </span>
        </div>
        <p className="text-xs text-text-tertiary truncate">
          {b.detail ? `${b.detail} · ` : ""}
          {b.name}
        </p>
      </div>
      {b.changePercent !== null && b.kind !== "gap" && Math.abs(b.changePercent) > 0.01 && (
        <span
          className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${TONE_TEXT[b.tone]}`}
        >
          {formatPercent(b.changePercent)}
        </span>
      )}
    </Link>
  );
}

export function MorningDeltaCard() {
  const { data, isLoading } = useMorningDelta();

  if (isLoading) {
    return (
      <div className="bg-bg-card border border-border rounded-xl h-[120px] animate-pulse" />
    );
  }

  if (!data || data.bullets.length === 0) return null;

  return (
    <section className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-text-primary">Sejak kemarin</h2>
        <span className="text-[11px] text-text-tertiary">
          {data.trackedCount} saham dipantau
        </span>
      </div>
      <div className="divide-y divide-border">
        {data.bullets.map((b) => (
          <Bullet key={b.ticker} b={b} />
        ))}
      </div>
    </section>
  );
}
