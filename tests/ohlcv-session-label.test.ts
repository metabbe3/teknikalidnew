import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * qa-2026-11-13-02 — label sesi strip OHLCV live.
 * Bug: angka O/H/L/C/Vol di-hydrate live (data-live-*) tapi label "sesi <tanggal>"
 * tetap string SSR = EOD kemarin, sehingga saat market REGULAR volume sesi hari
 * ini berlabel kemarin. Kontrak pure di bawah = sumber kebenusan label untuk
 * patcher DOM di live-price.tsx.
 */
import {
  resolveSessionLabel,
  wibTodayLabel,
} from "../src/components/stock/ohlcv-session-label";

test("BUG-CASE: jam bursa REGULAR + quote live -> label sesi HARI INI (bukan EOD kemarin)", () => {
  assert.equal(
    resolveSessionLabel({
      eodLabel: "12 Nov",
      isMarketHours: true,
      quoteLive: true,
      todayLabel: "13 Nov",
    }),
    "13 Nov"
  );
});

test("di luar jam bursa -> restore label EOD SSR (angka memang EOD)", () => {
  assert.equal(
    resolveSessionLabel({
      eodLabel: "12 Nov",
      isMarketHours: false,
      quoteLive: false,
      todayLabel: "13 Nov",
    }),
    "12 Nov"
  );
});

test("jam bursa tapi quote CLOSED/tidak ada -> JANGAN klaim sesi hari ini (data EOD)", () => {
  assert.equal(
    resolveSessionLabel({
      eodLabel: "12 Nov",
      isMarketHours: true,
      quoteLive: false,
      todayLabel: "13 Nov",
    }),
    "12 Nov"
  );
});

test("tanpa eodLabel & tidak live -> null (biarkan DOM, jangan tulis apa-apa)", () => {
  assert.equal(
    resolveSessionLabel({
      eodLabel: undefined,
      isMarketHours: false,
      quoteLive: false,
      todayLabel: "13 Nov",
    }),
    null
  );
});

test("wibTodayLabel: 14 Nov 03:30 UTC (= 10:30 WIB, jam bursa) -> '14 Nov'", () => {
  assert.equal(wibTodayLabel(new Date("2026-11-14T03:30:00Z")), "14 Nov");
});

test("wibTodayLabel: 13 Nov 17:00 UTC (= 14 Nov 00:00 WIB) -> '14 Nov' (rollover tengah malam)", () => {
  assert.equal(wibTodayLabel(new Date("2026-11-13T17:00:00Z")), "14 Nov");
});
