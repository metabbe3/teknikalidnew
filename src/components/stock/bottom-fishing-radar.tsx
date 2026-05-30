"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatRp, formatPercent } from "@/lib/utils";

interface RadarStock {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number | null;
  rsi14: number | null;
  stochK: number | null;
  stochD: number | null;
  support1: number | null;
  isDeepOversold: boolean;
  hasVolumeSpike: boolean;
  upsideToSma20: number | null;
}

const INITIAL_SHOW = 5;

export function BottomFishingRadar() {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: stocks = [], isLoading, isError } = useQuery<RadarStock[]>({
    queryKey: ["radar"],
    queryFn: async () => {
      const res = await fetch("/api/stocks/radar");
      if (!res.ok) throw new Error("Failed to fetch radar");
      const data = await res.json();
      return data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const visibleStocks = expanded ? stocks : stocks.slice(0, INITIAL_SHOW);
  const hasMore = stocks.length > INITIAL_SHOW;

  return (
    <div className="relative bg-bg-card rounded-xl depth-shadow-strong overflow-hidden border-l-[4px] border-l-blue-500">
      {/* Decorative chart stripes */}
      <div className="absolute bottom-0 right-0 w-64 h-full opacity-[0.35] pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(59, 130, 246, 0.06) 8px, rgba(59, 130, 246, 0.06) 9px)`,
          maskImage: "linear-gradient(to right, transparent 0%, black 60%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 60%)",
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 sm:px-6 pt-5 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary font-mono uppercase tracking-wider">Radar Pantulan</h3>
              <p className="text-[10px] text-text-tertiary">Saham memasuki area oversold — tunggu konfirmasi reversal</p>
            </div>
          </div>
          {!isLoading && stocks.length > 0 && (
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 tabular-nums">
              {stocks.length} saham
            </span>
          )}
        </div>

        <div className="h-px bg-border/50" />
      </div>

      {/* Stock list — collapsible */}
      <div className="relative z-10">
        <div
          ref={contentRef}
          className={`transition-[max-height] duration-300 ease-in-out ${expanded ? "overflow-y-auto" : "overflow-hidden"}`}
          style={{ maxHeight: expanded ? "480px" : `${INITIAL_SHOW * 90}px` }}
        >
          <div className="px-5 sm:px-6 pb-2 space-y-1.5">
            {isLoading ? (
              <div className="py-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-border/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-bg-hover rounded" />
                      <div className="h-4 w-16 bg-bg-hover rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-40 bg-bg-hover rounded" />
                      <div className="h-3 w-20 bg-bg-hover rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="py-8 text-center">
                <p className="text-xs text-red-500 mb-2">Gagal memuat data radar.</p>
                <button onClick={() => window.location.reload()} className="text-xs text-blue-600 hover:underline cursor-pointer">
                  Coba lagi
                </button>
              </div>
            ) : stocks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-text-tertiary">Tidak ada saham dalam kondisi oversold saat ini.</p>
              </div>
            ) : (
              visibleStocks.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stocks/${stock.ticker}`}
                  className="block rounded-lg border border-border/40 p-3 hover:bg-bg-hover hover:border-blue-200/50 hover:-translate-y-px transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-accent group-hover:underline">{stock.ticker.replace(".JK", "")}</span>
                      <span className="text-[10px] text-text-tertiary">{stock.sector}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {stock.rsi14 !== null && (
                        <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                          stock.rsi14 <= 20 ? "bg-blue-500/15 text-blue-400" : "bg-blue-500/10 text-blue-500"
                        }`}>
                          RSI {stock.rsi14.toFixed(1)}
                        </span>
                      )}
                      {stock.stochK !== null && stock.stochD !== null && stock.stochK <= 20 && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                          Stoch {stock.stochK.toFixed(0)}/{stock.stochD.toFixed(0)}
                        </span>
                      )}
                      {stock.isDeepOversold && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                          Deep
                        </span>
                      )}
                      {stock.hasVolumeSpike && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">
                          Vol Spike
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-text-secondary truncate max-w-[60%]">{stock.name}</span>
                    <div className="flex items-center gap-2">
                      {stock.close !== null && (
                        <span className="text-[11px] font-mono font-semibold">{formatRp(stock.close)}</span>
                      )}
                      {stock.changePercent !== null && (
                        <span className={`text-[10px] font-mono font-semibold ${stock.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                          {formatPercent(stock.changePercent)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    {stock.support1 !== null && (
                      <span className="text-[10px] text-text-tertiary font-mono">
                        Support: {formatRp(stock.support1)}
                      </span>
                    )}
                    {stock.upsideToSma20 !== null && (
                      <span className="text-[10px] text-bullish font-mono font-medium">
                        +{stock.upsideToSma20.toFixed(1)}% ke SMA20
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Fade gradient when collapsed */}
        {!expanded && hasMore && (
          <div className="pointer-events-none absolute bottom-12 left-0 right-0 h-12 bg-gradient-to-t from-bg-card to-transparent" aria-hidden="true" />
        )}
      </div>

      {/* Show more / less button */}
      {hasMore && (
        <div className="relative z-10 px-5 sm:px-6 py-2.5 border-t border-border/30">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-400 transition-colors cursor-pointer py-1 press-scale"
          >
            {expanded ? (
              <span className="inline-flex items-center gap-1">
                Sembunyikan
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                Lihat Semua ({stocks.length - INITIAL_SHOW} lagi)
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="relative z-10 bg-bg-hover/60 px-5 sm:px-6 py-2.5 border-t border-border/30">
        <p className="text-[9px] text-text-tertiary leading-relaxed">
          Daftar ini bersifat edukatif berdasarkan indikator teknikal (RSI &amp; Stochastic). Bukan rekomendasi membeli. Oversold tidak selalu berarti bottom. Selalu tunggu konfirmasi reversal sebelum entry.
        </p>
      </div>
    </div>
  );
}
