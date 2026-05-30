import Link from "next/link";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";

interface StockCardProps {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
}

export function StockCard({ ticker, name, sector, close, change, changePercent }: StockCardProps) {
  const isPositive = changePercent !== null && changePercent >= 0;
  const colorAccent = changePercent === null ? "" : isPositive ? "card-bullish" : "card-bearish";
  const bgTint = changePercent === null ? "bg-bg-card" : isPositive ? "bg-bullish/[0.02]" : "bg-bearish/[0.02]";

  return (
    <Link
      href={`/stocks/${ticker}`}
      className={`block rounded-xl ${bgTint} depth-shadow p-4 hover:depth-shadow-hover transition-all duration-200 press-scale ${colorAccent}`}
      aria-label={`${stripJk(ticker)} — ${name}, ${close !== null ? formatPrice(close) : "no price"}${changePercent !== null ? `, ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[15px] tracking-tight">{stripJk(ticker)}</p>
          <p className="text-[11px] text-text-secondary truncate mt-0.5 leading-tight">{name}</p>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          {close != null ? (
            <p className="font-semibold text-[15px] tracking-tight">{formatPrice(close)}</p>
          ) : (
            <p className="font-semibold text-text-tertiary">—</p>
          )}
          {changePercent !== null && (
            <p className={`text-xs font-medium mt-0.5 ${changeColor(changePercent)}`}>
              {isPositive ? "+" : ""}{formatPercent(changePercent)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">{sector}</span>
        {changePercent !== null && (
          <span className={`flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-bold ${isPositive ? "bg-bullish" : "bg-bearish"}`} aria-hidden="true">
            {isPositive ? "↑" : "↓"}
          </span>
        )}
      </div>
    </Link>
  );
}
