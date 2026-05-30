"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatPercent, stripJk, changeColor, formatVolume, rsiColor } from "@/lib/utils";

interface ScreenerStock {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  sma20: number | null;
}

export function ScreenerResults() {
  const searchParams = useSearchParams();
  const preset = searchParams.get("preset");
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!preset) { setStocks([]); return; }
    setLoading(true);
    fetch(`/api/screener?preset=${preset}`)
      .then((r) => r.json())
      .then((data) => { setStocks(Array.isArray(data) ? data : []); })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, [preset]);

  if (!preset) return null;
  if (loading) return (
    <div className="text-center py-12 flex items-center justify-center gap-2 text-text-tertiary text-sm">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      Loading results...
    </div>
  );
  if (stocks.length === 0) return (
    <div className="card-gradient depth-shadow rounded-xl p-8 text-center border border-border">
      <p className="text-text-secondary text-sm">No stocks match this filter.</p>
      <p className="text-text-tertiary text-xs mt-1">Try a different preset or check back later.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">Results</h2>
        <span className="text-xs text-text-tertiary font-medium tabular-nums">{stocks.length} stock{stocks.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto rounded-xl depth-shadow-strong bg-bg-card relative">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" aria-hidden="true" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-tertiary text-[11px] uppercase tracking-wider">
              <th className="px-4 py-3 text-left font-medium">Ticker</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Sector</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Change</th>
              <th className="px-4 py-3 text-right font-medium">Volume</th>
              <th className="px-4 py-3 text-right font-medium">RSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {stocks.map((stock, i) => (
              <tr key={stock.ticker} className={`transition-colors cursor-pointer ${i % 2 === 0 ? "bg-bg-card/40" : ""} hover:bg-accent/[0.04]`}
                  onClick={() => window.location.href = `/stocks/${stock.ticker}`}>
                <td className="px-4 py-3">
                  <Link href={`/stocks/${stock.ticker}`} className="font-semibold text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                    {stripJk(stock.ticker)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]">{stock.name}</td>
                <td className="px-4 py-3 text-text-tertiary text-xs">{stock.sector}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{stock.close !== null ? formatPrice(stock.close) : "—"}</td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums ${changeColor(stock.changePercent)}`}>
                  {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                  {stock.volume !== null ? formatVolume(stock.volume) : "—"}
                </td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums ${rsiColor(stock.rsi14)}`}>
                  {stock.rsi14 !== null ? stock.rsi14.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
