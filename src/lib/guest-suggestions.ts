/**
 * Wave-11b: First-Question Suggestions + Guest Chat Quota (Argon detik-60).
 *
 * Lib murni (pure) untuk menghasilkan saran pertanyaan pertama guest
 * dan menghitung kuota lokal harian guest (50 pertanyaan/hari).
 */

export const GUEST_CHAT_QUOTA_STORAGE_KEY = "tk_guest_chat_quota_v1";
export const MAX_GUEST_DAILY_QUESTIONS = 50;

export interface GuestChatQuotaState {
  date: string;
  count: number;
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
 * Normalisasi ticker: hilangkan postfix .JK, uppercase, dan trim.
 */
export function normalizeTicker(ticker?: string): string {
  if (!ticker) return "";
  return ticker.replace(/\.JK$/i, "").trim().toUpperCase();
}

/**
 * Ekstraksi ticker aktif dari props, pageContext, atau pathname.
 */
export function extractTickerFromContext(
  tickerProp?: string,
  pageContext?: string,
  pathname?: string | null,
): string | undefined {
  if (tickerProp && tickerProp.trim()) {
    const cleaned = normalizeTicker(tickerProp);
    if (cleaned.length > 0) return cleaned;
  }
  if (pageContext) {
    const trimmed = pageContext.trim();
    const bareMatch = trimmed.match(/^([A-Za-z]{4})(?:\.JK)?$/i);
    if (bareMatch) return bareMatch[1].toUpperCase();
    const pathMatch = trimmed.match(/^\/(?:stocks|saham)\/([A-Za-z]{4})(?:\.JK)?/i);
    if (pathMatch) return pathMatch[1].toUpperCase();
  }
  if (pathname) {
    const m = pathname.match(/^\/(?:stocks|saham)\/([A-Za-z]{4})(?:\.JK)?/i);
    if (m) return m[1].toUpperCase();
  }
  return undefined;
}

/**
 * Pure function: menghasilkan 3 chip pertanyaan saran pertama untuk guest.
 * - Jika ada ticker: 3 pertanyaan saham spesifik
 * - Jika tanpa ticker: 3 pertanyaan generik IDX / pemula
 *
 * Invarian:
 * 1. Selalu menghasilkan tepat 3 item
 * 2. Tidak ada pertanyaan duplikat
 * 3. Panjang setiap item < 90 karakter
 */
export function buildGuestSuggestions(ticker?: string): string[] {
  const cleaned = normalizeTicker(ticker);

  if (cleaned.length > 0) {
    return [
      `Sekarang waktu yang bagus buat beli ${cleaned}?`,
      `Kenapa ${cleaned} gerak hari ini?`,
      `Arti skor sinyal ${cleaned} buat pemula?`,
    ];
  }

  return [
    "Saham apa yang lagi menarik minggu ini?",
    "Bedanya investor vs trader buat pemula?",
    "Cara baca skor sinyal di teknikal.id?",
  ];
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
 * Membaca jumlah chat guest yang sudah terpakai hari ini.
 */
export function getGuestChatCount(customStorage?: Storage | null, now: Date = new Date()): number {
  const storage = getSafeStorage(customStorage ?? undefined);
  if (!storage) return 0;

  const today = getLocalDateString(now);
  try {
    const raw = storage.getItem(GUEST_CHAT_QUOTA_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<GuestChatQuotaState>;
    if (parsed && parsed.date === today && typeof parsed.count === "number") {
      return Math.max(0, Math.floor(parsed.count));
    }
  } catch {
    // Abaikan storage error
  }
  return 0;
}

/**
 * Menghitung sisa kuota pertanyaan hari ini: clamp(50 - count, 0).
 */
export function getGuestRemainingQuota(customStorage?: Storage | null, now: Date = new Date()): number {
  const used = getGuestChatCount(customStorage, now);
  return Math.max(0, MAX_GUEST_DAILY_QUESTIONS - used);
}

/**
 * Increment counter pemakaian chat guest hari ini dan kembalikan sisa kuota.
 */
export function incrementGuestChatCount(customStorage?: Storage | null, now: Date = new Date()): number {
  const storage = getSafeStorage(customStorage ?? undefined);
  const today = getLocalDateString(now);
  const currentCount = getGuestChatCount(storage, now);
  const nextCount = currentCount + 1;

  if (storage) {
    try {
      const state: GuestChatQuotaState = { date: today, count: nextCount };
      storage.setItem(GUEST_CHAT_QUOTA_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Abaikan storage error
    }
  }

  return Math.max(0, MAX_GUEST_DAILY_QUESTIONS - nextCount);
}

/**
 * Set counter pemakaian langsung ke batas maksimum (mis. saat 429 quota exhausted).
 */
export function setGuestChatCountMax(customStorage?: Storage | null, now: Date = new Date()): void {
  const storage = getSafeStorage(customStorage ?? undefined);
  const today = getLocalDateString(now);
  if (storage) {
    try {
      const state: GuestChatQuotaState = {
        date: today,
        count: MAX_GUEST_DAILY_QUESTIONS,
      };
      storage.setItem(GUEST_CHAT_QUOTA_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Abaikan storage error
    }
  }
}

/**
 * Reset counter kuota guest (berguna untuk testing).
 */
export function resetGuestChatCount(customStorage?: Storage | null): void {
  const storage = getSafeStorage(customStorage ?? undefined);
  if (storage) {
    try {
      storage.removeItem(GUEST_CHAT_QUOTA_STORAGE_KEY);
    } catch {
      // Abaikan storage error
    }
  }
}
