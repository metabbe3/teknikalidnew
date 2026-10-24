import Link from "next/link";
import { formatPercentPlain, formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { StockLogo } from "@/components/stock/stock-logo";

type BadgeTone = "bullish" | "bearish" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
  bullish: "bg-bullish-bg text-bullish",
  bearish: "bg-bearish-bg text-bearish",
  neutral: "bg-bg-hover text-text-secondary",
};

interface FeaturedStockCardProps {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  sparklineData?: number[];
  badge?: string;
  badgeTone?: BadgeTone;
}

export function FeaturedStockCard({
  ticker,
  name,
  sector,
  close,
  changePercent,
  badge,
  badgeTone,
}: FeaturedStockCardProps) {
  const isPositive = changePercent !== null && changePercent >= 0;
  // Leading accent rule (border-top) tinted by direction — a leading rule, not a side-stripe.
  const accentVar =
    changePercent === null
      ? "var(--color-accent)"
      : isPositive
        ? "var(--color-bullish)"
        : "var(--color-bearish)";

  return (
    <Link
      href={`/stocks/${ticker}`}
      className="featured-stock-card p-4 pl-5 block"
      style={{ "--card-accent": accentVar } as React.CSSProperties}
      aria-label={`${stripJk(ticker)} — ${name}, ${close !== null ? formatPrice(close) : "no price"}${changePercent !== null ? `, ${changePercent >= 0 ? "+" : "-"}${formatPercentPlain(changePercent)}%` : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex items-start gap-2.5">
          <div className="shrink-0 mt-0.5"><StockLogo name={name} ticker={ticker} size={28} /></div>
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono font-semibold text-sm tabular-nums">{stripJk(ticker)}</p>
            {badge && (
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${BADGE_TONES[badgeTone ?? "neutral"]}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary truncate leading-tight">{name}</p>
          </div>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          {close != null ? (
            <p data-live-price={ticker} className="font-mono font-semibold text-sm">{formatPrice(close)}</p>
          ) : (
            <p className="font-semibold text-text-tertiary">—</p>
          )}
          {changePercent !== null && (
            <p data-live-percent={ticker} className={`text-xs font-medium mt-0.5 font-mono ${changeColor(changePercent)}`}>
              {formatPercent(changePercent)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider truncate">
          {sector}
        </span>
        {changePercent !== null && (
          <span className={`text-[10px] font-bold ${changeColor(changePercent)}`} aria-hidden="true">
            {isPositive ? "▲" : "▼"}
          </span>
        )}
      </div>
    </Link>
  );
}
