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

// Freshness engine — trust badge: user harus tahu angka itu live atau EOD beku.
// Patch [data-live-fresh] jadi "live · X dtk" saat pasar buka + data hidup,
// restore teks EOD (data-fresh-eod) saat tutup/weekend/gagal.
let lastLiveTs: number | null = null;

function wibNow(): Date {
  // WIB (UTC+7), locale-agnostic — offset lokal apapun.
  return new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
}

function isMarketHoursWib(): boolean {
  const d = wibNow();
  const day = d.getDay();
  const h = d.getHours();
  const m = d.getMinutes();
  return day >= 1 && day <= 5 && h >= 9 && (h < 16 || (h === 16 && m <= 15));
}

function fmtAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} dtk`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt`;
  return `${Math.floor(s / 3600)} jam`;
}

function updateFreshEls() {
  for (const el of document.querySelectorAll<HTMLElement>("[data-live-fresh]")) {
    if (isMarketHoursWib() && lastLiveTs !== null) {
      el.textContent = `live · ${fmtAge(Date.now() - lastLiveTs)}`;
      el.classList.add("text-emerald-600");
      el.classList.remove("text-text-tertiary");
    } else {
      el.textContent = el.getAttribute("data-fresh-eod") ?? el.textContent;
      el.classList.remove("text-emerald-600");
      el.classList.add("text-text-tertiary");
    }
  }
}

export default function LivePrice({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (typeof document === "undefined") return;
      // Weekend: pasar tutup — jangan poll (harga EOD beku, kayak TradingView
      // yang freeze saat closed; hemat request server + client).
      const day = new Date().getDay();
      if (!document.hidden && day !== 0 && day !== 6) {
        const priceEls = Array.from(document.querySelectorAll<HTMLElement>("[data-live-price]"));
        const pctEls = Array.from(document.querySelectorAll<HTMLElement>("[data-live-percent]"));
        const tickers = [
          ...new Set(
            [...priceEls, ...pctEls]
              .map((el) => el.getAttribute("data-live-price") ?? el.getAttribute("data-live-percent"))
              .filter((t): t is string => Boolean(t))
          ),
        ];

        if (tickers.length > 0) {
          try {
            const res = await fetch(`/api/live-quotes?s=${encodeURIComponent(tickers.join(","))}`, {
              cache: "no-store",
            });
            if (!res.ok || cancelled) {
              updateFreshEls();
              return;
            }
            const data = (await res.json()) as { quotes: QuoteRow[] };
            if (!Array.isArray(data.quotes)) {
              updateFreshEls();
              return;
            }
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
            lastLiveTs = Date.now();
          } catch {
            // network hiccup — keep server-rendered values, retry next tick
          }
        }
      }
      // Selalu di akhir (di luar try): badge umur/EOD jujur tiap interval,
      // meski poll di-skip (weekend/hidden/tanpa ticker) atau fetch gagal.
      updateFreshEls();
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
