/**
 * Self-test Access-Limit (task bug-2026-10-12-01 / PRD idea-2026-10-12-2).
 * Run: npx tsx scripts/selftest-access-limit.ts
 *
 * Unit-test src/lib/access-limit.ts (pure — no Next runtime needed):
 * - JSON-vs-HTML decision utk rute API vs halaman
 * - buildAccessLimitUrl: path/status/retry param + cap
 * - CGNAT gate (AC5): eskalasi auto-block butuh browser signal utk prefix CGNAT
 * - sanitizeReturnPath: anti open-redirect/protocol-relative
 * - secondsUntil: clamp 0..3600
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_LIMIT_PAGE,
  MAX_COOLDOWN_MS,
  wantsJsonError,
  isCgnatPrefix,
  hasBrowserSignal,
  shouldEscalateCgnat,
  buildAccessLimitUrl,
  secondsUntil,
  sanitizeReturnPath,
} from "../src/lib/access-limit";

const NOW = 1_760_300_000_000; // fixed clock utk determinisme

test("[1] wantsJsonError: API → JSON, HTML page → bukan JSON", () => {
  assert.equal(wantsJsonError("/api/stocks/BBRI.JK"), true);
  assert.equal(wantsJsonError("/api/screener"), true);
  assert.equal(wantsJsonError("/stocks"), false);
  assert.equal(wantsJsonError("/stocks/BBCA.JK"), false);
  assert.equal(wantsJsonError("/akses-dibatasi"), false);
});

test("[2] buildAccessLimitUrl 403: status+path ter-encode, tanpa retry kalau undefined", () => {
  const u = buildAccessLimitUrl("https://teknikal.id/stocks/BBCA.JK?tab=indikator", 403);
  assert.equal(u.pathname, ACCESS_LIMIT_PAGE);
  assert.equal(u.origin, "https://teknikal.id");
  assert.equal(u.searchParams.get("status"), "403");
  assert.equal(u.searchParams.get("path"), "/stocks/BBCA.JK?tab=indikator");
  assert.equal(u.searchParams.has("retry"), false, "tanpa retry param");
});

test("[3] buildAccessLimitUrl 429: retry ms → detik, cap MAX_COOLDOWN", () => {
  const u1 = buildAccessLimitUrl("https://teknikal.id/stocks", 429, 600_000);
  assert.equal(u1.searchParams.get("status"), "429");
  assert.equal(u1.searchParams.get("retry"), "600");
  const u2 = buildAccessLimitUrl("https://teknikal.id/stocks", 429, 99 * 3_600_000);
  assert.equal(u2.searchParams.get("retry"), String(MAX_COOLDOWN_MS / 1000), "cap 1 jam");
  const u3 = buildAccessLimitUrl("https://teknikal.id/stocks", 429, -5);
  assert.equal(u3.searchParams.has("retry"), false, "retry negatif dibuang");
});

test("[4] buildAccessLimitUrl: path panjang dipotong 300 char", () => {
  const long = "/stocks?" + "x".repeat(500);
  const u = buildAccessLimitUrl("https://teknikal.id" + long, 429);
  assert.ok((u.searchParams.get("path") ?? "").length <= 300);
});

test("[5] CGNAT prefix detection", () => {
  assert.equal(isCgnatPrefix("180.247.10.1"), true);
  assert.equal(isCgnatPrefix("114.12.1.248"), true);
  assert.equal(isCgnatPrefix("182.3.44.5"), true);
  assert.equal(isCgnatPrefix("2404:c0:5c50::1:1e49:c771"), true);
  assert.equal(isCgnatPrefix("8.8.8.8"), false);
  assert.equal(isCgnatPrefix("203.0.113.5"), false);
  assert.equal(isCgnatPrefix(null), false);
  assert.equal(isCgnatPrefix(""), false);
});

test("[6] hasBrowserSignal: UA manusia lolos, bot/headless/empty tolak", () => {
  assert.equal(hasBrowserSignal("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"), true);
  assert.equal(hasBrowserSignal("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0"), true);
  assert.equal(hasBrowserSignal("curl/8.4.0"), false);
  assert.equal(hasBrowserSignal("python-requests/2.31"), false);
  assert.equal(hasBrowserSignal("Scrapy/2.11 (+https://scrapy.org)"), false);
  assert.equal(hasBrowserSignal("Mozilla/5.0 HeadlessChrome/128.0"), false);
  assert.equal(hasBrowserSignal(null), false);
  assert.equal(hasBrowserSignal(""), false);
});

test("[7] shouldEscalateCgnat (AC5): CGNAT butuh browser-signal, non-CGNAT perilaku lama", () => {
  // non-CGNAT: request-count cukup (perilaku lama) — UA apapun/none tetap eskalasi
  assert.equal(shouldEscalateCgnat("8.8.8.8", null), true);
  assert.equal(shouldEscalateCgnat("203.0.113.5", "curl/8.4.0"), true);
  // CGNAT + UA browser → boleh eskalasi
  assert.equal(shouldEscalateCgnat("114.12.1.248", "Mozilla/5.0 (Linux; Android 14) Chrome/128.0"), true);
  // CGNAT + non-browser → JANGAN eskalasi (1 IP = ribuan manusia)
  assert.equal(shouldEscalateCgnat("114.12.1.248", "curl/8.4.0"), false);
  assert.equal(shouldEscalateCgnat("180.247.10.1", null), false);
  assert.equal(shouldEscalateCgnat("2404:c0:5c50::1", "Scrapy/2.11"), false);
});

test("[8] sanitizeReturnPath: internal-only, anti protocol-relative, cap panjang", () => {
  assert.equal(sanitizeReturnPath("/stocks/BBCA.JK"), "/stocks/BBCA.JK");
  assert.equal(sanitizeReturnPath("/stocks?view=tab&preset=golden_cross"), "/stocks?view=tab&preset=golden_cross");
  assert.equal(sanitizeReturnPath("//evil.com/x"), null);
  assert.equal(sanitizeReturnPath("https://evil.com"), null);
  assert.equal(sanitizeReturnPath("stocks/rel"), null);
  assert.equal(sanitizeReturnPath("/stocks/<script>"), null);
  assert.equal(sanitizeReturnPath(undefined), null);
  assert.equal(sanitizeReturnPath(null), null);
  const long = "/stocks/" + "A".repeat(400);
  assert.ok((sanitizeReturnPath(long) ?? "").length <= 300);
});

test("[9] secondsUntil: clamp 0..3600 + input buruk → null", () => {
  assert.equal(secondsUntil(new Date(NOW + 90_000).toISOString(), NOW), 90);
  assert.equal(secondsUntil(new Date(NOW - 5_000).toISOString(), NOW), 0, "sudah lewat = 0");
  assert.equal(secondsUntil(new Date(NOW + 99 * 3_600_000).toISOString(), NOW), 3600, "cap 1 jam");
  assert.equal(secondsUntil("bukan-iso", NOW), null);
  assert.equal(secondsUntil(null, NOW), null);
  assert.equal(secondsUntil(undefined, NOW), null);
});
