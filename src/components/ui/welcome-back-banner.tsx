"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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

  useEffect(() => {
    if (status === "authenticated") return;

    try {
      // Check if banner was previously dismissed
      if (localStorage.getItem(DISMISSED_KEY)) return;

      const raw = localStorage.getItem(VISITOR_KEY);
      if (!raw) return;

      const visitor: VisitorState = JSON.parse(raw);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      // Must be a returning visitor (first visit > 24h ago)
      if (!visitor.firstVisitAt || now - visitor.firstVisitAt < twentyFourHours) return;

      // Must have at least one visited ticker
      if (!visitor.lastVisitedTickers?.length) return;

      setTicker(visitor.lastVisitedTickers[0]);
      setVisible(true);
    } catch {
      // localStorage unavailable or parse error — silently skip
    }
  }, [status]);

  if (!visible || !ticker) return null;

  const displayTicker = stripJkSuffix(ticker);

  return (
    <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-accent"
          >
            <path
              fillRule="evenodd"
              d="M17 4.25A2.25 2.25 0 0014.75 2h-9.5A2.25 2.25 0 003 4.25v11.5A2.25 2.25 0 005.25 17.75h9.5A2.25 2.25 0 0017 15.75V4.25zm-7 2.5a.75.75 0 01.75.75v3.69l1.22-1.22a.75.75 0 111.06 1.06l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06l1.22 1.22V7.5a.75.75 0 01.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-sm text-text-secondary truncate">
          Selamat datang kembali! Terakhir Anda melihat{" "}
          <span className="font-semibold text-text-primary">{displayTicker}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={`/stocks/${ticker}`}
          className="text-xs font-semibold text-accent hover:underline whitespace-nowrap"
        >
          Lihat {displayTicker}
        </Link>
        <Link
          href="/auth/signin"
          className="text-xs font-medium text-text-tertiary hover:text-text-secondary whitespace-nowrap"
        >
          Daftar untuk menyimpan pantauan
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(DISMISSED_KEY, "1");
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
