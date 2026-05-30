"use client";

import type { CompareStock } from "@/hooks/use-compare-data";
import { stripJk, rsiBgColor, rsiStatus } from "@/lib/utils";

interface Props {
  stocks: CompareStock[];
}

function Badge({ text, variant }: { text: string; variant: "bullish" | "bearish" | "neutral" | "spike" }) {
  const styles = {
    bullish: "bg-bullish-bg text-bullish",
    bearish: "bg-bearish-bg text-bearish",
    neutral: "bg-bg-hover text-text-secondary",
    spike: "bg-amber-100 text-amber-800",
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles[variant]}`}>{text}</span>;
}

function MetricRow({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono tabular-nums font-semibold text-text-primary">{value}</span>
        {children}
      </div>
    </div>
  );
}

function RsiBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = rsiBgColor(value);

  return (
    <div className="mt-1">
      <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-bullish">30</span>
        <span className="text-[9px] text-bearish">70</span>
      </div>
    </div>
  );
}

function TechnicalCard({ stock }: { stock: CompareStock }) {
  const ind = stock.indicators as Record<string, unknown> | null;
  const supertrend = (ind?.supertrend as number | null) ?? null;
  const macdHist = (ind?.macdHist as number | null) ?? null;
  const rsi14 = (ind?.rsi14 as number | null) ?? null;
  const close = stock.close;

  const trendBullish = close !== null && supertrend !== null && close > supertrend;
  const momentumBullish = macdHist !== null && macdHist > 0;

  const volRatio = stock.volume !== null && stock.avgVolume !== null && stock.avgVolume > 0
    ? stock.volume / stock.avgVolume
    : null;

  return (
    <div className="card-gradient depth-shadow rounded-xl border border-border overflow-hidden">
      <div className="p-3.5 space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${stock.color.dot}`} />
          <span className={`text-sm font-bold ${stock.color.text}`}>{stripJk(stock.ticker)}</span>
          <span className="text-[10px] text-text-tertiary truncate">{stock.name}</span>
        </div>

        <div className="h-px bg-border/60" />

        {/* Trend */}
        <MetricRow
          label="Trend"
          value={supertrend !== null ? (trendBullish ? "▲ Bullish" : "▼ Bearish") : "—"}
        >
          {supertrend !== null && (
            <Badge text={trendBullish ? "Bullish" : "Bearish"} variant={trendBullish ? "bullish" : "bearish"} />
          )}
        </MetricRow>

        {/* Momentum */}
        <MetricRow
          label="Momentum"
          value={macdHist !== null ? macdHist.toFixed(2) : "—"}
        >
          {macdHist !== null && (
            <Badge text={momentumBullish ? "Bullish" : "Bearish"} variant={momentumBullish ? "bullish" : "bearish"} />
          )}
        </MetricRow>

        {/* RSI */}
        <div>
          <MetricRow
            label="RSI (14)"
            value={rsi14 !== null ? rsi14.toFixed(1) : "—"}
          >
            {rsi14 !== null && (
              <Badge
                text={rsiStatus(rsi14)}
                variant={rsi14 < 30 ? "bullish" : rsi14 > 70 ? "bearish" : "neutral"}
              />
            )}
          </MetricRow>
          {rsi14 !== null && <RsiBar value={rsi14} />}
        </div>

        {/* Volume */}
        <MetricRow
          label="Volume"
          value={volRatio !== null ? `${volRatio.toFixed(1)}x avg` : "—"}
        >
          {volRatio !== null && volRatio >= 2 && <Badge text="Spike" variant="spike" />}
        </MetricRow>
      </div>
    </div>
  );
}

export function TechnicalIndicatorsTab({ stocks }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stocks.map((s) => (
        <TechnicalCard key={s.ticker} stock={s} />
      ))}
    </div>
  );
}
