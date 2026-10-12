/**
 * Access-limit helpers (task bug-2026-10-12-01, PRD idea-2026-10-12-2).
 *
 * Sebelumnya IP yang diblokir / kena rate-limit di /stocks/* mendapat
 * NextResponse(null) 403/429 — body kosong = white screen tanpa penjelasan.
 * 82% row BlockedIp = prefix CGNAT Indonesia (1 IP dipakai ribuan manusia),
 * jadi pengunjung tak tahu apa-apa menganggap situs mati.
 *
 * Helpers di file ini PURE (tanpa Next runtime) supaya bisa di-unit-test
 * (scripts/selftest-access-limit.ts). Satu fungsi impure: accessLimitedResponse.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const ACCESS_LIMIT_PAGE = "/akses-dibatasi";

/** Cooldown maksimum jalur single-signal (STOCK_*_BLOCK_WINDOW = 1 jam). */
export const MAX_COOLDOWN_MS = 60 * 60_000;

/** Request API/XHR tetap butuh error machine-readable, BUKAN HTML rewrite. */
export function wantsJsonError(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * Prefix CGNAT Indonesia — 1 alamat IP dibagi ribuan pengguna
 * (Telkomsel/Indihome). Bukti PRD: 46/56 row BlockedIp ada di prefix ini.
 */
export const CGNAT_PREFIXES = ["180.247.", "114.12.", "182.3.", "2404:c0:"] as const;

export function isCgnatPrefix(ip: string | null | undefined): boolean {
  if (!ip) return false;
  return CGNAT_PREFIXES.some((p) => ip.startsWith(p));
}

/** AC5: minimal satu sinyal browser (UA manusia, bukan bot/headless). */
export function hasBrowserSignal(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  if (ua.includes("headless")) return false;
  if (/bot|crawler|spider|curl|wget|python|scrapy|axios\/|node-fetch|http-client/.test(ua)) return false;
  return /mozilla\/5|opera|davclid/.test(ua);
}

/**
 * AC5 gate eskalasi auto-block: utk IP CGNAT dikenal, request-count SAJA tidak
 * cukup — wajib ada browser signal sebagai eksponen kedua. Scraper CGNAT tanpa
 * UA browser tetap kena 429 per-menit (soft-limit) tapi TIDAK di-eskalasi ke
 * blokir 1 jam yang mengunci ribuan manusia di IP yang sama.
 * Non-CGNAT: perilaku lama (request-count cukup).
 */
export function shouldEscalateCgnat(
  ip: string | null | undefined,
  userAgent: string | null | undefined,
): boolean {
  if (!isCgnatPrefix(ip)) return true;
  return hasBrowserSignal(userAgent);
}

/** URL rewrite target ke halaman /akses-dibatasi (dipakai proxy). */
export function buildAccessLimitUrl(
  requestUrl: string,
  status: 403 | 429,
  retryMs?: number,
): URL {
  const src = new URL(requestUrl);
  const dest = new URL(ACCESS_LIMIT_PAGE, src.origin);
  dest.searchParams.set("status", String(status));
  if (retryMs !== undefined && Number.isFinite(retryMs) && retryMs > 0) {
    const secs = Math.min(Math.round(retryMs / 1000), MAX_COOLDOWN_MS / 1000);
    dest.searchParams.set("retry", String(secs));
  }
  const path = src.pathname + (src.search || "");
  if (path && path !== "/") dest.searchParams.set("path", path.slice(0, 300));
  return dest;
}

/**
 * Respons pembatas: halaman HTML → rewrite ke /akses-dibatasi (URL bar tetap
 * asli; halaman render 200 dengan penjelasan), API → JSON error berbody.
 */
export function accessLimitedResponse(
  request: NextRequest,
  status: 403 | 429,
  retryMs?: number,
): NextResponse {
  if (wantsJsonError(request.nextUrl.pathname)) {
    return NextResponse.json(
      status === 403
        ? { error: "Access temporarily limited" }
        : { error: "Too many requests" },
      { status },
    );
  }
  return NextResponse.rewrite(buildAccessLimitUrl(request.url, status, retryMs));
}

/** Sisa detik sampai expiry (clamp 0..3600); input buruk → null. */
export function secondsUntil(
  expiresAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!expiresAtIso) return null;
  const t = Date.parse(expiresAtIso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.min(Math.round((t - nowMs) / 1000), MAX_COOLDOWN_MS / 1000));
}

/** Path internal aman utk link "Coba Lagi" (anti open-redirect / //host). */
export function sanitizeReturnPath(p: string | null | undefined): string | null {
  if (!p) return null;
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  if (!/^\/[A-Za-z0-9\-._~/?=&%+]*$/.test(p)) return null;
  return p.slice(0, 300);
}
