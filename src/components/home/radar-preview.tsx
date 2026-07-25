"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { stripJk, formatPrice } from "@/lib/utils";

interface RadarStock {
  ticker: string;
  name: string;
  close: number | null;
  changePercent: number | null;
  rsi14: number | null;
  stochK: number | null;
  isDeepOversold: boolean;
  hasVolumeSpike: boolean;
}

export function RadarPreview() {
  const [stocks, setStocks] = useState<RadarStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stocks/radar")
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data?.data) ? data.data.slice(0, 4) : [];
        setStocks(items);
      })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="preview-panel" style={{ borderTop: "3px solid var(--color-accent)" }}>
      <div className="preview-panel-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-primary">Radar Pantulan</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">Saham oversold dengan potensi rebound</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-bullish animate-pulse" aria-hidden="true" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        )}
        {!loading && stocks.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-8">
            Belum ada saham oversold saat ini
          </p>
        )}
        {!loading && stocks.map((s) => (
          <Link
            key={s.ticker}
            href={`/stocks/${s.ticker}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold font-mono tabular-nums">{stripJk(s.ticker)}</span>
              <div className="flex gap-1">
                {s.isDeepOversold && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-bearish text-white">
                    Deep
                  </span>
                )}
                {s.hasVolumeSpike && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning-bg text-warning border border-warning/25">
                    Vol↑
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              {s.rsi14 != null && (
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                  s.rsi14 <= 20 ? "bg-bearish-bg text-bearish" : "bg-bg-hover text-text-secondary"
                }`}>
                  RSI {s.rsi14.toFixed(0)}
                </span>
              )}
              {s.close != null && (
                <span className="text-xs font-medium font-mono">{formatPrice(s.close)}</span>
              )}
            </div>
          </Link>
        ))}

        {/* CTA */}
        <Link
          href="/screener"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-text-primary text-white text-xs font-semibold hover:bg-text-primary/80 transition-colors press-scale"
        >
          Lihat semua saham oversold
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
