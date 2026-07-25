import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripJk, formatPrice } from "@/lib/utils";

export interface BreathData {
  advancersCount: number;
  declinersCount: number;
  unchangedCount: number;
  topGainer?: { ticker: string; changePercent: number } | null;
  topLoser?: { ticker: string; changePercent: number } | null;
  ihsg?: { close: number | null; changePercent: number | null } | null;
}

/**
 * MarketBreathStrip — at-a-glance market breadth (advancers/decliners/unchanged)
 * + IHSG + top gainer/loser. Reused on the homepage and /stocks listing.
 * Pure presentational (server-safe).
 */
export function MarketBreathStrip({ data, className }: { data: BreathData; className?: string }) {
  const { advancersCount, declinersCount, unchangedCount, topGainer, topLoser, ihsg } = data;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}>
      {ihsg && ihsg.close !== null && (
        <span className="inline-flex items-center gap-1.5 font-mono">
          <span className="text-text-tertiary text-xs">IHSG</span>
          <span className="font-bold tabular-nums text-text-primary">{formatPrice(ihsg.close)}</span>
          {ihsg.changePercent !== null && (
            <span className={cn("font-semibold tabular-nums", ihsg.changePercent >= 0 ? "text-bullish" : "text-bearish")}>
              {ihsg.changePercent >= 0 ? "+" : ""}{ihsg.changePercent.toFixed(2)}%
            </span>
          )}
        </span>
      )}
      <span className="hidden sm:inline text-border" aria-hidden>|</span>
      <span className="inline-flex items-center gap-1.5 font-semibold text-bullish">
        <TrendingUp className="h-4 w-4" aria-hidden />
        <span className="font-mono tabular-nums">{advancersCount}</span> naik
      </span>
      <span className="inline-flex items-center gap-1.5 font-semibold text-bearish">
        <TrendingDown className="h-4 w-4" aria-hidden />
        <span className="font-mono tabular-nums">{declinersCount}</span> turun
      </span>
      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
        <Minus className="h-4 w-4" aria-hidden />
        <span className="font-mono tabular-nums">{unchangedCount}</span> stagnan
      </span>
      {topGainer && (
        <Link
          href={`/berita/saham-${topGainer.ticker.replace(/\.JK$/i, "").toLowerCase()}`}
          className="hidden md:inline-flex items-center gap-1 text-text-secondary hover:text-bullish transition-colors ml-auto"
        >
          Top Gainer
          <span className="font-mono font-bold text-bullish">{stripJk(topGainer.ticker)}</span>
          <span className="font-mono text-bullish">+{topGainer.changePercent.toFixed(2)}%</span>
        </Link>
      )}
      {topLoser && (
        <Link
          href={`/berita/saham-${topLoser.ticker.replace(/\.JK$/i, "").toLowerCase()}`}
          className="hidden md:inline-flex items-center gap-1 text-text-secondary hover:text-bearish transition-colors"
        >
          Top Loser
          <span className="font-mono font-bold text-bearish">{stripJk(topLoser.ticker)}</span>
          <span className="font-mono text-bearish">{topLoser.changePercent.toFixed(2)}%</span>
        </Link>
      )}
    </div>
  );
}
