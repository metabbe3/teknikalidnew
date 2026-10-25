"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StockLogo } from "@/components/stock/stock-logo";
import { formatPercentPlain, formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { HealthScoreBadge } from "@/components/stock/health-score-badge";
import { Sparkline } from "@/components/stock/sparkline";
import { StockAiModal } from "@/components/stock/stock-ai-modal";
import type { StockRow } from "@/components/stock/stock-table";
import { Sparkles } from "lucide-react";

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
  const router = useRouter();
  const [aiOpen, setAiOpen] = useState(false);
  const isPositive = changePercent !== null && changePercent >= 0;
  const colorAccent = changePercent === null ? "" : isPositive ? "card-bullish" : "card-bearish";
  const bgTint = changePercent === null ? "bg-bg-card" : isPositive ? "bg-bullish/[0.02]" : "bg-bearish/[0.02]";

  return (
    <>
    <div className="relative">
    <Link
      href={`/stocks/${ticker}`}
      prefetch={false}
      className={`block rounded-xl ${bgTint} depth-shadow p-4 hover:depth-shadow-hover transition-all duration-200 press-scale ${colorAccent}`}
      aria-label={`${stripJk(ticker)} — ${name}, ${close !== null ? formatPrice(close) : "no price"}${changePercent !== null ? `, ${changePercent >= 0 ? "+" : "-"}${formatPercentPlain(changePercent)}%` : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm tracking-tight">{stripJk(ticker)}</p>
            {signalLabel && (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${SIGNAL_STYLES[signalLabel] ?? "bg-gray-200 text-gray-500"}`}>
                {signalLabel === "Strong Bullish" ? "▲▲" : signalLabel === "Bullish" ? "▲" : signalLabel === "Strong Bearish" ? "▼▼" : signalLabel === "Bearish" ? "▼" : "◆"}
              </span>
            )}
            {isGorengan && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">!</span>
            )}
            <HealthScoreBadge signalScore={signalScore ?? null} size="sm" />
          </div>
          <p className="text-[11px] text-text-secondary truncate mt-0.5 leading-tight">{name}</p>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          {close != null ? (
            <p data-live-price={ticker} className="font-semibold text-sm tracking-tight">{formatPrice(close)}</p>
          ) : (
            <p className="font-semibold text-text-tertiary">—</p>
          )}
          {changePercent !== null && (
            <p data-live-percent={ticker} className={`text-xs font-medium mt-0.5 ${changeColor(changePercent)}`}>
              {formatPercent(changePercent)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">{sector}</span>
        <div className="flex items-center gap-1.5">
        {changePercent !== null && (
          <span className={`flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-bold ${isPositive ? "bg-bullish" : "bg-bearish"}`} aria-hidden="true">
            {isPositive ? "↑" : "↓"}
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAiOpen(true); }}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-[11px]"
          aria-label={`Analisa AI ${name}`}
          title="Analisa AI"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
        </button>
        </div>
      </div>
    </Link>
    </div>
    {aiOpen && (
      <StockAiModal ticker={ticker} name={name} onClose={() => setAiOpen(false)} />
    )}
    </>
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
  const [visibleCount, setVisibleCount] = useState(40);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = stocks.length > visibleCount;

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

  // Progressive auto-load — silent failure if IO unavailable, cleaned up on unmount
  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisibleCount((v) => v + 40);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visibleCount]);

  if (stocks.length === 0) {
    return (
      <div className="rounded-xl depth-shadow border border-border/60 text-center text-text-tertiary py-20">
        Tidak ada saham ditemukan
      </div>
    );
  }

  return (
    <>
    {hasMore && (
      <p className="text-xs text-text-tertiary mt-2">{visibleCount} dari {stocks.length} saham</p>
    )}
    <div className="rounded-xl depth-shadow border border-border/60 overflow-hidden">
      {stocks.slice(0, visibleCount).map((stock, i) => (
        <button
          key={stock.ticker}
          type="button"
          className={`block w-full text-left px-4 py-3 border-b border-border/50 last:border-b-0 active:bg-accent/[0.06] transition-colors ${
            i % 2 === 0 ? "bg-bg-card/30" : ""
          }`}
          onClick={() => router.push(`${linkBase}/${stock.ticker}`)}
        >
          {/* Layout 2-kolom sejajar (owner 20 Okt: nama & harga harus segaris di mobile,
              font dikecilkan biar nama panjang aman): kiri ticker+nama, kanan %+harga */}
          {/* Grid 2 baris eksplisit dgn line-height SERAGAM (leading-5) — baris kiri & kanan
              mulai di Y identik (fix offset harga vs nama yang terlihat di iPhone 390px) */}
          <div className="grid grid-cols-[1fr_auto] gap-x-3 items-start">
            <div className="min-w-0 leading-5 flex items-center gap-2.5">
              <StockLogo name={stock.name} ticker={stock.ticker} size={28} />
              <div className="min-w-0 leading-5">
              <div className="flex items-center gap-1.5 h-5">
                <span className="text-sm font-semibold text-accent">{stripJk(stock.ticker)}</span>
                {stock.listingBoard && stock.listingBoard !== "Utama" && (
                  <ListingBoardBadge board={stock.listingBoard} />
                )}
              </div>
              <div className="text-xs text-text-secondary truncate h-5">{stock.name}</div>
              </div>
            </div>
            <div className="text-right leading-5">
              <div className={`text-xs font-mono tabular-nums font-medium h-5 ${changeColor(stock.changePercent)}`}>
                {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
              </div>
              <div className="text-sm font-mono tabular-nums font-medium h-5">
                {stock.close !== null ? formatPrice(stock.close) : "—"}
              </div>
            </div>
          </div>
          {sparklines?.[stock.ticker] && sparklines[stock.ticker].length >= 2 && (
            <div className="mt-1 flex justify-end">
              <Sparkline data={sparklines[stock.ticker]} positive={(stock.changePercent ?? 0) >= 0} />
            </div>
          )}
        </button>
      ))}
    </div>
    {hasMore && (
      <button
        type="button"
        className="block w-full rounded-lg border border-border bg-bg-card my-3 py-3 active:bg-accent/[0.06] transition-colors"
        onClick={() => setVisibleCount((v) => v + 40)}
      >
        <span className="font-medium">Muat 40 lagi</span>{" "}
        <span className="text-sm text-text-secondary">{stocks.length - visibleCount} saham tersisa</span>
      </button>
    )}
    {hasMore && <div ref={sentinelRef} className="h-8" />}
    </>
  );
}
