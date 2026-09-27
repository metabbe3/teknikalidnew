"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { HealthScoreBadge } from "@/components/stock/health-score-badge";
import { Sparkline } from "@/components/stock/sparkline";
import type { StockRow } from "@/components/stock/stock-table";

interface StockCardProps {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  signalLabel?: string | null;
  signalScore?: number | null;
  isGorengan?: boolean;
}

const SIGNAL_STYLES: Record<string, string> = {
  "Strong Bullish": "bg-bullish/20 text-bullish",
  "Bullish": "bg-bullish/15 text-bullish",
  "Netral": "bg-gray-200 text-gray-500",
  "Bearish": "bg-bearish/15 text-bearish",
  "Strong Bearish": "bg-bearish/20 text-bearish",
};

export function StockCard({ ticker, name, sector, close, change, changePercent, signalLabel, signalScore, isGorengan }: StockCardProps) {
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
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[15px] tracking-tight">{stripJk(ticker)}</p>
            {signalLabel && (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${SIGNAL_STYLES[signalLabel] ?? "bg-gray-200 text-gray-500"}`}>
                {signalLabel === "Strong Bullish" ? "▲▲" : signalLabel === "Bullish" ? "▲" : signalLabel === "Strong Bearish" ? "▼▼" : signalLabel === "Bearish" ? "▼" : "◆"}
              </span>
            )}
            {isGorengan && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">⚠</span>
            )}
            <HealthScoreBadge signalScore={signalScore ?? null} size="sm" />
          </div>
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

function ListingBoardBadge({ board }: { board: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    "Pemantauan Khusus": { label: "Special Monitoring", cls: "bg-amber-100 text-amber-700" },
    "Pengembangan": { label: "Dev", cls: "bg-gray-100 text-gray-500" },
    "Akselerasi": { label: "Accel", cls: "bg-blue-50 text-blue-600" },
    "Ekonomi Baru": { label: "New", cls: "bg-emerald-50 text-emerald-600" },
  };
  const c = config[board];
  if (!c) return null;
  return <span className={`ml-1.5 inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded ${c.cls}`}>{c.label}</span>;
}

export interface StockCardListProps {
  stocks: StockRow[];
  linkBase?: string;
}

export function StockCardList({ stocks, linkBase = "/stocks" }: StockCardListProps) {
  const router = useRouter();

  // Same queryKey as stock-table — React Query shares the cache, no extra fetch
  const { data: sparklines } = useQuery<Record<string, number[]>>({
    queryKey: ["sparklines"],
    queryFn: async () => {
      const res = await fetch("/api/stocks/sparkline");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (stocks.length === 0) {
    return (
      <div className="rounded-xl depth-shadow border border-border/60 text-center text-text-tertiary py-20">
        Tidak ada saham ditemukan
      </div>
    );
  }

  return (
    <div className="rounded-xl depth-shadow border border-border/60 overflow-hidden">
      {stocks.map((stock, i) => (
        <button
          key={stock.ticker}
          type="button"
          className={`block w-full text-left px-4 py-3 border-b border-border/50 last:border-b-0 active:bg-accent/[0.06] transition-colors ${
            i % 2 === 0 ? "bg-bg-card/30" : ""
          }`}
          onClick={() => router.push(`${linkBase}/${stock.ticker}`)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center min-w-0">
              <span className="font-semibold text-accent">{stripJk(stock.ticker)}</span>
              {stock.listingBoard && stock.listingBoard !== "Utama" && (
                <ListingBoardBadge board={stock.listingBoard} />
              )}
            </div>
            <span className={`shrink-0 font-mono tabular-nums font-medium ${changeColor(stock.changePercent)}`}>
              {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
            </span>
          </div>
          <div className="mt-0.5 text-sm text-text-secondary truncate">{stock.name}</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono tabular-nums font-medium">
              {stock.close !== null ? formatPrice(stock.close) : "—"}
            </span>
            {sparklines?.[stock.ticker] && sparklines[stock.ticker].length >= 2 && (
              <Sparkline data={sparklines[stock.ticker]} positive={(stock.changePercent ?? 0) >= 0} />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
