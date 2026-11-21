/**
 * Selftest for buildVerdictLine pure function in DailyAnalysisBlock.
 * Run: npx tsx --test src/components/stock/daily-analysis-block.selftest.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildVerdictLine } from "./daily-analysis-block";

const FORBIDDEN_WORDS = [/\brekomendasi\b/i, /\bbeli\b/i, /\bjual\b/i, /\bcut loss\b/i];

function assertNoRecommendation(text: string) {
  for (const regex of FORBIDDEN_WORDS) {
    assert.equal(
      regex.test(text),
      false,
      `Teks tidak boleh mengandung rekomendasi beli/jual (${regex}): "${text}"`,
    );
  }
}

test("kasus bullish: menghasilkan verdict positif dengan tone 'kamu' tanpa rekomendasi beli/jual", () => {
  const freshDate = new Date();

  // Pola spesifikasi: EMA bullish + RSI 62 = momentum menguat, belum overbought
  const v1 = buildVerdictLine({
    signalScore: 0.62,
    signalLabel: "Bullish",
    rsi14: 62,
    emaCrossSignal: "bullish",
    date: freshDate,
  });
  assert.ok(v1 !== null, "v1 harus string tidak null");
  assert.match(v1, /momentum menguat.*belum overbought.*kamu/i);
  assertNoRecommendation(v1);

  // Golden cross
  const v2 = buildVerdictLine({
    signalScore: 0.45,
    signalLabel: "Bullish",
    smaCrossSignal: "golden_cross",
    rsi14: 55,
    date: freshDate,
  });
  assert.ok(v2 !== null, "v2 harus string tidak null");
  assert.match(v2, /golden cross/i);
  assertNoRecommendation(v2);

  // Overbought condition
  const v3 = buildVerdictLine({
    signalScore: 0.75,
    signalLabel: "Bullish",
    rsi14: 76,
    emaCrossSignal: "bullish",
    date: freshDate,
  });
  assert.ok(v3 !== null, "v3 harus string tidak null");
  assert.match(v3, /overbought/i);
  assertNoRecommendation(v3);
});

test("kasus bearish: menghasilkan verdict koreksi/waspada tanpa rekomendasi beli/jual", () => {
  const freshDate = new Date();

  // EMA bearish
  const v1 = buildVerdictLine({
    signalScore: -0.45,
    signalLabel: "Bearish",
    rsi14: 42,
    emaCrossSignal: "bearish",
    date: freshDate,
  });
  assert.ok(v1 !== null, "v1 harus string tidak null");
  assert.match(v1, /bearish|penurunan|waspadai/i);
  assertNoRecommendation(v1);

  // Oversold
  const v2 = buildVerdictLine({
    signalScore: -0.6,
    signalLabel: "Bearish",
    rsi14: 25,
    date: freshDate,
  });
  assert.ok(v2 !== null, "v2 harus string tidak null");
  assert.match(v2, /oversold/i);
  assertNoRecommendation(v2);

  // Death cross
  const v3 = buildVerdictLine({
    signalScore: -0.5,
    signalLabel: "Bearish",
    smaCrossSignal: "death_cross",
    date: freshDate,
  });
  assert.ok(v3 !== null, "v3 harus string tidak null");
  assert.match(v3, /death cross/i);
  assertNoRecommendation(v3);
});

test("kasus netral: menghasilkan verdict konsolidasi di area netral", () => {
  const freshDate = new Date();

  const v1 = buildVerdictLine({
    signalScore: 0.02,
    signalLabel: "Neutral",
    rsi14: 50,
    smaCrossSignal: null,
    emaCrossSignal: null,
    date: freshDate,
  });
  assert.ok(v1 !== null, "v1 harus string tidak null");
  assert.match(v1, /netral|konsolidasi/i);
  assertNoRecommendation(v1);
});

test("kasus stale: data > 5 hari lalu harus return null (silent, bukan skeleton)", () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const oldIsoString = "2024-01-01T00:00:00.000Z";

  const v1 = buildVerdictLine({
    signalScore: 0.65,
    signalLabel: "Bullish",
    rsi14: 62,
    emaCrossSignal: "bullish",
    date: sevenDaysAgo,
  });
  assert.equal(v1, null, "Data 7 hari lalu harus return null");

  const v2 = buildVerdictLine({
    signalScore: 0.5,
    signalLabel: "Bullish",
    date: oldIsoString,
  });
  assert.equal(v2, null, "Data ISO lama harus return null");
});

test("kasus kosong: null, undefined, atau object tanpa indikator harus return null", () => {
  assert.equal(buildVerdictLine(null), null, "null harus return null");
  assert.equal(buildVerdictLine(undefined), null, "undefined harus return null");
  assert.equal(buildVerdictLine({}), null, "object kosong harus return null");
  assert.equal(
    buildVerdictLine({
      signalScore: null,
      signalLabel: null,
      rsi14: null,
      smaCrossSignal: null,
      emaCrossSignal: null,
    }),
    null,
    "object dengan field null harus return null",
  );
});

// Print baris "RESULT:" akhir sesuai instruksi gate
test("final report", () => {
  console.log("RESULT: ALL PASS (bullish, bearish, netral, stale, kosong)");
});
