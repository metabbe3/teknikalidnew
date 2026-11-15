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
  addManyGuestWatchlistTickers,
  GUEST_WATCHLIST_EVENT,
  REGISTER_PROMPT_EVENT,
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
        // Moment-of-intent (prd-2026-10-26-01) → ret-qw4 (riset retensi 2026-10-30):
        // sheet registrasi DITUNDA ke simpanan ke-3 — simpanan 1-2 justru momen rayakan,
        // bukan ditekan mendaftar (bukti: 31 akun vs 79% anonim one-shot).
        if (result.added && result.list.length >= 3) {
          window.dispatchEvent(new CustomEvent(REGISTER_PROMPT_EVENT, { detail: { source: "star_add" } }));
        }
      }
      return result ? { added: result.added } : null;
    },
    [enabled],
  );

  /** prd-2026-11-15-01 AC2: isi watchlist dari preset kurasi 1-klik (batch).
   *  Dispatch event yang sama dengan toggle agar GuestWatchlistPanel (di /stocks)
   *  dan GuestWatchlistView (/watchlist) sinkron tanpa reload. */
  const addMany = useCallback(
    (batch: string[]): { addedCount: number } | null => {
      if (!enabled) return null;
      const result = addManyGuestWatchlistTickers(batch);
      if (result && result.addedCount > 0) {
        setTickers(result.list);
        window.dispatchEvent(new CustomEvent(GUEST_WATCHLIST_EVENT, { detail: result.list }));
        // moment-of-intent: preset langsung menghasilkan >=3 simpanan → sheet
        // register boleh muncul (konsisten logika toggle, prd-2026-10-26-01)
        if (result.list.length >= 3) {
          window.dispatchEvent(new CustomEvent(REGISTER_PROMPT_EVENT, { detail: { source: "preset_save" } }));
        }
      }
      return result ? { addedCount: result.addedCount } : null;
    },
    [enabled],
  );

  return { tickers, toggle, addMany, mounted: mounted && enabled, enabled };
}
