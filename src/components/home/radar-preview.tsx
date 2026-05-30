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
    <div className="preview-panel depth-shadow" style={{ borderTop: "3px solid #8b5cf6" }}>
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
            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
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
              <span className="text-xs font-semibold">{stripJk(s.ticker)}</span>
              <div className="flex gap-1">
                {s.isDeepOversold && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    Deep
                  </span>
                )}
                {s.hasVolumeSpike && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                    Vol↑
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              {s.rsi14 != null && (
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                  s.rsi14 <= 20 ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700"
                }`}>
                  RSI {s.rsi14.toFixed(0)}
                </span>
              )}
              {s.close != null && (
                <span className="text-xs font-medium">{formatPrice(s.close)}</span>
              )}
            </div>
          </Link>
        ))}

        {/* CTA */}
        <Link
          href="/screener"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-violet-500 text-white text-xs font-semibold hover:bg-violet-600 transition-colors press-scale"
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
