/**
 * Guest localStorage utilities (Retention Loop v1 — PRD idea-2026-10-09-1).
 * Pure, storage-injectable supaya bisa di-unit-test tanpa DOM (scripts/selftest-retention-loop.ts).
 * Semua akses localStorage dibungkus try/catch — private-mode Safari bisa throw.
 */

export interface GuestStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const GUEST_WATCHLIST_KEY = "guest_watchlist";
export const SAVED_SCREENS_KEY = "teknikal_saved_screens";
export const MAX_SAVED_SCREENS = 10;
export const GUEST_WATCHLIST_EVENT = "teknikal:guest-watchlist-updated";
export const SAVED_SCREENS_EVENT = "teknikal:screens-updated";

/** Ticker IDX: 4 huruf umum, tapi sintetis/uccp bisa lain — longgar 2-10 alfanumerik. */
const TICKER_RE = /^[A-Z0-9]{2,10}$/;
const MAX_SERIALIZED = 32 * 1024; // guard storage abuse

function defaultStorage(): GuestStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ── Guest watchlist ──

export function readGuestWatchlist(storage: GuestStorage | null = defaultStorage()): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GUEST_WATCHLIST_KEY);
    if (!raw || raw.length > MAX_SERIALIZED) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of parsed) {
      if (typeof t === "string" && TICKER_RE.test(t) && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function writeGuestWatchlist(tickers: string[], storage: GuestStorage | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(tickers.slice(0, 100)));
    return true;
  } catch {
    return false;
  }
}

export function clearGuestWatchlist(storage: GuestStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(GUEST_WATCHLIST_KEY);
  } catch {
    // best-effort
  }
}

export function toggleGuestWatchlistTicker(
  ticker: string,
  storage: GuestStorage | null = defaultStorage(),
): { list: string[]; added: boolean } | null {
  if (!TICKER_RE.test(ticker)) return null;
  const list = readGuestWatchlist(storage);
  const added = !list.includes(ticker);
  const next = added ? [...list, ticker] : list.filter((t) => t !== ticker);
  return writeGuestWatchlist(next, storage) ? { list: next, added } : null;
}

// ── Saved screener presets (guest, "Simpananku") ──

export interface SavedScreen {
  key: string;
  label: string;
  queryString: string;
  createdAt: string;
}

function parseSavedScreens(raw: string | null): SavedScreen[] {
  if (!raw || raw.length > MAX_SERIALIZED) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SavedScreen[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      if (typeof s.key !== "string" || typeof s.label !== "string" || typeof s.queryString !== "string") continue;
      // queryString harus relatif + diawali param view yang kita kontrol (bukan URL absolut → anti injection)
      if (!s.queryString.startsWith("view=") || s.queryString.length > 1024) continue;
      if (typeof s.createdAt !== "string") continue;
      out.push({ key: s.key.slice(0, 64), label: s.label.slice(0, 80), queryString: s.queryString, createdAt: s.createdAt });
    }
    return out.slice(0, MAX_SAVED_SCREENS);
  } catch {
    return [];
  }
}

export function readSavedScreens(storage: GuestStorage | null = defaultStorage()): SavedScreen[] {
  if (!storage) return [];
  try {
    return parseSavedScreens(storage.getItem(SAVED_SCREENS_KEY));
  } catch {
    return [];
  }
}

/** Simpan preset; dedupe by queryString (replace + pindah ke depan), FIFO max 10. */
export function saveScreen(
  screen: { key: string; label: string; queryString: string },
  storage: GuestStorage | null = defaultStorage(),
): SavedScreen[] | null {
  if (!storage) return null;
  if (!screen.queryString.startsWith("view=") || screen.queryString.length > 1024) return null;
  const entry: SavedScreen = {
    key: screen.key.slice(0, 64),
    label: screen.label.slice(0, 80),
    queryString: screen.queryString,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readSavedScreens(storage).filter((s) => s.queryString !== entry.queryString)].slice(
    0,
    MAX_SAVED_SCREENS,
  );
  try {
    storage.setItem(SAVED_SCREENS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function removeSavedScreen(queryString: string, storage: GuestStorage | null = defaultStorage()): SavedScreen[] {
  const next = readSavedScreens(storage).filter((s) => s.queryString !== queryString);
  try {
    storage?.setItem(SAVED_SCREENS_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}
