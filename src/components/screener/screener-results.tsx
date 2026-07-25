"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatPrice, formatPercent, formatVolume, stripJk, changeColor, rsiColor } from "@/lib/utils";
import type { TradingStyleDef, ScreenerStock, ViewMode, SortField, SortOrder } from "./screener-types";
import { SORT_OPTIONS, signalLabelColor } from "./screener-types";
import { BookmarkIcon } from "./screener-icons";

// ── Results Header ──

export function ResultsHeader({
  count,
  viewMode,
  onViewChange,
  tickers,
  onBatchAdd,
  isBatchAdding,
  onBatchRemove,
  isBatchRemoving,
  watchedCount,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  count: number;
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
  tickers: string[];
  onBatchAdd: () => void;
  isBatchAdding: boolean;
  onBatchRemove: () => void;
  isBatchRemoving: boolean;
  watchedCount: number;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return (
    <div className="flex items-center justify-between flex-1 flex-wrap gap-2">
      <div className="flex items-center gap-2.5">
        <h3 className="text-lg font-semibold tracking-tight">Hasil</h3>
        <span className="text-xs text-text-tertiary tabular-nums font-mono">{count} saham</span>
      </div>
      <div className="flex items-center gap-2">
        {isAuthenticated && count > 0 && (
          <>
            <button
              onClick={onBatchAdd}
              disabled={isBatchAdding}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-bg-card hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Tambahkan semua ke watchlist"
            >
              <BookmarkIcon filled={false} className="w-3.5 h-3.5" />
              {isBatchAdding ? "Menambahkan..." : "Tambah ke Watchlist"}
            </button>
            {watchedCount > 0 && (
              <button
                onClick={onBatchRemove}
                disabled={isBatchRemoving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Hapus ${watchedCount} saham dari watchlist`}
              >
                <BookmarkIcon filled={true} className="w-3.5 h-3.5" />
                {isBatchRemoving ? "Menghapus..." : `Hapus (${watchedCount})`}
              </button>
            )}
          </>
        )}
        {/* Sort dropdown */}
        <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg px-2 py-1">
          <span className="text-[10px] text-text-tertiary mr-1">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortField, sortBy === e.target.value && sortOrder === "desc" ? "asc" : "desc")}
            className="text-xs bg-transparent text-text-primary border-none outline-none cursor-pointer pr-1"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {sortBy && (
            <button
              onClick={() => onSortChange(sortBy, sortOrder === "desc" ? "asc" : "desc")}
              className="p-0.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              aria-label={sortOrder === "desc" ? "Sort descending" : "Sort ascending"}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 5v14M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg p-0.5">
          <button
            onClick={() => onViewChange("table")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "table" ? "bg-bg-hover text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => onViewChange("cards")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "cards" ? "bg-bg-hover text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}
            aria-label="Card view"
            aria-pressed={viewMode === "cards"}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Results Table ──

export function ResultsTable({ stocks, watchlistTickers, onToggleWatchlist }: { stocks: ScreenerStock[]; watchlistTickers: Set<string>; onToggleWatchlist: (ticker: string) => void }) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 49;

  const virtualizer = useVirtualizer({
    count: stocks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const gridCols = "grid-cols-[36px_100px_200px_130px_90px_80px_90px_80px_80px_1fr]";

  if (stocks.length === 0) {
    return (
      <div className="card-gradient depth-shadow rounded-xl p-8 text-center border border-border">
        <p className="text-text-secondary text-sm">Tidak ada saham yang cocok dengan filter ini.</p>
        <p className="text-text-tertiary text-xs mt-1">Coba filter lain atau cek lagi nanti.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl depth-shadow-strong bg-bg-card relative">
      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
        <div className={`glass-header sticky top-0 z-10 grid ${gridCols} text-text-tertiary text-[11px] uppercase tracking-wider min-w-[986px]`}>
          <div className="px-2 py-3 font-medium"></div>
          <div className="px-4 py-3 font-medium">Ticker</div>
          <div className="px-4 py-3 font-medium">Name</div>
          <div className="px-4 py-3 font-medium">Sector</div>
          <div className="px-4 py-3 text-right font-medium">Price</div>
          <div className="px-4 py-3 text-right font-medium">Change</div>
          <div className="px-4 py-3 text-right font-medium">Volume</div>
          <div className="px-4 py-3 text-right font-medium">RSI</div>
          <div className="px-4 py-3 text-right font-medium">Signal</div>
          <div className="px-4 py-3 text-right font-medium">SMA 20</div>
        </div>
        <div className="relative min-w-[986px]" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const stock = stocks[virtualRow.index];
            const inWatchlist = watchlistTickers.has(stock.ticker);
            return (
              <div
                key={stock.ticker}
                role="row"
                tabIndex={0}
                className={`absolute top-0 left-0 w-full grid ${gridCols} items-center border-b border-border/40 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                  virtualRow.index % 2 === 0 ? "bg-bg-card/40" : ""
                } hover:bg-accent/[0.04]`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => router.push(`/stocks/${stock.ticker}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/stocks/${stock.ticker}`);
                  }
                }}
              >
                <div className="px-2 py-3 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAuthenticated) {
                        onToggleWatchlist(stock.ticker);
                      }
                    }}
                    className={`p-0.5 rounded transition-colors ${
                      isAuthenticated ? "cursor-pointer hover:text-accent" : "cursor-default text-text-tertiary/70"
                    } ${inWatchlist ? "text-accent" : "text-text-tertiary"}`}
                    aria-label={isAuthenticated ? (inWatchlist ? "Hapus dari watchlist" : "Tambah ke watchlist") : "Daftar untuk menggunakan watchlist"}
                    title={isAuthenticated ? (inWatchlist ? "Hapus dari watchlist" : "Tambah ke watchlist") : "Daftar untuk menggunakan watchlist"}
                  >
                    <BookmarkIcon filled={inWatchlist} className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-4 py-3">
                  <Link href={`/stocks/${stock.ticker}`} className="font-semibold text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                    {stripJk(stock.ticker)}
                  </Link>
                </div>
                <div className="px-4 py-3 text-text-secondary truncate text-xs">{stock.name}</div>
                <div className="px-4 py-3 text-text-tertiary text-[11px]">{stock.sector}</div>
                <div className="px-4 py-3 text-right font-mono tabular-nums text-xs">{stock.close !== null ? formatPrice(stock.close) : "\u2014"}</div>
                <div className={`px-4 py-3 text-right font-mono tabular-nums text-xs ${changeColor(stock.changePercent)}`}>
                  {stock.changePercent !== null ? formatPercent(stock.changePercent) : "\u2014"}
                </div>
                <div className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary text-xs">
                  {stock.volume !== null ? formatVolume(stock.volume) : "\u2014"}
                </div>
                <div className={`px-4 py-3 text-right font-mono tabular-nums text-xs ${rsiColor(stock.rsi14)}`}>
                  {stock.rsi14 !== null ? stock.rsi14.toFixed(1) : "\u2014"}
                </div>
                <div className="px-4 py-3 text-right">
                  {stock.signalLabel ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${signalLabelColor(stock.signalLabel)}`}>
                      {stock.signalLabel}
                    </span>
                  ) : "\u2014"}
                </div>
                <div className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary text-xs">
                  {stock.sma20 !== null ? formatPrice(stock.sma20) : "\u2014"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Results Cards ──

export function ResultsCards({ stocks, styleDef, watchlistTickers, onToggleWatchlist }: { stocks: ScreenerStock[]; styleDef: TradingStyleDef; watchlistTickers: Set<string>; onToggleWatchlist: (ticker: string) => void }) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  if (stocks.length === 0) {
    return (
      <div className="card-gradient depth-shadow rounded-xl p-8 text-center border border-border">
        <p className="text-text-secondary text-sm">Tidak ada saham yang cocok.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stocks.map((stock) => {
        const inWatchlist = watchlistTickers.has(stock.ticker);
        return (
          <div
            key={stock.ticker}
            className="card-gradient depth-shadow rounded-xl border border-border p-4 hover:depth-shadow-hover transition-all duration-200 press-scale group relative"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isAuthenticated) {
                  onToggleWatchlist(stock.ticker);
                }
              }}
              className={`absolute top-3 right-3 p-1 rounded transition-colors z-10 ${
                isAuthenticated ? "cursor-pointer hover:text-accent" : "cursor-default text-text-tertiary/70"
              } ${inWatchlist ? "text-accent" : "text-text-tertiary"}`}
              aria-label={isAuthenticated ? (inWatchlist ? "Hapus dari watchlist" : "Tambah ke watchlist") : "Daftar untuk menggunakan watchlist"}
              title={isAuthenticated ? (inWatchlist ? "Hapus dari watchlist" : "Tambah ke watchlist") : "Daftar untuk menggunakan watchlist"}
            >
              <BookmarkIcon filled={inWatchlist} className="w-4 h-4" />
            </button>
            <Link
              href={`/stocks/${stock.ticker}`}
              className="block"
            >
            <div className="flex items-start justify-between pr-6">
              <div>
                <span className="font-bold text-accent group-hover:underline">{stripJk(stock.ticker)}</span>
                <p className="text-[11px] text-text-secondary mt-0.5 truncate max-w-[180px]">{stock.name}</p>
              </div>
              {stock.signalLabel ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${signalLabelColor(stock.signalLabel)}`}>
                  {stock.signalLabel}
                </span>
              ) : stock.rsi14 !== null ? (
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-bg-hover ${rsiColor(stock.rsi14)}`}>
                  RSI {stock.rsi14.toFixed(0)}
                </span>
              ) : null}
            </div>

            <div className="flex items-end justify-between mt-3">
              <div>
                <span className="text-lg font-bold font-mono tabular-nums">{stock.close !== null ? formatPrice(stock.close) : "\u2014"}</span>
                {stock.changePercent !== null && (
                  <span className={`ml-2 text-xs font-mono font-semibold ${changeColor(stock.changePercent)}`}>
                    {formatPercent(stock.changePercent)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-text-tertiary">{stock.sector}</span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-[10px] text-text-tertiary font-mono">
              {stock.volume !== null && <span>Vol {formatVolume(stock.volume)}</span>}
              {stock.sma20 !== null && stock.close !== null && (
                <span className={Math.abs((stock.close - stock.sma20) / stock.sma20 * 100) < 3 ? "text-bullish" : ""}>
                  SMA20 {formatPrice(stock.sma20)}
                </span>
              )}
            </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}