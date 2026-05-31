import Link from "next/link";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";

interface StockArticleCardProps {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  sma20: number | null;
}

function rsiColor(rsi: number | null): string {
  if (rsi === null) return "text-text-tertiary";
  if (rsi >= 70) return "text-red-400";
  if (rsi <= 30) return "text-green-400";
  return "text-text-secondary";
}

function rsiLabel(rsi: number | null): string {
  if (rsi === null) return "—";
  if (rsi >= 70) return "Overbought";
  if (rsi <= 30) return "Oversold";
  return "Netral";
}

export function StockArticleCard({ ticker, name, sector, close, changePercent, rsi14 }: StockArticleCardProps) {
  const isPositive = changePercent !== null && changePercent >= 0;

  return (
    <Link
      href={`/stocks/${ticker}`}
      className="block bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all duration-200 press-scale"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm tracking-tight">{stripJk(ticker)}</p>
          <p className="text-[11px] text-text-secondary truncate mt-0.5 leading-tight">{name}</p>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          {close != null ? (
            <p className="font-semibold text-sm tracking-tight">{formatPrice(close)}</p>
          ) : (
            <p className="font-semibold text-text-tertiary text-sm">—</p>
          )}
          {changePercent !== null && (
            <p className={`text-xs font-medium mt-0.5 ${changeColor(changePercent)}`}>
              {isPositive ? "+" : ""}{formatPercent(changePercent)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">{sector}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-medium ${rsiColor(rsi14)}`}>
            RSI {rsi14 !== null ? rsi14.toFixed(0) : "—"}
          </span>
          {rsi14 !== null && (
            <span className={`text-[9px] ${rsiColor(rsi14)}`}>
              {rsiLabel(rsi14)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
