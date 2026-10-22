"use client";

/**
 * GuestWatchlistView — render watchlist guest (localStorage), Retention Loop v1.
 * Dipakai di /watchlist untuk pengunjung tanpa akun; user login tetap jalur DB di page.tsx.
 * SSR-safe: hook return mounted=false pra-hidrasi, render null sampai mounted.
 */
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useGuestWatchlist } from "@/hooks/use-guest-watchlist";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";

type GuestQuote = {
  ticker: string;
  price: number | null;
  changePercent: number | null;
};

export function GuestWatchlistView() {
  const { tickers, toggle, mounted } = useGuestWatchlist();
  const [quotes, setQuotes] = useState<GuestQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tickers.length === 0) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/live-quotes?s=${tickers.join(",")}`)
      .then((res) => res.json())
      .then((data: { quotes?: GuestQuote[] }) => {
        if (cancelled) return;
        setQuotes(data.quotes ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tickers]);

  if (!mounted) return null;

  if (tickers.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-bg-hover flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <p className="text-text-secondary text-sm">
          Belum ada saham yang dipantau di perangkat ini.
        </p>
        <Link
          href="/stocks"
          className="inline-block bg-text-primary text-white rounded-lg px-4 py-2 text-xs font-semibold"
        >
          Cari saham
        </Link>
        <p className="text-xs text-text-tertiary">
          Ketuk ikon bintang di halaman saham untuk memantau — tanpa perlu akun.
        </p>
      </div>
    );
  }

  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q]));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-grid">
        {tickers.map((ticker, i) => {
          const quote = quoteByTicker.get(ticker);
          return (
            <div
              key={ticker}
              style={{ "--stagger-i": i } as CSSProperties}
              className="bg-bg-card depth-shadow rounded-xl p-4 hover:depth-shadow-hover transition-all duration-200"
            >
              {loading || !quote ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-16 rounded bg-bg-hover" />
                  <div className="h-3 w-24 rounded bg-bg-hover" />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={`/stocks/${ticker}`}
                      className="font-semibold hover:text-accent transition-colors"
                    >
                      {stripJk(ticker)}
                    </a>
                    <p data-live-price={ticker} className="font-semibold font-mono text-sm tabular-nums">
                      {quote.price != null ? formatPrice(quote.price) : "---"}
                    </p>
                    {quote.changePercent != null && (
                      <p data-live-percent={ticker} className={`text-xs font-mono tabular-nums ${changeColor(quote.changePercent)}`}>
                        {formatPercent(quote.changePercent)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(ticker)}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2.5 text-accent cursor-pointer press-scale"
                    aria-label={`Hapus ${ticker} dari pantauan`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-text-secondary">
        Tersimpan di perangkat ini.{" "}
        <Link href="/auth/signin" className="text-accent hover:underline">
          Masuk untuk menyimpan permanen
        </Link>
      </p>
    </div>
  );
}
