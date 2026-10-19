"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { stripJk, changeColor, formatPercentPlain } from "@/lib/utils";

interface TickerItem {
  ticker: string;
  changePercent: number | null;
}

interface MoversPollPayload {
  gainers?: { ticker: string; changePercent: number | null }[];
  losers?: { ticker: string; changePercent: number | null }[];
}

/**
 * TickerTape — marquee saham ramai (top gainers + losers dari market-snapshot,
 * satu pintu doctrine). Ref 19 Okt: (1) tanda minus sebelumnya hilang
 * (formatter Math.abs + prefix kosong untuk nilai negatif) — sekarang "+"/"−"
 * eksplisit; (2) angka auto-refresh tiap 60s via /api/market yang sudah ada
 * (server cache TTL 60s — poll hanya membaca cache, murah), hanya saat tab
 * aktif; gagal fetch = tetap pakai data terakhir yang baik.
 */
export function TickerTape({ items }: { items: TickerItem[] }) {
  const [display, setDisplay] = useState<TickerItem[]>(() =>
    items.filter((s) => s.changePercent !== null)
  );

  useEffect(() => {
    setDisplay(items.filter((s) => s.changePercent !== null));
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const tick = async () => {
      if (document.hidden || cancelled) return;
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as MoversPollPayload;
        const merged = [...(data.gainers ?? []), ...(data.losers ?? [])].filter(
          (s) => typeof s.changePercent === "number"
        );
        if (!cancelled && merged.length > 0) setDisplay(merged);
      } catch {
        // silent — keep last good tape
      }
    };
    const id = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (display.length === 0 && items.length === 0) return null;
  const source = display.length > 0 ? display : items.filter((s) => s.changePercent !== null);

  const renderItems = (list: TickerItem[], keyPrefix: string, hidden: boolean) => (
    <div className="ticker-tape-inner" aria-hidden={hidden}>
      {list.map((s, i) => (
        <Link
          key={`${keyPrefix}-${s.ticker}-${i}`}
          href={`/stocks/${s.ticker}`}
          className="ticker-item"
          tabIndex={hidden ? -1 : undefined}
        >
          <span className="text-gray-400 font-semibold">{stripJk(s.ticker)}</span>
          {s.changePercent !== null && (
            <span className={changeColor(s.changePercent)}>
              {s.changePercent >= 0 ? "+" : "−"}
              {formatPercentPlain(s.changePercent)}%
            </span>
          )}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="ticker-tape" aria-label="Stock ticker">
      {renderItems(source, "t", false)}
      {renderItems(source, "dup", true)}
    </div>
  );
}
