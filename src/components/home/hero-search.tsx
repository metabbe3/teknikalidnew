"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { StockLogo } from "@/components/stock/stock-logo";
import type { StockRow } from "@/components/stock/stock-table";

/**
 * HeroSearch — kolom cari saham langsung di homepage hero (owner 24 Okt:
 * kurangi 1 step — user dgn ticker di kepala langsung ke halaman analisa).
 * Reuse /api/stocks (endpoint lama, cache 5 mnt server-side) — client filter
 * ticker+nama, max 8 hasil, keyboard navigasi (↑↓ Enter Esc), klik → /stocks/{tkr}.
 */

const MIN_CHARS = 1;
const MAX_RESULTS = 8;

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [all, setAll] = useState<StockRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stocks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: StockRow[]) => {
        if (!cancelled) setAll(rows);
      })
      .catch(() => {
        /* silent — search tak tersedia, kotak tetap bisa arahkan ke /stocks */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toUpperCase();
    if (!all || needle.length < MIN_CHARS) return [];
    const starts: StockRow[] = [];
    const contains: StockRow[] = [];
    for (const s of all) {
      const t = s.ticker.replace(".JK", "");
      if (t.startsWith(needle)) starts.push(s);
      else if (s.name.toUpperCase().includes(needle)) contains.push(s);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [q, all]);

  const go = (ticker: string) => {
    setOpen(false);
    router.push(`/stocks/${ticker}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (results[active]) {
        e.preventDefault();
        go(results[active].ticker);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 bg-bg-card border border-border rounded-xl px-4 py-3 shadow-sm focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition-all">
        <Search className="h-5 w-5 text-text-tertiary shrink-0" aria-hidden />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Cari saham… (mis. BBCA, GOTO)"
          aria-label="Cari saham untuk dianalisa"
          className="w-full bg-transparent text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
          autoComplete="off"
          enterKeyHint="go"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="text-text-tertiary hover:text-text-primary text-sm px-1"
            aria-label="Hapus pencarian"
          >
            ✕
          </button>
        )}
      </div>

      {open && q.trim().length >= MIN_CHARS && (
        <div
          role="listbox"
          aria-label="Hasil pencarian saham"
          className="absolute z-30 mt-2 w-full bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-text-tertiary">
              {all === null ? "Memuat daftar saham…" : `Tidak ada hasil untuk "${q}"`}
            </div>
          ) : (
            results.map((s, i) => (
              <button
                key={s.ticker}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s.ticker)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === active ? "bg-accent/10" : "hover:bg-bg-hover"
                } ${i > 0 ? "border-t border-border/50" : ""}`}
              >
                <span className="min-w-0 flex items-center gap-2.5">
                  <StockLogo name={s.name} ticker={s.ticker} size={24} />
                  <span className="min-w-0">
                  <span className="font-mono font-semibold text-sm text-text-primary">
                    {s.ticker.replace(".JK", "")}
                  </span>
                  <span className="ml-2 text-xs text-text-secondary truncate">{s.name}</span>
                  </span>
                </span>
                {s.changePercent !== null && (
                  <span
                    className={`font-mono text-xs font-medium tabular-nums shrink-0 ${
                      s.changePercent >= 0 ? "text-bullish" : "text-bearish"
                    }`}
                  >
                    {s.changePercent >= 0 ? "+" : "−"}
                    {Math.abs(s.changePercent).toFixed(2)}%
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
