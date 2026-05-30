"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { MiniSparkline } from "@/components/chart/mini-sparkline";

interface StockAttachmentCardProps {
  tickerTag: string;
  predictionDirection?: string | null;
  predictionTarget?: number | string | null;
}

interface StockData {
  ticker: string;
  name: string;
  close: number | null;
  changePercent: number | null;
  week52High: number | null;
  week52Low: number | null;
  indicators: {
    rsi14: number | null;
    macdHist: number | null;
    sma20: number | null;
    smaCrossSignal: string | null;
    smaCrossDate: string | null;
  } | null;
}

interface PriceRow {
  close: number;
}

const DIR_STYLES: Record<string, { label: string; color: string; bg: string; accent: string; gradient: string; arrow: string }> = {
  bullish: {
    label: "Bullish",
    color: "text-teal-700",
    bg: "bg-teal-50/80",
    accent: "#0d9488",
    gradient: "from-teal-500/20 via-teal-400/5 to-transparent",
    arrow: "↑",
  },
  bearish: {
    label: "Bearish",
    color: "text-red-700",
    bg: "bg-red-50/80",
    accent: "#dc2626",
    gradient: "from-red-500/20 via-red-400/5 to-transparent",
    arrow: "↓",
  },
  neutral: {
    label: "Netral",
    color: "text-stone-600",
    bg: "bg-stone-50/80",
    accent: "#78716c",
    gradient: "from-stone-500/10 via-stone-400/5 to-transparent",
    arrow: "→",
  },
};

function IndicatorCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-bg-primary/60 px-2.5 py-2 border border-border/40">
      <div className="text-[9px] text-text-tertiary font-semibold uppercase tracking-wider mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function RsiBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-text-tertiary text-xs">—</span>;

  const pct = Math.max(0, Math.min(100, value));
  const color = value < 30 ? "#0d9488" : value > 70 ? "#dc2626" : "#78716c";
  const label = value < 30 ? "Oversold" : value > 70 ? "Overbought" : "";

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>{value.toFixed(1)}</span>
        {label && <span className="text-[9px] font-medium" style={{ color }}>{label}</span>}
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-stone-200/80 overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[30%] rounded-full bg-teal-400/15" />
        <div className="absolute right-0 top-0 h-full w-[30%] rounded-full bg-red-400/15" />
        <div
          className="absolute w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ left: `${pct}%`, top: "50%", transform: "translate(-50%, -50%)", backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MacdValue({ value }: { value: number | null }) {
  if (value == null) return <span className="text-text-tertiary text-xs">—</span>;

  const positive = value >= 0;
  const color = positive ? "#0d9488" : "#dc2626";

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {positive ? "+" : ""}{value.toFixed(2)}
      </span>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d={positive ? "M5 2L9 7H1Z" : "M5 8L1 3H9Z"} fill={color} />
      </svg>
    </div>
  );
}

function SignalBadge({ signal, sma20, price }: { signal: string | null; sma20: number | null; price: number | null }) {
  if (signal === "golden_cross") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
        <span aria-hidden="true">✦</span> Golden Cross
      </span>
    );
  }
  if (signal === "death_cross") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        <span aria-hidden="true">✦</span> Death Cross
      </span>
    );
  }
  if (sma20 != null && price != null) {
    const above = price >= sma20;
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-text-tertiary">SMA20</span>
        <span className="text-xs font-medium tabular-nums">{formatPrice(sma20)}</span>
        <span className={`text-[9px] font-bold ${above ? "text-bullish" : "text-bearish"}`}>
          {above ? "▲" : "▼"}
        </span>
      </div>
    );
  }
  return <span className="text-text-tertiary text-xs">—</span>;
}

function RangeBar({ low, high, current }: { low: number | null; high: number | null; current: number | null }) {
  if (low == null || high == null || current == null || high <= low) {
    return <span className="text-text-tertiary text-xs">—</span>;
  }

  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-text-tertiary tabular-nums">{formatPrice(low)}</span>
        <span className="text-[9px] text-text-tertiary tabular-nums">{formatPrice(high)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-stone-200/80">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-accent/30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 w-2 h-2 rounded-full bg-accent border-[1.5px] border-white"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}

export function StockAttachmentCard({ tickerTag, predictionDirection, predictionTarget }: StockAttachmentCardProps) {
  const ticker = tickerTag.includes(".") ? tickerTag : `${tickerTag}.JK`;
  const dir = predictionDirection ? DIR_STYLES[predictionDirection] : null;

  const { data: stock } = useQuery<StockData>({
    queryKey: ["stock", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: history } = useQuery<PriceRow[]>({
    queryKey: ["stock-history", ticker, "1m"],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}/history?range=1m`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const sparklineData = history?.map((p) => p.close) ?? [];
  const targetNum = predictionTarget ? Number(predictionTarget) : null;
  const currentPrice = stock?.close ?? 0;
  const targetPct = targetNum && currentPrice > 0
    ? ((targetNum - currentPrice) / currentPrice) * 100
    : null;

  const accentColor = dir?.accent ?? "#2563eb";
  const sparkColor = stock?.changePercent != null && stock.changePercent < 0 ? "#dc2626" : accentColor;

  return (
    <Link
      href={`/stocks/${ticker}`}
      className="block mt-3 rounded-xl overflow-hidden depth-shadow hover:depth-shadow-hover transition-all duration-200 press-scale border border-border bg-bg-card"
    >
      {/* Top accent bar */}
      <div
        className="h-[3px]"
        style={{
          background: dir
            ? `linear-gradient(90deg, ${accentColor}, ${accentColor}88, transparent)`
            : "linear-gradient(90deg, #2563eb, #2563eb88, transparent)",
        }}
      />

      {/* Main content */}
      <div className="px-3.5 py-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-accent tracking-tight">{stripJk(tickerTag)}</span>
              {stock?.name && (
                <>
                  <span className="text-text-tertiary text-[10px]" aria-hidden="true">·</span>
                  <span className="text-xs text-text-secondary truncate">{stock.name}</span>
                </>
              )}
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              {stock?.close != null && (
                <span className="text-base font-semibold tabular-nums tracking-tight">{formatPrice(stock.close)}</span>
              )}
              {stock?.changePercent != null && (
                <span className={`text-xs font-semibold tabular-nums ${changeColor(stock.changePercent)}`}>
                  {formatPercent(stock.changePercent)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full-width sparkline */}
        {sparklineData.length >= 2 && (
          <div className="mt-2.5 -mx-1">
            <MiniSparkline data={sparklineData} width={240} height={40} color={sparkColor} />
          </div>
        )}

        {/* Indicator grid */}
        {stock?.indicators && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {/* RSI 14 */}
            <IndicatorCell label="RSI 14">
              <RsiBar value={stock.indicators.rsi14} />
            </IndicatorCell>

            {/* MACD */}
            <IndicatorCell label="MACD Hist">
              <MacdValue value={stock.indicators.macdHist} />
            </IndicatorCell>

            {/* Signal */}
            <IndicatorCell label="Signal">
              <SignalBadge
                signal={stock.indicators.smaCrossSignal}
                sma20={stock.indicators.sma20}
                price={stock.close}
              />
            </IndicatorCell>

            {/* 52W Range */}
            <IndicatorCell label="52W Range">
              <RangeBar low={stock.week52Low} high={stock.week52High} current={stock.close} />
            </IndicatorCell>
          </div>
        )}
      </div>

      {/* Prediction section */}
      {dir && (
        <div
          className="px-3.5 py-2.5 border-t border-border/60"
          style={{ background: `linear-gradient(180deg, ${accentColor}08, transparent)` }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${dir.bg} ${dir.color} border border-current/10`}
            >
              <span aria-hidden="true">{dir.arrow}</span>
              {dir.label}
            </span>
            {targetNum && targetNum > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-tertiary text-[10px]">TARGET</span>
                <span className="text-xs font-semibold tabular-nums">{formatPrice(targetNum)}</span>
                {targetPct !== null && (
                  <span className={`text-[10px] font-bold tabular-nums ${targetPct >= 0 ? "text-bullish" : "text-bearish"}`}>
                    ({targetPct >= 0 ? "+" : ""}{targetPct.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
