import Link from "next/link";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { MiniSparkline } from "@/components/chart/mini-sparkline";

interface FeaturedStockCardProps {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  sparklineData?: number[];
  badge?: string;
  badgeColor?: string;
}

export function FeaturedStockCard({
  ticker,
  name,
  sector,
  close,
  changePercent,
  sparklineData,
  badge,
  badgeColor,
}: FeaturedStockCardProps) {
  const isPositive = changePercent !== null && changePercent >= 0;
  const accentColor = changePercent === null ? "#2563eb" : isPositive ? "#0d9488" : "#dc2626";

  return (
    <Link
      href={`/stocks/${ticker}`}
      className="featured-stock-card depth-shadow p-4 pl-5 block"
      style={{ "--card-accent": accentColor } as React.CSSProperties}
      aria-label={`${stripJk(ticker)} — ${name}, ${close !== null ? formatPrice(close) : "no price"}${changePercent !== null ? `, ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[15px] tracking-tight">{stripJk(ticker)}</p>
            {badge && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${badgeColor ?? "#2563eb"}15`,
                  color: badgeColor ?? "#2563eb",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary truncate leading-tight">{name}</p>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          {close != null ? (
            <p className="font-semibold text-[15px] tracking-tight">{formatPrice(close)}</p>
          ) : (
            <p className="font-semibold text-text-tertiary">—</p>
          )}
          {changePercent !== null && (
            <p className={`text-xs font-medium mt-0.5 ${changeColor(changePercent)}`}>
              {formatPercent(changePercent)}
            </p>
          )}
        </div>
      </div>
      {sparklineData && sparklineData.length >= 2 && (
        <div className="mt-1 mb-2">
          <MiniSparkline data={sparklineData} width={160} height={36} />
        </div>
      )}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider bg-bg-primary px-2 py-0.5 rounded-full">
          {sector}
        </span>
        {changePercent !== null && (
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold ${
              isPositive ? "bg-bullish" : "bg-bearish"
            }`}
            aria-hidden="true"
          >
            {isPositive ? "↑" : "↓"}
          </span>
        )}
      </div>
    </Link>
  );
}
