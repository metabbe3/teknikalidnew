/**
 * Guest Quota v1 — Freemium 3 saham per hari (W1a, plan 2026-11-07).
 *
 * Mengatur akses kuota gratis 3 saham per hari untuk guest (anonim).
 * Data disimpan di localStorage dengan kunci `tk_guest_stocks_v1`.
 * Struktur: { date: "YYYY-MM-DD", tickers: ["BBCA", "BBRI", "BMRI"] }
 *
 * Aturan:
 * - Guest membuka saham: jika belum ada di list & list < 3 -> tambahkan -> TERBUKA.
 * - Jika sudah di list -> TERBUKA (saham yang sama bebas diakses ulang).
 * - Saham ke-4 (belum di list & list >= 3) -> OVERLIMIT (gated/blur).
 * - Tanggal baru (date rollover) -> kuota otomatis reset ke 0.
 * - Logged-in user -> TIDAK PERNAH digate oleh guest quota.
 */

export const GUEST_STOCKS_STORAGE_KEY = "tk_guest_stocks_v1";
export const MAX_FREE_GUEST_STOCKS = 3;

export interface GuestStocksState {
  date: string;
  tickers: string[];
}

/**
 * Format tanggal lokal YYYY-MM-DD untuk rollover kuota harian.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normalisasi ticker: hilangkan postfix .JK dan uppercase.
 */
export function normalizeTicker(ticker: string): string {
  return ticker.replace(/\.JK$/i, "").trim().toUpperCase();
}

function getSafeStorage(customStorage?: Storage): Storage | null {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined") {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Membaca kuota guest saat ini dari localStorage.
 * Jika tanggal berbeda dengan hari ini, otomatis mengembalikan state reset.
 */
export function readGuestStocksQuota(
  customStorage?: Storage,
  now: Date = new Date()
): GuestStocksState {
  const today = getLocalDateString(now);
  const storage = getSafeStorage(customStorage);
  if (!storage) {
    return { date: today, tickers: [] };
  }

  try {
    const raw = storage.getItem(GUEST_STOCKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GuestStocksState>;
      if (parsed && typeof parsed.date === "string" && Array.isArray(parsed.tickers)) {
        if (parsed.date === today) {
          const validTickers = parsed.tickers
            .filter((t): t is string => typeof t === "string" && t.length > 0)
            .map(normalizeTicker);
          return { date: today, tickers: Array.from(new Set(validTickers)) };
        }
      }
    }
  } catch {
    // Storage korup atau diblokir private mode -> fallback state baru
  }

  return { date: today, tickers: [] };
}

export interface GuestQuotaResult {
  isGated: boolean;
  tickers: string[];
  isNew: boolean;
  quotaExhausted: boolean;
}

/**
 * Mengevaluasi dan mencatat kunjungan stock page untuk guest.
 */
export function evaluateGuestQuotaVisit(
  ticker: string,
  options?: {
    isAuthed?: boolean;
    storage?: Storage;
    now?: Date;
  }
): GuestQuotaResult {
  const isAuthed = !!options?.isAuthed;
  if (isAuthed) {
    return {
      isGated: false,
      tickers: [],
      isNew: false,
      quotaExhausted: false,
    };
  }

  const clean = normalizeTicker(ticker);
  const state = readGuestStocksQuota(options?.storage, options?.now);
  const exists = state.tickers.includes(clean);

  if (exists) {
    return {
      isGated: false,
      tickers: state.tickers,
      isNew: false,
      quotaExhausted: state.tickers.length >= MAX_FREE_GUEST_STOCKS,
    };
  }

  if (state.tickers.length < MAX_FREE_GUEST_STOCKS) {
    state.tickers.push(clean);
    const storage = getSafeStorage(options?.storage);
    if (storage) {
      try {
        storage.setItem(GUEST_STOCKS_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Abaikan kegagalan storage pada private mode
      }
    }
    return {
      isGated: false,
      tickers: state.tickers,
      isNew: true,
      quotaExhausted: state.tickers.length >= MAX_FREE_GUEST_STOCKS,
    };
  }

  // Quota penuh (>= 3 saham), dan ticker saat ini belum ada di list
  return {
    isGated: true,
    tickers: state.tickers,
    isNew: false,
    quotaExhausted: true,
  };
}

/**
 * Cek apakah ticker tertentu ter-gate / overlimit saat ini tanpa memodifikasi storage.
 */
export function isGuestStockGated(
  ticker: string,
  customStorage?: Storage,
  now: Date = new Date()
): boolean {
  const clean = normalizeTicker(ticker);
  const state = readGuestStocksQuota(customStorage, now);
  if (state.tickers.includes(clean)) return false;
  return state.tickers.length >= MAX_FREE_GUEST_STOCKS;
}

/**
 * Reset kuota (berguna untuk testing).
 */
export function clearGuestStocksQuota(customStorage?: Storage): void {
  const storage = getSafeStorage(customStorage);
  if (storage) {
    try {
      storage.removeItem(GUEST_STOCKS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
