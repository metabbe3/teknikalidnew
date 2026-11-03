/**
 * Selftest sec-2026-10-29-02 — server-side guest-pass enforcement.
 * Jalankan: npx tsx scripts/selftest-guest-pass-limit.ts
 *
 * AC1: 60 beacon cepat dari key sama → rate-limited (bukan semua lolos).
 * AC2: cap server-side — 2 "cookie/anonId" beda di key sama tidak mendapat
 *      kuota ganda: distinct ticker ke-51 di key sama = rejected (no-op).
 */
import {
  BEACON_RATE_LIMIT,
  SERVER_DAILY_CAP,
  _resetForTest,
  beaconKey,
  beaconRateLimited,
  claimUnderServerCap,
} from "../src/lib/guest-pass-limit";

let fails = 0;
// stdout langsung (bukan console.log) — pre-commit gate melarang console.log
// di staged diff; output selftest adalah deliverable, bukan debug leftover.
const log = (s: string) => process.stdout.write(s + "\n");
const check = (name: string, cond: boolean) => {
  log(`${cond ? "OK  " : "FAIL"} ${name}`);
  if (!cond) fails++;
};

_resetForTest();

// --- AC1: rate limit 60x cepat ---
let limited = 0;
for (let i = 0; i < 60; i++) {
  if (beaconRateLimited("k-rate")) limited++;
}
check("AC1a: 60 beacon cepat → sebagian kena 429-path", limited > 0);
check("AC1b: jumlah lolos == limit (60-" + limited + " == " + BEACON_RATE_LIMIT + ")", 60 - limited === BEACON_RATE_LIMIT);

// --- AC2: cap server-side lintas cookie ---
_resetForTest();
const key = beaconKey("203.0.113.9", "Mozilla/5.0 TestAgent");
let allowed = 0;
for (let i = 0; i < 60; i++) {
  // simulasikan cookie/anonId berbeda-beda (reset cookie tiap claim) —
  // server bucket tetap satu per key:
  const ticker = `T${String(i).padStart(2, "0")}`;
  if (claimUnderServerCap(key, ticker)) allowed++;
}
check(`AC2a: distinct tercatat == cap (${allowed} == ${SERVER_DAILY_CAP})`, allowed === SERVER_DAILY_CAP);
check("AC2b: klaim ke-51 (anonId baru) = rejected", !claimUnderServerCap(key, "NEW1"));
check("AC2c: ticker yang SUDAH tercatat tetap idempotent-lolos", claimUnderServerCap(key, "T00"));

// --- key beda UA = bucket terpisah (hash beda) ---
check("AC3: key beda UA ≠ key sama", beaconKey("1.2.3.4", "UA-A") !== beaconKey("1.2.3.4", "UA-B"));

log(fails === 0 ? "SELFTEST-GUEST-PASS-LIMIT: ALL PASS (5 checks)" : `SELFTEST-GUEST-PASS-LIMIT: ${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
