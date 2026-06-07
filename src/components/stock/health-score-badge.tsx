"use client";

import { signalToHealthScore, healthScoreMeta } from "@/lib/utils";

interface HealthScoreBadgeProps {
  signalScore: number | null;
  size?: "sm" | "lg";
}

export function HealthScoreBadge({ signalScore, size = "sm" }: HealthScoreBadgeProps) {
  const score = signalToHealthScore(signalScore);
  if (score === null) return null;

  const meta = healthScoreMeta(score);

  if (size === "lg") {
    // Large version for detail page hero — compact horizontal gauge
    return (
      <div className="inline-flex flex-col w-[76px] shrink-0">
        {/* Score number */}
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-extrabold tabular-nums leading-none" style={{ color: meta.color }}>
            {score}
          </span>
          <span className="text-[9px] font-semibold text-gray-500">
            /100
          </span>
        </div>
        {/* Gauge bar */}
        <div className="mt-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${score}%`,
              backgroundColor: meta.color,
            }}
          />
        </div>
        {/* Label */}
        <span
          className="text-[9px] font-bold mt-1 leading-tight"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
    );
  }

  // Small version for stock cards — compact pill
  return (
    <span
      className="inline-flex items-center justify-center h-6 min-w-[32px] px-1.5 rounded-full text-xs font-bold tabular-nums"
      style={{ color: meta.color, backgroundColor: meta.bg }}
      title={`Health Score: ${score}/100 — ${meta.label}`}
    >
      {score}
    </span>
  );
}
