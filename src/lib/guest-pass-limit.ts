import { createHash } from "crypto";
import { GUEST_DAILY_FREE } from "@/lib/guest-pass";

/**
 * Server-side enforcement utk beacon /api/track/guest-pass (task sec-2026-10-29-02).
 *
 * Masalah: beacon selalu 204 tanpa limit, dan kuota hanya dipegang cookie guest_pass
 * (client-controlled) — reset cookie = kuota baru. Ini pure in-memory enforcement:
 *   1. RATE LIMIT: >30 beacon/menit per key (IP+UA hash) → 429 (bukan 204).
 *   2. DAILY CAP: server menghitung distinct ticker/hari per key; di atas
 *      SERVER_DAILY_CAP klaim menjadi no-op (cookie TIDAK ditambah) sehingga
 *      cookie-farming (reset/anonId ganda) tidak memberi kuota ekstra.
 *
 * Page render (guestHasQuota) SENGAJA tidak digate bucket ini: CGNAT Indonesia
 * = ribuan manusia share 1 IP (owner 16 Okt: "nothing blocked", limits dihapus
 * utk browsing). Enforcement hanya di jalur beacon (fire-and-forget, FE abaikan
 * status response) — menutup spam tanpa risiko mem-block manusia asli.
 *
 * In-memory per-instance (pattern sama dgn rateLimitMap di proxy.ts): cukup utk
 * single-container deployment; reset saat restart = acceptable utk soft-cap.
 */

export const BEACON_RATE_LIMIT = 30; // beacon/menit per key (curl 60x cepat → 429)
export const BEACON_RATE_WINDOW_MS = 60_000;
/** Spec by-design: 50 distinct ticker/hari server-side (2× cookie cap 25). */
export const SERVER_DAILY_CAP = GUEST_DAILY_FREE * 2;
const MAX_ENTRIES = 10_000;

interface Bucket {
  day: string; // YYYY-MM-DD (WIB) — distinct-ticker daily counter
  tickers: Set<string>;
  hits: number;
  resetAt: number; // rate-window expiry (ms epoch)
}

const buckets = new Map<string, Bucket>();

function wibToday(now: number): string {
  return new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Stable key dari IP + User-Agent (hash — tidak menyimpan PII mentah). */
export function beaconKey(ip: string | null | undefined, userAgent: string | null | undefined): string {
  const raw = `${(ip ?? "").trim()}|${(userAgent ?? "").trim().toLowerCase().slice(0, 200)}`;
  return createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

function prune(now: number): void {
  if (buckets.size <= MAX_ENTRIES) return;
  for (const [key, val] of buckets) {
    if (now > val.resetAt && val.day !== wibToday(now)) buckets.delete(key);
  }
}

/** TRUE = rate-limited (caller harus 429). */
export function beaconRateLimited(key: string, now: number = Date.now()): boolean {
  prune(now);
  const today = wibToday(now);
  const b = buckets.get(key);
  if (!b || b.day !== today || now > b.resetAt) {
    buckets.set(key, { day: today, tickers: b && b.day === today ? b.tickers : new Set(), hits: 1, resetAt: now + BEACON_RATE_WINDOW_MS });
    return false;
  }
  b.hits++;
  return b.hits > BEACON_RATE_LIMIT;
}

/**
 * Server-side daily cap: claim ticker hanya diizinkan selama distinct total
 * (lintas cookie/anonId utk key sama) belum lewat SERVER_DAILY_CAP.
 * TRUE = diizinkan (dan tercatat di bucket); FALSE = no-op.
 */
export function claimUnderServerCap(key: string, ticker: string, now: number = Date.now()): boolean {
  prune(now);
  const today = wibToday(now);
  let b = buckets.get(key);
  if (!b || b.day !== today) {
    b = { day: today, tickers: new Set(), hits: 0, resetAt: now + BEACON_RATE_WINDOW_MS };
    buckets.set(key, b);
  }
  if (b.tickers.size >= SERVER_DAILY_CAP && !b.tickers.has(ticker)) return false;
  b.tickers.add(ticker);
  return true;
}

/** Test hook: reset state (selftest only). */
export function _resetForTest(): void {
  buckets.clear();
}
