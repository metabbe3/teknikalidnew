"use client";

// LivePrice — keeps every rendered stock price fresh (default: 60s poll) during
// market hours by hydrating a server-rendered EOD value with live quote data.
//
// Usage (server component):
//   <p data-live-price="BBCA.JK">{formatPrice(close)}</p>
//   <p data-live-percent="BBCA.JK">{formatPercent(pct)}</p>
//   <LivePrice />   {/* once per page — it patches ALL data-live-price els */}
//
// Behaviour:
//   - polls /api/live-quotes for every distinct ticker found in the DOM
//   - only updates elements whose data matches the current render (no layout
//     thrash; textContent swap only)
//   - graceful: if the API fails, server-rendered EOD values stay visible
//   - pauses when the tab is hidden (visibilitychange)

import { useEffect, useRef } from "react";

interface QuoteRow {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
}

const fmtID = (n: number, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("id-ID", opts).format(n);

function formatPrice(n: number, isIndex = false): string {
  if (isIndex) return fmtID(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Rp${fmtID(n, { maximumFractionDigits: 0 })}`;
}

function formatPercent(n: number): string {
  const s = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(n);
  return `${s}%`;
}

export default function LivePrice({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (typeof document === "undefined" || document.hidden) return;
      const priceEls = Array.from(document.querySelectorAll<HTMLElement>("[data-live-price]"));
      const pctEls = Array.from(document.querySelectorAll<HTMLElement>("[data-live-percent]"));
      const tickers = [
        ...new Set(
          [...priceEls, ...pctEls]
            .map((el) => el.getAttribute("data-live-price") ?? el.getAttribute("data-live-percent"))
            .filter((t): t is string => Boolean(t))
        ),
      ];
      if (tickers.length === 0) return;

      try {
        const res = await fetch(`/api/live-quotes?s=${encodeURIComponent(tickers.join(","))}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { quotes: QuoteRow[] };
        if (cancelled || !Array.isArray(data.quotes)) return;
        const byTicker = new Map(data.quotes.map((q) => [q.ticker, q]));

        for (const el of priceEls) {
          const t = el.getAttribute("data-live-price");
          const q = t ? byTicker.get(t) : undefined;
          const isIndex = Boolean(t && t.startsWith("^"));
          const fmt = (n: number) => formatPrice(n, isIndex);
          if (q?.price != null && el.textContent !== fmt(q.price)) {
            el.textContent = fmt(q.price);
            el.setAttribute("data-live-state", "live");
          }
        }
        for (const el of pctEls) {
          const t = el.getAttribute("data-live-percent");
          const q = t ? byTicker.get(t) : undefined;
          if (q?.changePercent != null) {
            const next = formatPercent(q.changePercent);
            if (el.textContent !== next) el.textContent = next;
            el.classList.toggle("text-bullish", q.changePercent > 0);
            el.classList.toggle("text-bearish", q.changePercent < 0);
          }
        }
      } catch {
        // network hiccup — keep server-rendered values, retry next tick
      }
    }

    refresh();
    timer.current = setInterval(refresh, intervalMs);
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);

  return null;
}
