import { cookies } from "next/headers";

/**
 * Guest Pass (Retention Loop v2.1, owner 20 Okt):
 * "Dalam kuota gratis = semua konten terbuka (indikator + trading plan)".
 *
 * Server-side source of truth: cookie `guest_pass` = comma list of tickers
 * opened today (capped). Set/updated by /api/track/guest-pass beacon from
 * GuestStockTracker; read by the stock page to decide full-content render.
 * NO IP detection (CGNAT), NO blocking ("nothing blocked" — owner) — this
 * only ADDS content while quota remains.
 *
 * Day rollover: cookie stores the WIB date; stale date = empty quota
 * (daily reset, mirrors the localStorage meter).
 */

const COOKIE_NAME = "guest_pass";
/**
 * product-audit-2026-10-29 QW5: 5 → 25/hari. Data 7-hari: pengunjung nyata
 * menabrak gate di saham ke-14 → sesi mati, bounce 50,4% — bertabrakan dengan
 * KPI pivot traffic-first (23 Okt). Loop Retention v2.1 (owner 20 Okt) tetap:
 * dalam kuota = semua konten terbuka; hanya ADD konten, tidak pernah block.
 */
export const GUEST_DAILY_FREE = 25;

interface GuestPassState {
  day: string; // YYYY-MM-DD (WIB)
  tickers: string[];
}

function wibToday(): string {
  // WIB = UTC+7, fixed offset (no DST) — safe arithmetic without tz libs.
  const now = new Date(Date.now() + 7 * 3600_000);
  return now.toISOString().slice(0, 10);
}

function parse(raw: string | undefined | null): GuestPassState {
  const today = wibToday();
  if (!raw) return { day: today, tickers: [] };
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as GuestPassState;
    if (parsed?.day !== today) return { day: today, tickers: [] }; // ganti hari → reset
    if (!Array.isArray(parsed.tickers)) return { day: today, tickers: [] };
    return { day: today, tickers: parsed.tickers.filter((t) => typeof t === "string").slice(0, 50) };
  } catch {
    return { day: today, tickers: [] };
  }
}

/** Read state server-side (RSC / route handler). */
export async function readGuestPass(): Promise<GuestPassState> {
  const store = await cookies();
  return parse(store.get(COOKIE_NAME)?.value);
}

/**
 * True → anon masih dalam kuota: render gated sections penuh.
 * (Anon TANPA cookie sama sekali = first page → juga true, zero-friction taste.)
 */
export async function guestHasQuota(): Promise<boolean> {
  const state = await readGuestPass();
  return state.tickers.length < GUEST_DAILY_FREE || state.tickers.length === 0;
}

/** Add a ticker (idempotent). Returns updated state + whether quota remains. */
export async function claimGuestTicker(ticker: string): Promise<{ state: GuestPassState; hasQuota: boolean }> {
  const state = await readGuestPass();
  if (!state.tickers.includes(ticker)) state.tickers.push(ticker);
  const hasQuota = state.tickers.length <= GUEST_DAILY_FREE;
  return { state, hasQuota };
}

/** Serialize for Set-Cookie (call from a route handler only). */
export function serializeGuestPass(state: GuestPassState): string {
  const val = encodeURIComponent(JSON.stringify({ day: state.day, tickers: state.tickers.slice(0, 50) }));
  // 400s expiry — long enough for a session, short enough to not linger stale.
  return `${COOKIE_NAME}=${val}; Path=/; Max-Age=86400; SameSite=Lax`;
}
