"use client";

/**
 * GuestWatchlistPanel — panel 'Pantauan perangkat ini' di /stocks (PRD idea-2026-10-19-2 / task prd-2026-10-22-02).
 * Guest-only (render hanya saat unauthenticated — gate di page.tsx server-side).
 * Item = ticker + close + chg% via /api/live-quotes (endpoint existing yang juga
 * dipakai GuestWatchlistView /watchlist — BUKAN compute movers/breadth baru;
 * market-snapshot.service SATU PINTU tetap tunggal utk movers/breadth/IHSG).
 * SSR-safe: null sampai mounted; lazy no-op (0 work di first paint).
 */
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useGuestWatchlist } from "@/hooks/use-guest-watchlist";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";

type GuestQuote = { ticker: string; price: number | null; changePercent: number | null };

export function GuestWatchlistPanel() {
  const { tickers, toggle, mounted } = useGuestWatchlist();
  const [quotes, setQuotes] = useState<GuestQuote[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch quotes pasca-mount (subscribe-style; setState hanya di callback async,
  // bukan langsung di body effect — react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!mounted || tickers.length === 0) return;
    let cancelled = false;
    const p = fetch(`/api/live-quotes?s=${encodeURIComponent(tickers.join(","))}`)
      .then((res) => res.json())
      .then((data: { quotes?: GuestQuote[] }) => {
        if (cancelled) return;
        setQuotes(data.quotes ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    void p;
    // marker loading untuk render pertama batch ini — di-set via microtask agar
    // tidak sync-setState di body effect
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, tickers]);

  if (!mounted) return null;
  if (tickers.length === 0) return null; // tak ada star = tak ada panel (noise-zero utk visitor baru)

  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q]));

  return (
    <section
      aria-label="Pantauan perangkat ini"
      className="rounded-xl border border-border bg-bg-card depth-shadow"
      data-engagement="guest_watchlist_panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Pantauan perangkat ini</h2>
          <p className="text-xs text-text-tertiary">
            {tickers.length} emiten dipantau di perangkat ini — tanpa akun.
          </p>
        </div>
        <Link
          href="/auth/register"
          data-engagement="cta_register_guest_panel"
          className="press-scale inline-flex items-center gap-1 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          Simpan permanen + lintas perangkat
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {tickers.map((ticker, i) => {
          const quote = quoteByTicker.get(ticker);
          return (
            <div
              key={ticker}
              style={{ "--stagger-i": i } as CSSProperties}
              className="flex min-h-11 items-start justify-between gap-2 rounded-lg bg-bg-hover/60 px-3 py-2 transition-colors hover:bg-bg-hover"
            >
              <div className="min-w-0">
                <Link
                  href={`/stocks/${ticker}`}
                  className="block truncate text-xs font-semibold text-text-primary hover:text-accent transition-colors"
                >
                  {stripJk(ticker)}
                </Link>
                {loading || !quote ? (
                  <span className="block h-3 w-16 animate-pulse rounded bg-bg-hover" aria-hidden="true" />
                ) : (
                  <span className="block truncate text-[11px] font-mono tabular-nums text-text-secondary">
                    {quote.price != null ? formatPrice(quote.price) : "---"}
                    {quote.changePercent != null && (
                      <span className={`ml-1.5 ${changeColor(quote.changePercent)}`}>
                        {formatPercent(quote.changePercent)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <button
                onClick={() => toggle(ticker)}
                className="press-scale flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center p-2 text-accent"
                aria-label={`Hapus ${ticker} dari pantauan`}
                title="Hapus dari pantauan perangkat ini"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
