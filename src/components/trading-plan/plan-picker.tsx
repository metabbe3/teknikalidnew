"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IDX_STOCKS } from "@/lib/constants";

interface Props {
  selected: string[];
  onChange?: (tickers: string[]) => void;
  maxStocks?: number;
}

/**
 * Multi-picker saham untuk Trading Plan:
 * - ketik ticker ATAU nama → dropdown saran (IDX_STOCKS)
 * - klik saran atau Enter → tambah chip
 * - chip bisa dihapus satu-satu
 * - sinkron ke URL ?t=A?t=B sehingga bisa di-share / bookmark
 */
export function TradingPlanPicker({ selected, onChange, maxStocks = 6 }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = IDX_STOCKS.filter(
    (s) =>
      !selected.includes(s.ticker) &&
      (q === "" ||
        s.ticker.toLowerCase().replace(/\.jk$/, "").includes(q) ||
        s.name.toLowerCase().includes(q)),
  ).slice(0, 8);

  const apply = useCallback(
    (next: string[]) => {
      if (onChange) { onChange(next); return; }
      const qs = next.map((t) => `t=${encodeURIComponent(t.replace(/\.JK$/, ""))}`).join("&");
      router.push(qs ? `/trading-plan?${qs}` : "/trading-plan", { scroll: false });
    },
    [onChange, router],
  );

  const add = (ticker: string) => {
    if (selected.length >= maxStocks || selected.includes(ticker)) return;
    apply([...selected, ticker]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (ticker: string) => apply(selected.filter((t) => t !== ticker));

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const exact = IDX_STOCKS.find(
        (s) => s.ticker.replace(/\.jk$/, "").toLowerCase() === q || s.ticker.toLowerCase() === q,
      );
      const pick = exact ?? filtered[0];
      if (pick) add(pick.ticker);
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((ticker) => {
            const stock = IDX_STOCKS.find((s) => s.ticker === ticker);
            return (
              <span
                key={ticker}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-bg-card border border-border depth-shadow"
              >
                <span className="text-sm font-mono font-bold text-text-primary">
                  {ticker.replace(/\.JK$/, "")}
                </span>
                <span className="text-xs text-text-tertiary hidden sm:inline max-w-[110px] truncate">
                  {stock?.name}
                </span>
                <button
                  onClick={() => remove(ticker)}
                  aria-label={`Hapus ${ticker}`}
                  className="p-2 rounded-lg text-text-tertiary hover:text-bearish hover:bg-bearish/10 transition-colors cursor-pointer"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {selected.length < maxStocks ? (
        <div className="relative" ref={boxRef}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder={`Cari saham (ticker atau nama) — maks ${maxStocks}…`}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-bg-card depth-shadow-strong rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/40 transition-all"
            aria-label="Cari saham untuk trading plan"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-bg-card depth-shadow-strong rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => add(s.ticker)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-cyan-50/50 transition-colors text-left"
                >
                  <span className="text-xs font-bold font-mono text-cyan-600 min-w-[56px]">
                    {s.ticker.replace(/\.JK$/, "")}
                  </span>
                  <span className="text-xs text-text-secondary truncate">{s.name}</span>
                  <span className="text-[10px] font-medium text-text-tertiary ml-auto whitespace-nowrap px-1.5 py-0.5 rounded bg-bg-hover">
                    {s.sector}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-text-tertiary text-center">Maksimal {maxStocks} saham sekaligus</p>
      )}
    </div>
  );
}
