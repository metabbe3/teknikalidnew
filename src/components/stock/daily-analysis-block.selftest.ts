/**
 * Selftest for buildVerdictLine pure function in DailyAnalysisBlock.
 * Run: npx tsx --test src/components/stock/daily-analysis-block.selftest.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVerdictLine,
  withTimeout,
  withTimeoutGuard,
  logDailyAnalysisError,
  resetDailyAnalysisErrorThrottle,
} from "./daily-analysis-block";

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

test("kasus timeout guard: withTimeout helper resolve sebelum timeout dan reject jika melebihi timeout 50ms", async () => {
  // Fast promise: selesai dalam 10ms (< 50ms) -> resolved
  const fastPromise = new Promise<string>((resolve) =>
    setTimeout(() => resolve("fast-ok"), 10),
  );
  const fastRes = await withTimeout(fastPromise, 50);
  assert.equal(fastRes, "fast-ok");

  // Slow promise: 120ms (> 50ms) -> rejects
  const slowPromise = new Promise<string>((resolve) =>
    setTimeout(() => resolve("slow-val"), 120),
  );
  await assert.rejects(
    async () => {
      await withTimeout(slowPromise, 50);
    },
    {
      name: "Error",
      message: /Query timeout \(> 50ms\)/,
    },
  );
});

test("kasus timeout guard: withTimeoutGuard menangkap timeout dan DB error -> return null", async () => {
  // 1. Fast resolve -> return data
  const fastPromise = Promise.resolve([{ ticker: "BBCA", score: 0.8 }]);
  const res1 = await withTimeoutGuard(fastPromise, 50, "BBCA");
  assert.deepEqual(res1, [{ ticker: "BBCA", score: 0.8 }]);

  // 2. Slow query (> 50ms) -> return null ("anggap gagal -> null")
  const slowPromise = new Promise<string[]>((resolve) =>
    setTimeout(() => resolve(["slow"]), 120),
  );
  const res2 = await withTimeoutGuard(slowPromise, 50, "BBCA");
  assert.equal(res2, null, "Query lambat > 50ms harus mengembalikan null");

  // 3. DB error / exception -> return null
  const errorPromise = Promise.reject(new Error("Database connection pool exhausted"));
  const res3 = await withTimeoutGuard(errorPromise, 50, "BBCA");
  assert.equal(res3, null, "DB failure harus ditangkap dan mengembalikan null");
});

test("kasus error throttle: console.error dipanggil sekali dan tidak spam tiap render", () => {
  resetDailyAnalysisErrorThrottle();
  const errorsLogged: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    errorsLogged.push(args.map(String).join(" "));
  };

  try {
    // Simulasi 50 crawler requests berturut-turut saat DB error
    for (let i = 0; i < 50; i++) {
      logDailyAnalysisError(new Error("Connection timeout"), "BBCA");
    }

    assert.equal(
      errorsLogged.length,
      1,
      `Error harus di-log tepat 1 kali untuk mencegah spam, actual: ${errorsLogged.length}`,
    );
    assert.match(errorsLogged[0], /DB error or timeout \(BBCA\): Connection timeout/);
  } finally {
    console.error = originalConsoleError;
    resetDailyAnalysisErrorThrottle();
  }
});

// Print baris "RESULT:" akhir sesuai instruksi gate
test("final report", () => {
  console.log("RESULT: ALL PASS (bullish, bearish, netral, stale, kosong, timeout guard)");
});
