"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StockLogo } from "@/components/stock/stock-logo";
import Link from "next/link";

interface VisitorState {
  firstVisitAt: number;
  totalPageViews: number;
  stockVisits: Record<string, number>;
  lastVisitedTickers: string[];
  lastVisitAt: number;
  dismissedSheetAt: number | null;
}

const VISITOR_KEY = "teknikal:visitor";
const DISMISSED_KEY = "teknikal:welcome_dismissed";

function stripJkSuffix(ticker: string): string {
  return ticker.replace(/\.JK$/i, "");
}

export function WelcomeBackBanner() {
  const { status } = useSession();
  const [visible, setVisible] = useState(false);
  const [ticker, setTicker] = useState<string | null>(null);
  const [delta, setDelta] = useState<{ text: string } | null>(null);

  useEffect(() => {
    if (status === "authenticated") return;

    try {
      // ret-qw2: snooze per-hari-bursa (WIB) — bukan mati permanen lagi
      const wibToday = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
      if (localStorage.getItem(DISMISSED_KEY) === wibToday) return;

      const raw = localStorage.getItem(VISITOR_KEY);
      if (!raw) return;

      const visitor: VisitorState = JSON.parse(raw);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      // Must be a returning visitor (first visit > 24h ago)
      if (!visitor.firstVisitAt || now - visitor.firstVisitAt < twentyFourHours) return;

      // ret-qw2: prioritas guest_watchlist (memori aktif), lalu kunjungan terakhir
      const watched: string[] = JSON.parse(localStorage.getItem("guest_watchlist") ?? "[]");
      const candidates = Array.from(new Set([...watched, ...(visitor.lastVisitedTickers ?? [])]));
      if (!candidates.length) return;

      setTicker(candidates[0]);
      setVisible(true);

      // ret-qw2: delta semalam nyata (sinyal berbalik/cross/lonjakan) via mode publik
      const q = candidates.slice(0, 15).map(encodeURIComponent).join(",");
      fetch(`/api/me/morning-delta?tickers=${q}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const b = j?.data?.bullets?.[0];
          if (b?.text) setDelta({ text: b.text });
        })
        .catch(() => {});
    } catch {
      // localStorage unavailable or parse error — silently skip
    }
  }, [status]);

  if (!visible || !ticker) return null;

  const displayTicker = stripJkSuffix(ticker);

  return (
    <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
          <StockLogo name="" ticker={ticker} size={30} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-text-secondary truncate">
            {delta ? "Kabar pantauanmu:" : "Selamat datang kembali! Terakhir Anda melihat"}{" "}
            <span className="font-mono font-semibold text-text-primary tabular-nums">{displayTicker}</span>
          </p>
          {delta && (
            <p className="text-[13px] text-text-primary font-medium truncate">{delta.text}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={`/stocks/${ticker}`}
          className="text-xs font-semibold text-accent hover:underline whitespace-nowrap"
        >
          Lihat {displayTicker}
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              // ret-qw2: snooze sampai besok (hari-bursa WIB), bukan permanen
              const wibToday = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
              localStorage.setItem(DISMISSED_KEY, wibToday);
            } catch {
              // Silently ignore if localStorage is unavailable
            }
            setVisible(false);
          }}
          className="shrink-0 p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-accent/5 transition-colors"
          aria-label="Tutup"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
