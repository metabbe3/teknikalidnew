import { IndicatorTooltip } from "@/components/ui/indicator-tooltip";

interface BreakdownItem {
  name: string;
  sentiment: "positif" | "negatif" | "netral";
  weight: number;
}

const SENTIMENT: Record<string, { dot: string; label: string }> = {
  positif: { dot: "#059669", label: "Menguat" },
  netral: { dot: "#d97706", label: "Netral" },
  negatif: { dot: "#dc2626", label: "Melemah" },
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

/**
 * Rincian 9 indikator Skor Sinyal — native <details> (SSR, no JS, SEO-friendly).
 * Dipasang di hero Skor Sinyal supaya verdict + rincian satu rumah (owner 21 Okt);
 * menggantikan HealthScoreDetail card di rail yang redundan dgn hero + panel kiri.
 */
export function SignalBreakdownDetails({ breakdown }: { breakdown: BreakdownItem[] }) {
  if (!breakdown.length) return null;
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
    <details data-engagement="rincian_skor_buka" className="group mt-3 border-t border-border/60 pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary [&::-webkit-details-marker]:hidden">
        Rincian {breakdown.length} indikator
        <span className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <div className="mt-3 space-y-4">
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-tertiary">
              {GROUP_LABELS[group] ?? group}
            </p>
            <div className="space-y-1.5">
              {items.map((item) => {
                const sc = SENTIMENT[item.sentiment];
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sc.dot }} aria-hidden="true" />
                    <span className="flex w-[84px] shrink-0 items-center gap-1 text-xs font-medium text-text-secondary">
                      {item.name}
                      <IndicatorTooltip indicator={item.name} />
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-hover">
                      <div
                        className="h-full rounded-full opacity-60"
                        style={{ width: `${Math.min(100, item.weight * 100 * 5)}%`, backgroundColor: sc.dot }}
                      />
                    </div>
                    <span className="w-[52px] shrink-0 text-right text-[10px] font-semibold" style={{ color: sc.dot }}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
