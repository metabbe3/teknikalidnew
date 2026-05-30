"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatPrice, formatPercent, formatVolume, stripJk, changeColor, rsiColor, rsiBgColor } from "@/lib/utils";
import { Sparkline } from "@/components/stock/sparkline";

interface StockRow {
  ticker: string;
  name: string;
  sector: string;
  listingBoard: string | null;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  sma20: number | null;
}

interface StockTableProps {
  stocks: StockRow[];
  sectors: string[];
}

type SortKey = "ticker" | "name" | "sector" | "close" | "changePercent" | "volume" | "rsi14";

const ROW_HEIGHT = 49;
const OVERSCAN = 8;

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

export function StockTable({ stocks, sectors }: StockTableProps) {
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortAsc, setSortAsc] = useState(true);
  const pillsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: sparklines } = useQuery<Record<string, number[]>>({
    queryKey: ["sparklines"],
    queryFn: async () => {
      const res = await fetch("/api/stocks/sparkline");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    let list = sectorFilter === "all" ? stocks : stocks.filter((s) => s.sector === sectorFilter);
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase().trim();
      list = list.filter(
        (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = (aVal as number) - (bVal as number);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [stocks, sectorFilter, debouncedQuery, sortKey, sortAsc]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }, [sortKey]);

  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [sectorFilter, debouncedQuery, sortKey, sortAsc, virtualizer]);

  const gridCols = "grid-cols-[100px_220px_140px_90px_70px_90px_90px_1fr]";

  function SortHeader({ label, colKey }: { label: string; colKey: SortKey }) {
    const active = sortKey === colKey;
    return (
      <button
        className={`flex items-center gap-1 px-4 py-3 text-left text-xs uppercase tracking-wide cursor-pointer transition-colors select-none ${
          active ? "text-accent font-semibold" : "text-text-secondary hover:text-text-primary"
        }`}
        onClick={() => handleSort(colKey)}
        aria-sort={active ? (sortAsc ? "ascending" : "descending") : "none"}
      >
        {label}
        {active && <span aria-hidden="true">{sortAsc ? "↑" : "↓"}</span>}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari saham..."
              aria-label="Cari saham berdasarkan ticker atau nama"
              className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 depth-shadow transition-all"
            />
          </div>
          <span className="text-xs text-text-secondary tabular-nums font-medium bg-bg-card depth-shadow px-3 py-2 rounded-lg">{filtered.length} saham</span>
        </div>

        {/* Sector pills */}
        <div className="relative">
          <div
            ref={pillsRef}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            <button
              onClick={() => setSectorFilter("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all press-scale ${
                sectorFilter === "all"
                  ? "bg-accent text-white shadow-sm"
                  : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/30"
              }`}
            >
              Semua
            </button>
            {sectors.map((sector) => (
              <button
                key={sector}
                onClick={() => setSectorFilter(sector)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all press-scale ${
                  sectorFilter === sector
                    ? "bg-accent text-white shadow-sm"
                    : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/30"
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-bg-primary to-transparent sm:hidden" aria-hidden="true" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl depth-shadow relative border border-border/60">
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-primary to-transparent md:hidden z-10" />
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className={`glass-header sticky top-0 z-20 grid ${gridCols} min-w-[900px] border-b border-border/80`}>
            <SortHeader label="Ticker" colKey="ticker" />
            <SortHeader label="Name" colKey="name" />
            <SortHeader label="Sector" colKey="sector" />
            <div className="px-4 py-3 text-right text-xs uppercase tracking-wide text-text-secondary">Price</div>
            <div className="px-4 py-3 text-right text-xs uppercase tracking-wide text-text-secondary">7D</div>
            <SortHeader label="Change" colKey="changePercent" />
            <SortHeader label="Volume" colKey="volume" />
            <SortHeader label="RSI" colKey="rsi14" />
          </div>

          {/* Virtual rows */}
          <div
            className="relative min-w-[900px]"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const stock = filtered[virtualRow.index];
              const bigMove = stock.changePercent !== null && Math.abs(stock.changePercent) > 2;
              return (
                <div
                  key={stock.ticker}
                  data-index={virtualRow.index}
                  className={`absolute top-0 left-0 w-full grid ${gridCols} items-center border-b border-border/50 cursor-pointer transition-all duration-100 ${
                    virtualRow.index % 2 === 0 ? "bg-bg-card/30" : ""
                  } hover:bg-accent/[0.04]`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => { window.location.href = `/stocks/${stock.ticker}`; }}
                >
                  <div className="px-4 py-3">
                    <Link href={`/stocks/${stock.ticker}`} className="font-semibold text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                      {stripJk(stock.ticker)}
                    </Link>
                  </div>
                  <div className="px-4 py-3 text-text-secondary truncate">
                    <Link href={`/stocks/${stock.ticker}`} onClick={(e) => e.stopPropagation()}>{stock.name}</Link>
                    {stock.listingBoard && stock.listingBoard !== "Utama" && (
                      <ListingBoardBadge board={stock.listingBoard} />
                    )}
                  </div>
                  <div className="px-4 py-3 text-text-secondary text-xs">{stock.sector}</div>
                  <div className="px-4 py-3 text-right font-mono tabular-nums font-medium">
                    {stock.close !== null ? formatPrice(stock.close) : "—"}
                  </div>
                  <div className="px-4 py-3 text-right">
                    {sparklines?.[stock.ticker] && sparklines[stock.ticker].length >= 2 && (
                      <Sparkline
                        data={sparklines[stock.ticker]}
                        positive={(stock.changePercent ?? 0) >= 0}
                      />
                    )}
                  </div>
                  <div className={`px-4 py-3 text-right font-mono tabular-nums font-medium ${changeColor(stock.changePercent)} ${bigMove ? (stock.changePercent! > 0 ? "bg-bullish/[0.06]" : "bg-bearish/[0.06]") : ""}`}>
                    {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
                  </div>
                  <div className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {stock.volume !== null ? formatVolume(stock.volume) : "—"}
                  </div>
                  <div className="px-4 py-3 text-right font-mono tabular-nums">
                    {stock.rsi14 !== null ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-medium ${rsiColor(stock.rsi14)}`}>{stock.rsi14.toFixed(1)}</span>
                        <div className="w-14 h-1.5 bg-bg-hover rounded-full overflow-hidden relative">
                          <div className="absolute inset-0 flex">
                            <div className="w-[30%] bg-bullish/[0.08]" />
                            <div className="flex-1" />
                            <div className="w-[30%] bg-bearish/[0.08]" />
                          </div>
                          <div
                            className={`absolute top-0 h-full rounded-full ${rsiBgColor(stock.rsi14)} transition-all duration-300`}
                            style={{ width: "6px", left: `calc(${Math.min(Math.max(stock.rsi14, 4), 92)}% - 3px)` }}
                          />
                        </div>
                      </div>
                    ) : "—"}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-text-tertiary py-20">
                Tidak ada saham ditemukan
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
