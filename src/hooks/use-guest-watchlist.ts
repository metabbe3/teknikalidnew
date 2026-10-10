"use client";

/**
 * Guest watchlist hook (Retention Loop v1 — PRD idea-2026-10-09-1).
 * Hanya aktif untuk user UNAUTHENTICATED; user login tetap jalur Watchlist DB.
 * SSR-safe: render pertama selalu list kosong, isi dibaca di useEffect pasca-mount.
 * Lintas-komponen via CustomEvent (GUEST_WATCHLIST_EVENT) — bintang di list & detail sinkron.
 */
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  readGuestWatchlist,
  toggleGuestWatchlistTicker,
  GUEST_WATCHLIST_EVENT,
} from "@/lib/guest-storage";

export function useGuestWatchlist() {
  const { status } = useSession();
  const enabled = status === "unauthenticated";

  const [tickers, setTickers] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!enabled) return;
    setTickers(readGuestWatchlist());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setTickers(detail);
    };
    window.addEventListener(GUEST_WATCHLIST_EVENT, onChange);
    return () => window.removeEventListener(GUEST_WATCHLIST_EVENT, onChange);
  }, [enabled]);

  const toggle = useCallback(
    (ticker: string): { added: boolean } | null => {
      if (!enabled) return null;
      const result = toggleGuestWatchlistTicker(ticker);
      if (result) {
        setTickers(result.list);
        window.dispatchEvent(new CustomEvent(GUEST_WATCHLIST_EVENT, { detail: result.list }));
      }
      return result ? { added: result.added } : null;
    },
    [enabled],
  );

  return { tickers, toggle, mounted: mounted && enabled, enabled };
}
