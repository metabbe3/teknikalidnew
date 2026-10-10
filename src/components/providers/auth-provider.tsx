"use client";

/**
 * AuthProvider + guest-migration hook (Retention Loop v1 — PRD idea-2026-10-09-1, AC3).
 * Saat guest berubah menjadi authenticated (login ATAU register via complete-profile),
 * guest_watchlist (localStorage) dimigrasikan ke Watchlist DB:
 *   POST /api/watchlist/batch {tickers} — skipDuplicates:true = dedupe @@unique(userId,stockTicker).
 * Migrasi idempotent (guard flag per userId), sekali jalan, lalu localStorage dibersihkan.
 */
import { useEffect, useRef } from "react";
import { useSession, SessionProvider } from "next-auth/react";
import { readGuestWatchlist, clearGuestWatchlist } from "@/lib/guest-storage";

const MIGRATED_FLAG_KEY = "teknikal_guest_watchlist_migrated";

function GuestWatchlistMigrator() {
  const { data: session, status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || done.current) return;

    let tickers: string[] = [];
    try {
      tickers = readGuestWatchlist();
    } catch {
      tickers = [];
    }

    let alreadyMigrated = false;
    try {
      alreadyMigrated = window.localStorage.getItem(MIGRATED_FLAG_KEY) === session.user.id;
    } catch {
      alreadyMigrated = false;
    }

    if (tickers.length === 0 || alreadyMigrated) {
      // tidak ada yang perlu dimigrasikan (atau sudah) — bersihkan sisa flag lama
      if (tickers.length === 0 && alreadyMigrated) clearGuestWatchlist();
      return;
    }

    done.current = true;
    (async () => {
      try {
        await fetch("/api/watchlist/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickers }),
        });
        clearGuestWatchlist();
        window.localStorage.setItem(MIGRATED_FLAG_KEY, session.user!.id!);
        window.dispatchEvent(new CustomEvent("teknikal:guest-watchlist-updated", { detail: [] }));
      } catch {
        // jaringan gagal — localStorage TIDAK dibersihkan, migrasi dicoba lagi login berikutnya
        done.current = false;
      }
    })();
  }, [status, session]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchWhenOffline={false}
      refetchOnWindowFocus={false}
    >
      <GuestWatchlistMigrator />
      {children}
    </SessionProvider>
  );
}
