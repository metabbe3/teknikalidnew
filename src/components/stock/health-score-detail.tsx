"use client";

import { signalToHealthScore, healthScoreMeta } from "@/lib/utils";
import { IndicatorTooltip } from "@/components/ui/indicator-tooltip";

interface BreakdownItem {
  name: string;
  sentiment: "positif" | "negatif" | "netral";
  weight: number;
}

interface HealthScoreDetailProps {
  signalScore: number | null;
  breakdown: BreakdownItem[];
}

const SENTIMENT_COLORS: Record<string, { dot: string; bar: string; label: string }> = {
  positif: { dot: "#059669", bar: "rgba(5,150,105,0.25)", label: "Bullish" },
  netral: { dot: "#d97706", bar: "rgba(217,119,6,0.20)", label: "Netral" },
  negatif: { dot: "#dc2626", bar: "rgba(220,38,38,0.20)", label: "Bearish" },
};

const GROUP_LABELS: Record<string, string> = {
  Trend: "Tren",
  Momentum: "Momentum",
  Volume: "Volume",
};

function getGroup(indicator: string): { group: string; order: number } {
  if (["SMA", "EMA", "Supertrend", "ADX"].includes(indicator)) return { group: "Trend", order: 0 };
  if (["RSI", "MACD", "Stochastic"].includes(indicator)) return { group: "Momentum", order: 1 };
  return { group: "Volume", order: 2 };
}

function ExplanationText({ score }: { score: number }) {
  if (score >= 80) return <p className="text-xs text-text-secondary leading-relaxed">Mayoritas indikator menunjukkan kondisi positif. Saham ini berada dalam tren naik yang sehat dengan momentum yang baik.</p>;
  if (score >= 60) return <p className="text-xs text-text-secondary leading-relaxed">Indikator teknikal cukup mendukung kenaikan, meskipun beberapa sinyal masih bercampur. Perhatikan area support terdekat.</p>;
  if (score >= 40) return <p className="text-xs text-text-secondary leading-relaxed">Sinyal teknikal masih berimbang antara bullish dan bearish. Disarankan menunggu konfirmasi arah yang lebih jelas sebelum mengambil posisi.</p>;
  if (score >= 20) return <p className="text-xs text-text-secondary leading-relaxed">Mayoritas indikator menunjukkan tekanan jual. Pertimbangkan untuk menunggu sinyal pembalikan atau memperhatikan level support kunci.</p>;
  return <p className="text-xs text-text-secondary leading-relaxed">Indikator teknikal menunjukkan kondisi lemah dengan tekanan jual yang dominan. Hati-hati terhadap risiko penurunan lebih lanjut.</p>;
}

export function HealthScoreDetail({ signalScore, breakdown }: HealthScoreDetailProps) {
  const score = signalToHealthScore(signalScore);
  if (score === null) return null;

  const meta = healthScoreMeta(score);

  // Group breakdown items
  const grouped: { group: string; order: number; items: BreakdownItem[] }[] = [];
  for (const item of breakdown) {
    const { group, order } = getGroup(item.name);
    let existing = grouped.find((g) => g.group === group);
    if (!existing) {
      existing = { group, order, items: [] };
      grouped.push(existing);
    }
    existing.items.push(item);
  }
  grouped.sort((a, b) => a.order - b.order);

  return (
    <div className="bg-bg-card depth-shadow rounded-xl border border-border p-5" style={{ borderTop: `3px solid ${meta.color}` }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          Health Score
          <IndicatorTooltip indicator="Health Score" />
        </h3>
      </div>

      {/* Score row: big number + label pill */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: meta.color }}>
            {score}
          </span>
          <span className="text-xs font-semibold text-text-tertiary">/100</span>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>
      </div>

      {/* Full-width gauge bar */}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: meta.color,
          }}
        />
      </div>

      {/* Explanation */}
      <ExplanationText score={score} />

      {/* Breakdown bars */}
      {grouped.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                {GROUP_LABELS[group] ?? group}
              </p>
              <div className="space-y-2">
                {items.map((item) => {
                  const sc = SENTIMENT_COLORS[item.sentiment];
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: sc.dot }}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-text-secondary w-[84px] shrink-0 font-medium flex items-center gap-1">
                        {item.name}
                        <IndicatorTooltip indicator={item.name} />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.weight * 100 * 5}%`,
                            backgroundColor: sc.dot,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-semibold w-[52px] text-right shrink-0"
                        style={{ color: sc.dot }}
                      >
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
