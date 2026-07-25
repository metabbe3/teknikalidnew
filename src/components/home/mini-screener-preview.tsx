"use client";

import { useState } from "react";
import Link from "next/link";
import { stripJk, formatPrice, formatPercent, changeColor } from "@/lib/utils";

const PRESETS = [
  { key: "rsi_oversold", label: "RSI Oversold" },
  { key: "volume_spike", label: "Volume Spike" },
  { key: "golden_cross", label: "Golden Cross" },
  { key: "macd_bullish", label: "MACD Bullish" },
  { key: "hype_alert", label: "Hype Alert" },
];

interface ScreenerResult {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  changePercent: number | null;
  rsi14?: number | null;
}

export function MiniScreenerPreview() {
  const [active, setActive] = useState<string | null>(null);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handlePreset(preset: string) {
    if (active === preset) return;
    setActive(preset);
    setLoading(true);
    try {
      const res = await fetch(`/api/screener?preset=${preset}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 4) : []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="preview-panel" style={{ borderTop: "3px solid var(--color-accent)" }}>
      <div className="preview-panel-header">
        <p className="text-xs font-semibold text-text-primary">Screener Teknikal</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">Pilih strategi untuk melihat saham yang cocok</p>
      </div>
      <div className="p-4 space-y-3">
        {/* Preset pills */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                active === p.key
                  ? "bg-text-primary text-white shadow-sm"
                  : "bg-bg-card text-text-secondary border border-border hover:border-accent/40 hover:text-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="min-h-[100px]">
          {!active && (
            <p className="text-xs text-text-tertiary text-center py-8">
              Klik salah satu strategi di atas
            </p>
          )}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <Link
                  key={r.ticker}
                  href={`/stocks/${r.ticker}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold font-mono tabular-nums">{stripJk(r.ticker)}</span>
                    <span className="text-[10px] text-text-tertiary truncate max-w-[100px]">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    {r.rsi14 != null && (
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        r.rsi14 <= 30 ? "bg-bearish-bg text-bearish" : r.rsi14 <= 50 ? "bg-bg-hover text-text-secondary" : "bg-bullish-bg text-bullish"
                      }`}>
                        RSI {r.rsi14.toFixed(0)}
                      </span>
                    )}
                    <span className="text-xs font-medium font-mono">{formatPrice(r.close)}</span>
                    {r.changePercent != null && (
                      <span className={`text-[10px] font-bold font-mono ${changeColor(r.changePercent)}`}>
                        {formatPercent(r.changePercent)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!loading && active && results.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-8">
              Tidak ada saham yang cocok saat ini
            </p>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/screener"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-text-primary text-white text-xs font-semibold hover:bg-text-primary/80 transition-colors press-scale"
        >
          Lihat 30+ strategi screener
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
