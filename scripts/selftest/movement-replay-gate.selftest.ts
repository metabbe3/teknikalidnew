/**
 * Selftest ops-2026-11-05-01 part A (guardrail kenapa-* — gate module):
 * replayMovementNumbers ekstrak klaim angka id-ID (harga / persen / volume /
 * rasio volume / market cap) dari konten artikel lalu cocokkan dengan ground
 * truth MovementMoverRow — angka fiktif wajib fail, tanggal sesi wajib ada.
 * Gate pure 0-LLM 0-DB; generator belum diaktifkan.
 *
 * Run: npx tsx scripts/selftest/movement-replay-gate.selftest.ts
 * Exit 0 = PASS semua.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGroundTruthNumbers,
  extractAllowedNumbers,
  replayMovementNumbers,
  selectPilotCandidates,
} from "../../src/domains/article/movement-replay-gate";
import type { MovementMoverRow } from "../../src/domains/stock/stock.repository";

/** Fixture mover — semua field terisi; sumber ground truth replay. */
const FIXTURE: MovementMoverRow = {
  ticker: "BBCA.JK",
  name: "Bank Central Asia",
  sector: "Keuangan",
  close: 9800,
  prevClose: 9500,
  changePercent: 3.16,
  high: 9900,
  low: 9450,
  open: 9600,
  volume: 125000000,
  avgVolume5d: 60000000,
  rsi14: 62.4,
  macdHist: 0.5,
  sma20: 9700,
  sma50: 9500,
  sma200: 9200,
  adx: 28,
  supertrend: 9600,
  bbUpper: 9950,
  bbLower: 9400,
  signalLabel: "Bullish",
  signalScore: 0.4,
  pe: 18.2,
  pb: 3.1,
  marketCap: 720000000000000,
  eps: 540,
  dividendYield: 2.35,
  week52High: 10800,
  week52Low: 7900,
  isGorengan: false,
};

const AS_OF = { asOfLong: "5 November 2026", asOfShort: "5 Nov 2026" };

const T1_CONTENT = [
  "BBCA ditutup menguat 3,16% ke Rp 9.800 pada perdagangan Kamis.",
  "Volume melonjak menjadi 125,00 juta saham, sekitar 2,08x rata-rata harian.",
  "Kapitalisasi pasar sahamnya kini Rp 720,00 Triliun.",
  "RSI 62,4 menunjukkan momentum masih terkendali.",
  "Seluruh angka per penutupan sesi 5 November 2026.",
].join(" ");

test("T1 konten valid: semua klaim cocok ground truth → passed", () => {
  const gt = buildGroundTruthNumbers(FIXTURE);
  assert.equal(gt.prices.length, 14);
  assert.deepEqual(gt.percents.slice(-3), [70, 30, 25]);

  const res = replayMovementNumbers(T1_CONTENT, FIXTURE, AS_OF);
  assert.equal(res.passed, true);
  assert.equal(res.failures.length, 0);
  assert.ok(res.checked >= 5, `checked=${res.checked}, minimal 5 klaim`);
});

test("T2 harga fiktif → fail kind 'price'", () => {
  const content =
    T1_CONTENT + " Sebagian pelaku pasar melihat level Rp 19.800 sebagai resisten berikutnya.";
  const res = replayMovementNumbers(content, FIXTURE, AS_OF);
  assert.equal(res.passed, false);
  assert.ok(res.failures.some((f) => f.kind === "price"));
});

test("T3 persen fiktif → fail kind 'percent'", () => {
  const content =
    T1_CONTENT + " Spekulasi singkat berburu saham yang melonjak 66,6% dalam sepekan.";
  const res = replayMovementNumbers(content, FIXTURE, AS_OF);
  assert.equal(res.passed, false);
  assert.ok(res.failures.some((f) => f.kind === "percent"));
});

test("T4 tanggal sesi hilang → fail kind 'as_of_missing'", () => {
  const content = T1_CONTENT.replace("sesi 5 November 2026", "sesi kemarin");
  const res = replayMovementNumbers(content, FIXTURE, AS_OF);
  assert.equal(res.passed, false);
  assert.ok(res.failures.some((f) => f.kind === "as_of_missing"));
});

test("T5 selectPilotCandidates: buang gorengan, hormati kuota", () => {
  const a: MovementMoverRow = { ...FIXTURE, ticker: "A.JK" };
  const b: MovementMoverRow = { ...FIXTURE, ticker: "B.JK", isGorengan: true };
  const c: MovementMoverRow = { ...FIXTURE, ticker: "C.JK" };
  const out = selectPilotCandidates([a, b, c], { quotaRemaining: 2 });
  assert.equal(out.length, 2);
  assert.ok(out.every((m) => m.isGorengan !== true));
});

test("T6 angka market context (IHSG/gainers) di-allowlist → PASS", () => {
  const ctx = "IHSG ditutup menguat +2,25% ke level 5.030,26. AMMN naik +8,28% ke Rp 3.660. TLKM Rp 1.990.";
  const allowed = extractAllowedNumbers(ctx);
  const content =
    T1_CONTENT +
    " IHSG ditutup menguat +2,25% ke level 5.030,26. AMMN naik +8,28% ke Rp 3.660, TLKM Rp 1.990.";
  const res = replayMovementNumbers(content, FIXTURE, { ...AS_OF, allowedNumbers: allowed });
  assert.equal(res.passed, true);
});

test("T7 harga negatif bbLower 'Rp -9' → tetap dicek dengan tanda (bukan false fail)", () => {
  const g: MovementMoverRow = { ...FIXTURE, bbLower: -9 };
  const allowed = extractAllowedNumbers("Bollinger Bands: Rp -9 - Rp 24");
  const content = T1_CONTENT + " harga bergerak keluar Bollinger Bands (Rp -9 hingga Rp 24).";
  const res = replayMovementNumbers(content, g, { ...AS_OF, allowedNumbers: allowed });
  assert.equal(res.passed, true);
});

test("T8 klaim fiktif di LUAR allowlist tetap FAIL", () => {
  const allowed = extractAllowedNumbers("IHSG 5.030,26 +2,25%");
  const content = T1_CONTENT + " target harga berikutnya Rp 88.888.";
  const res = replayMovementNumbers(content, FIXTURE, { ...AS_OF, allowedNumbers: allowed });
  assert.equal(res.passed, false);
  assert.ok(res.failures.some((f) => f.kind === "price"));
});

test("T9 tahun '2026, saham' bukan klaim volume — skip", () => {
  const content = T1_CONTENT + " Sejak awal 2026, saham BBCA konsisten mencatat kenaikan.";
  const res = replayMovementNumbers(content, FIXTURE, AS_OF);
  assert.equal(res.passed, true);
});

test("T10 pembulatan price() ke rupiah utuh (sma 8,37 → 'Rp 8') tetap PASS", () => {
  const g: MovementMoverRow = { ...FIXTURE, sma20: 8.37 };
  const content = T1_CONTENT + " Harga bergerak jauh di atas SMA 20 (Rp 8).";
  const res = replayMovementNumbers(content, g, AS_OF);
  assert.equal(res.passed, true);
});

test("T11 angka context dot-desimal ('+3.38%') masuk allowlist", () => {
  const allowed = extractAllowedNumbers("IDX40: Rp 3.660 (+8.28%) — BRIS +3.38%");
  assert.ok(allowed.includes(8.28));
  assert.ok(allowed.includes(3.38));
  assert.ok(allowed.includes(3660));
  const content = T1_CONTENT + " BRIS turut menguat +3,38% dalam sepekan.";
  const res = replayMovementNumbers(content, FIXTURE, { ...AS_OF, allowedNumbers: allowed });
  assert.equal(res.passed, true);
});

test("T12 nominal kasar 'Rp 1.800-an' bukan klaim presisi — skip", () => {
  const content = T1_CONTENT + " potensi retest area Rp 1.800-an masih terbuka.";
  const res = replayMovementNumbers(content, FIXTURE, AS_OF);
  assert.equal(res.passed, true);
});
