/**
 * Self-test Radar Pantulan filter (task bug-2026-10-25-01 — FAILING-TEST-FIRST).
 * Run: npx tsx scripts/selftest-radar-filter.ts
 *
 * Bug live 25 Okt: SUPR.JK muncul di /api/stocks/radar dgn rsi14=0/stoch 0/0
 * (indikator kosong) — lolos filter oversold karena `rsi14 <= 30` true utk 0.
 * Test ini men-repro predikat oversold SEBELUM fix (merah), fix = guard > 0
 * di predikat service + query repo (gt: 0). Test diekstrak ke fungsi murni
 * `isOversoldSignal` agar bisa diuji tanpa DB.
 *
 * Test TIDAK berubah pasca-fix (bukti bug hilang).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOversoldSignal } from "../src/domains/stock/radar-filter";

test("[1] indikator kosong (0/null) TIDAK boleh lolos radar oversold", () => {
  // SUPR.JK live 25 Okt: rsi14=0, stochK=0, stochD=0
  assert.equal(isOversoldSignal(0, 0, 0), false, "rsi14=0 + stoch 0/0 harus ditolak");
  assert.equal(isOversoldSignal(0, null, null), false, "rsi14=0 sendirian harus ditolak");
  assert.equal(isOversoldSignal(null, 0, 0), false, "rsi null + stoch 0/0 harus ditolak");
});

test("[2] nilai oversold VALID tetap lolos", () => {
  assert.equal(isOversoldSignal(25, 15, 12), true, "RSI 25 valid oversold");
  assert.equal(isOversoldSignal(45, 15, 12), true, "RSI normal tapi stoch oversold tetap lolos");
  assert.equal(isOversoldSignal(28, null, null), true, "RSI 28 valid tanpa stoch tetap lolos");
});

test("[3] nilai netral/tinggi tidak lolos", () => {
  assert.equal(isOversoldSignal(55, 60, 65), false);
  assert.equal(isOversoldSignal(null, null, null), false);
  assert.equal(isOversoldSignal(31, 21, 25), false, "di atas threshold semua = tolak");
});
