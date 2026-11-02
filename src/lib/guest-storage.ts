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

/** Ticker IDX: 4 huruf umum, tapi sintetis/uccp bisa lain — longgar 2-10 alfanumerik.
 *  DB menyimpan ticker IDX DENGAN suffix .JK (format kanonis, dipakai migrasi login);
 *  crypto bare (BTC-USD sudah difilter isCryptoTicker). Suffix opsional, satu kali, 2-4 huruf. */
const TICKER_RE = /^[A-Z0-9]{2,10}(?:\.[A-Z]{2,4})?$/;
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

// ── Register prompt moment-of-intent (PRD prd-2026-10-26-01, OPSI A) ──

export const REGISTER_PROMPT_KEY = "teknikal:register_prompt_last";
export const REGISTER_PROMPT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // AC1: <=1x/7hari
/** CustomEvent 'teknikal:register-prompt' — di-dispatch hook guest SAAT simpan
 *  sukses (star_add / preset_save), didengar RegistrationBottomSheet. */
export const REGISTER_PROMPT_EVENT = "teknikal:register-prompt";

/** Rate-cap check-AND-set atomik (satu fungsi = tak bisa double-show race):
 *  return true SEKALI per 7 hari per perangkat (anonId ≈ localStorage device).
 *  Side-effect menulis timestamp saat true — pure-storage-injectable utk test. */
export function tryConsumeRegisterPrompt(storage: GuestStorage | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(REGISTER_PROMPT_KEY);
    const last = raw ? Number(raw) : NaN;
    if (Number.isFinite(last) && Date.now() - last < REGISTER_PROMPT_INTERVAL_MS) return false;
    storage.setItem(REGISTER_PROMPT_KEY, String(Date.now()));
    return true;
  } catch {
    return false; // private-mode Safari: diam, simpanan guest tetap sukses
  }
}

/** Total simpanan guest (watchlist + preset) utk copy kontekstual (AC2). */
export function countGuestSavedItems(storage: GuestStorage | null = defaultStorage()): number {
  return readGuestWatchlist(storage).length + readSavedScreens(storage).length;
}

// ── Guest migration v2 (PRD prd-2026-10-26-02) ──

/** Cap payload migrasi — sesuai AC2 (watchlist 30, preset 10 FIFO). */
export const MIGRATE_WATCHLIST_CAP = 30;
export const MIGRATE_PRESET_CAP = 10;

export interface MigratePresetPayload {
  name: string;
  queryString: string;
}

export interface MigratePayload {
  watchlist: string[];
  presets: MigratePresetPayload[];
  isEmpty: boolean;
}

/** Normalisasi ticker IDX ke format kanonis DB: XXXX.JK (guest bisa menyimpan bare
 *  dari link legacy /share lama; tanpa ini, findStocksByTickers exact-match mendrop
 *  senyap → data guest hilang saat migrasi — bug nyata yang diperbaiki PRD ini). */
export function toCanonicalJkTicker(ticker: string): string | null {
  const t = ticker.trim().toUpperCase();
  if (!TICKER_RE.test(t)) return null;
  return t.endsWith(".JK") ? t : `${t}.JK`;
}

/**
 * Bangun payload migrasi satu pintu (dipakai auth-provider saat guest → authenticated).
 * - watchlist: normalize .JK, dedupe, cap 30 (AC2)
 * - presets: dedupe by queryString, name = label (cap 100 VarChar), cap 10 FIFO terbaru-dulu
 *   (readSavedScreens sudah mengembalikan urutan terbaru-dulu, sama seperti UI)
 * - isEmpty: AC4 — true = caller NO-OP (0 fetch, 0 query)
 */
export function buildMigratePayload(storage: GuestStorage | null = defaultStorage()): MigratePayload {
  // FIFO: watchlist guest = append (baru di belakang) → bila >cap, TERLAMA dibuang
  // (ambil 30 terakhir). Preset kebalikannya: baru di depan (saveScreen) → ambil 10 pertama.
  const seen = new Set<string>();
  const all: string[] = [];
  for (const t of readGuestWatchlist(storage)) {
    const canonical = toCanonicalJkTicker(t);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    all.push(canonical);
  }
  const watchlist = all.slice(-MIGRATE_WATCHLIST_CAP);
  const seenQs = new Set<string>();
  const presets: MigratePresetPayload[] = [];
  for (const s of readSavedScreens(storage)) {
    if (seenQs.has(s.queryString)) continue;
    seenQs.add(s.queryString);
    presets.push({ name: s.label.slice(0, 100), queryString: s.queryString });
    if (presets.length >= MIGRATE_PRESET_CAP) break;
  }
  return { watchlist, presets, isEmpty: watchlist.length === 0 && presets.length === 0 };
}
