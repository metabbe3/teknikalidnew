"use client";

import type { CompareStock } from "@/hooks/use-compare-data";
import type { TradingPlan } from "@/lib/trading-plan";
import { formatRp, stripJk } from "@/lib/utils";

interface Props {
  stocks: CompareStock[];
}

const strategyLabels: Record<string, string> = {
  MARKET_ENTRY: "Market Entry",
  BUY_ON_WEAKNESS: "Antri Beli (BOW)",
  WAIT_AND_SEE: "Wait & See",
};

const strategyStyles: Record<string, string> = {
  MARKET_ENTRY: "bg-bullish-bg text-bullish",
  BUY_ON_WEAKNESS: "bg-amber-100 text-amber-800",
  WAIT_AND_SEE: "bg-bearish-bg text-bearish",
};

const confidenceStyles: Record<string, string> = {
  high: "bg-bullish-bg text-bullish",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-bg-hover text-text-tertiary",
};

const confidenceLabels: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

function PlanCard({ plan, ticker, color }: { plan: TradingPlan; ticker: string; color: CompareStock["color"] }) {
  const isWaitAndSee = plan.strategy === "WAIT_AND_SEE";

  return (
    <div className={`card-gradient depth-shadow rounded-xl border overflow-hidden ${isWaitAndSee ? "border-bearish/30" : "border-border"}`}>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${color.text}`}>{stripJk(ticker)}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${strategyStyles[plan.strategy]}`}>
              {strategyLabels[plan.strategy]}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${confidenceStyles[plan.confidence]}`}>
              {confidenceLabels[plan.confidence]}
            </span>
          </div>
        </div>

        <div className={`space-y-1.5 text-xs ${isWaitAndSee ? "opacity-50" : ""}`}>
          <div className="flex justify-between">
            <span className="text-text-secondary">Entry</span>
            <span className="font-mono font-semibold text-accent">{formatRp(plan.entry)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">TP 1</span>
            <span className="font-mono font-semibold text-bullish">{formatRp(plan.tp1)}</span>
          </div>
          {plan.tp2 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">TP 2</span>
              <span className="font-mono font-semibold text-bullish">{formatRp(plan.tp2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-secondary">Stop Loss</span>
            <span className="font-mono font-semibold text-bearish">{formatRp(plan.sl)}</span>
          </div>
        </div>

        <div className="h-px bg-border/60" />

        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Risk : Reward</span>
          <span className={`font-bold tabular-nums ${isWaitAndSee ? "text-bearish" : ""}`}>1 : {plan.riskReward.toFixed(1)}</span>
        </div>

        {plan.suggestion && (
          <p className="text-[10px] text-text-secondary leading-snug">{plan.suggestion}</p>
        )}
      </div>
    </div>
  );
}

export function TradingPlansTab({ stocks }: Props) {
  const stocksPlan = stocks.filter((s): s is CompareStock & { tradingPlan: TradingPlan } => s.tradingPlan !== null);

  if (stocksPlan.length === 0) {
    return <p className="text-sm text-text-secondary py-6 text-center">No trading plans available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stocksPlan.map((s) => (
        <PlanCard key={s.ticker} plan={s.tradingPlan!} ticker={s.ticker} color={s.color} />
      ))}
    </div>
  );
}
