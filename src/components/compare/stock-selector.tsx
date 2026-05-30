"use client";

import { useState, useRef, useEffect } from "react";
import { IDX_STOCKS } from "@/lib/constants";
import type { CompareStock } from "@/hooks/use-compare-data";
import { stripJk, formatPercent } from "@/lib/utils";

interface Props {
  selected: string[];
  onAdd: (ticker: string) => void;
  onRemove: (ticker: string) => void;
  stocks?: CompareStock[];
}

export function StockSelector({ selected, onAdd, onRemove, stocks }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = IDX_STOCKS.filter(
    (s) =>
      !selected.includes(s.ticker) &&
      (s.ticker.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())),
  ).slice(0, 8);

  const canAdd = selected.length < 4;

  return (
    <div className="space-y-3">
      {/* Selected stocks as bold chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((ticker, i) => {
            const stock = IDX_STOCKS.find((s) => s.ticker === ticker);
            const meta = stocks?.find((s) => s.ticker === ticker);
            const colors = ["#06b6d4", "#f59e0b", "#8b5cf6", "#ef4444"];
            const chipColor = meta?.color.line ?? colors[i % colors.length];

            return (
              <div
                key={ticker}
                className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-bg-card depth-shadow border border-border"
                style={{ borderLeft: `3px solid ${chipColor}` }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chipColor }} />
                <span className="text-sm font-mono font-bold text-text-primary">{stripJk(ticker)}</span>
                <span className="text-xs text-text-tertiary hidden sm:inline max-w-[100px] truncate">{stock?.name}</span>
                {meta?.changePercent != null && (
                  <span className={`text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded ${
                    meta.changePercent >= 0 ? "bg-bullish-bg text-bullish" : "bg-bearish-bg text-bearish"
                  }`}>
                    {formatPercent(meta.changePercent)}
                  </span>
                )}
                <button
                  onClick={() => onRemove(ticker)}
                  aria-label={`Hapus ${ticker}`}
                  className="ml-0.5 p-1 rounded-lg text-text-tertiary hover:text-bearish hover:bg-bearish/10 transition-colors cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search input */}
      {canAdd && (
        <div className="relative">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Cari saham (ticker atau nama)..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-bg-card depth-shadow-strong rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/40 transition-all"
            />
          </div>

          {open && filtered.length > 0 && (
            <div ref={dropdownRef} className="absolute z-20 mt-1 w-full bg-bg-card depth-shadow-strong rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
              {filtered.map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => {
                    onAdd(stock.ticker);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-cyan-50/50 transition-colors text-left"
                >
                  <span className="text-xs font-bold font-mono text-cyan-600 min-w-[56px]">{stripJk(stock.ticker)}</span>
                  <span className="text-xs text-text-secondary truncate">{stock.name}</span>
                  <span className="text-[10px] font-medium text-text-tertiary ml-auto whitespace-nowrap px-1.5 py-0.5 rounded bg-bg-hover">{stock.sector}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Max reached indicator */}
      {!canAdd && selected.length === 4 && (
        <p className="text-[10px] text-text-tertiary text-center">Maksimal 4 saham untuk perbandingan</p>
      )}
    </div>
  );
}
