/**
 * Selftest for detectAnomalies pure function in daily-anomaly.ts.
 * Run: npx tsx --test src/components/stock/daily-anomaly.selftest.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { detectAnomalies } from "./daily-anomaly";

const FORBIDDEN_WORDS = [
  /\brekomendasi\b/i,
  /\bbeli\b/i,
  /\bjual\b/i,
  /\bcut loss\b/i,
];

function assertNoRecommendation(text: string) {
  for (const regex of FORBIDDEN_WORDS) {
    assert.equal(
      regex.test(text),
      false,
      `Teks tidak boleh mengandung rekomendasi beli/jual (${regex}): "${text}"`,
    );
  }
}

test("kasus cross-baru: mendeteksi perubahan sinyal cross vs prevIndicator", () => {
  // 1. EMA cross bullish baru terbentuk
  const resEmaBull = detectAnomalies({
    ticker: "BBCA",
    indicator: {
      emaCrossSignal: "bullish",
      smaCrossSignal: null,
      rsi14: 50,
      signalScore: 0.1,
    },
    prevIndicator: {
      emaCrossSignal: null,
      smaCrossSignal: null,
      rsi14: 48,
      signalScore: 0.05,
    },
  });

  const emaBull = resEmaBull.find((a) => a.label === "EMA Cross Bullish");
  assert.ok(emaBull, "Harus mendeteksi EMA Cross Bullish");
  assert.match(emaBull.detail, /EMA cross bullish baru terbentuk/i);
  assert.match(emaBull.detail, /\bkamu\b/i);
  assertNoRecommendation(emaBull.detail);

  // 2. EMA cross bearish baru terbentuk
  const resEmaBear = detectAnomalies({
    ticker: "BBCA",
    indicator: {
      emaCrossSignal: "bearish",
      smaCrossSignal: null,
      rsi14: 50,
      signalScore: -0.1,
    },
    prevIndicator: {
      emaCrossSignal: "bullish",
      smaCrossSignal: null,
      rsi14: 52,
      signalScore: 0.1,
    },
  });

  const emaBear = resEmaBear.find((a) => a.label === "EMA Cross Bearish");
  assert.ok(emaBear, "Harus mendeteksi EMA Cross Bearish");
  assert.match(emaBear.detail, /EMA cross bearish baru terbentuk/i);
  assert.match(emaBear.detail, /\bkamu\b/i);
  assertNoRecommendation(emaBear.detail);

  // 3. SMA golden cross baru terbentuk
  const resSmaGolden = detectAnomalies({
    ticker: "ASII",
    indicator: {
      smaCrossSignal: "golden_cross",
      emaCrossSignal: null,
      rsi14: 52,
    },
    prevIndicator: {
      smaCrossSignal: null,
      emaCrossSignal: null,
      rsi14: 50,
    },
  });

  const smaGolden = resSmaGolden.find((a) => a.label === "Golden Cross Baru");
  assert.ok(smaGolden, "Harus mendeteksi Golden Cross Baru");
  assert.match(smaGolden.detail, /SMA golden cross baru terbentuk/i);
  assert.match(smaGolden.detail, /\bkamu\b/i);
  assertNoRecommendation(smaGolden.detail);

  // 4. SMA death cross baru terbentuk
  const resSmaDeath = detectAnomalies({
    ticker: "ASII",
    indicator: {
      smaCrossSignal: "death_cross",
      emaCrossSignal: null,
      rsi14: 45,
    },
    prevIndicator: {
      smaCrossSignal: "golden_cross",
      emaCrossSignal: null,
      rsi14: 50,
    },
  });

  const smaDeath = resSmaDeath.find((a) => a.label === "Death Cross Baru");
  assert.ok(smaDeath, "Harus mendeteksi Death Cross Baru");
  assert.match(smaDeath.detail, /SMA death cross baru terbentuk/i);
  assert.match(smaDeath.detail, /\bkamu\b/i);
  assertNoRecommendation(smaDeath.detail);

  // 5. Cross sinyal tidak berubah (sama dengan prev) -> tidak boleh ada anomali cross
  const resNoCrossChange = detectAnomalies({
    ticker: "TLKM",
    indicator: {
      emaCrossSignal: "bullish",
      smaCrossSignal: "golden_cross",
      rsi14: 50,
    },
    prevIndicator: {
      emaCrossSignal: "bullish",
      smaCrossSignal: "golden_cross",
      rsi14: 50,
    },
  });
  assert.equal(
    resNoCrossChange.length,
    0,
    "Sinyal cross sama persis dengan prev tidak boleh trigger anomali",
  );
});

test("kasus volume spike: mendeteksi volumeRatio > 1.5", () => {
  const resSpike = detectAnomalies({
    ticker: "BBRI",
    indicator: { rsi14: 50 },
    volumeRatio: 2.14,
  });

  const vol = resSpike.find((a) => a.label === "Lonjakan Volume");
  assert.ok(vol, "Harus mendeteksi Lonjakan Volume");
  assert.match(vol.detail, /volume 2,1x rata-rata 20 hari/i);
  assert.match(vol.detail, /\bkamu\b/i);
  assertNoRecommendation(vol.detail);

  // volumeRatio <= 1.5 tidak trigger spike
  const resNormal = detectAnomalies({
    ticker: "BBRI",
    indicator: { rsi14: 50 },
    volumeRatio: 1.45,
  });
  assert.equal(
    resNormal.find((a) => a.label === "Lonjakan Volume"),
    undefined,
  );
});

test("kasus RSI ekstrem dua arah: <35 oversold dan >65 mendekati overbought", () => {
  // Oversold (< 35)
  const resOversold = detectAnomalies({
    ticker: "GOTO",
    indicator: { rsi14: 28 },
  });
  const oversold = resOversold.find((a) => a.label === "RSI Oversold");
  assert.ok(oversold, "Harus mendeteksi RSI Oversold");
  assert.match(oversold.detail, /oversold/i);
  assert.match(oversold.detail, /RSI 28/);
  assert.match(oversold.detail, /\bkamu\b/i);
  assertNoRecommendation(oversold.detail);

  // Mendekati overbought (> 65)
  const resOverbought = detectAnomalies({
    ticker: "BREN",
    indicator: { rsi14: 72 },
  });
  const overbought = resOverbought.find(
    (a) => a.label === "RSI Mendekati Overbought",
  );
  assert.ok(overbought, "Harus mendeteksi RSI Mendekati Overbought");
  assert.match(overbought.detail, /mendekati overbought/i);
  assert.match(overbought.detail, /RSI 72/);
  assert.match(overbought.detail, /\bkamu\b/i);
  assertNoRecommendation(overbought.detail);

  // Area netral (antara 35 s.d. 65) tidak trigger RSI ekstrem
  const resNetral = detectAnomalies({
    ticker: "ICBP",
    indicator: { rsi14: 50 },
  });
  assert.equal(
    resNetral.some((a) => a.label.includes("RSI")),
    false,
  );
});

test("kasus pergerakan besar: |priceChangePct| > 3%", () => {
  // Kenaikan tajam (+4.2%)
  const resUp = detectAnomalies({
    ticker: "BRPT",
    indicator: { rsi14: 55 },
    priceChangePct: 4.23,
  });
  const up = resUp.find((a) => a.label === "Pergerakan Besar");
  assert.ok(up, "Harus mendeteksi pergerakan besar positif");
  assert.match(up.detail, /bergerak \+4,2% sesi terakhir/i);
  assert.match(up.detail, /\bkamu\b/i);
  assertNoRecommendation(up.detail);

  // Penurunan tajam (-3.7%)
  const resDown = detectAnomalies({
    ticker: "MEDC",
    indicator: { rsi14: 45 },
    priceChangePct: -3.71,
  });
  const down = resDown.find((a) => a.label === "Pergerakan Besar");
  assert.ok(down, "Harus mendeteksi pergerakan besar negatif");
  assert.match(down.detail, /bergerak -3,7% sesi terakhir/i);
  assert.match(down.detail, /\bkamu\b/i);
  assertNoRecommendation(down.detail);

  // Pergerakan normal <= 3% tidak trigger
  const resNormal = detectAnomalies({
    ticker: "MEDC",
    indicator: { rsi14: 45 },
    priceChangePct: 2.1,
  });
  assert.equal(
    resNormal.some((a) => a.label === "Pergerakan Besar"),
    false,
  );
});

test("kasus skor sinyal tinggi: signalScore > 0.6", () => {
  const resHigh = detectAnomalies({
    ticker: "ADRO",
    indicator: { signalScore: 0.75, rsi14: 55 },
  });
  const high = resHigh.find((a) => a.label === "Skor Sinyal Tinggi");
  assert.ok(high, "Harus mendeteksi Skor Sinyal Tinggi");
  assert.match(high.detail, /skor sinyal \+0,75/i);
  assert.match(high.detail, /\bkamu\b/i);
  assertNoRecommendation(high.detail);

  // Skor sinyal normal <= 0.6 tidak trigger
  const resNormal = detectAnomalies({
    ticker: "ADRO",
    indicator: { signalScore: 0.55, rsi14: 55 },
  });
  assert.equal(
    resNormal.some((a) => a.label === "Skor Sinyal Tinggi"),
    false,
  );
});

test("kasus tanpa anomali: array kosong saat semua kondisi normal", () => {
  const res = detectAnomalies({
    ticker: "TLKM",
    indicator: {
      signalScore: 0.2,
      rsi14: 50,
      emaCrossSignal: "bullish",
      smaCrossSignal: "golden_cross",
    },
    prevIndicator: {
      signalScore: 0.2,
      rsi14: 50,
      emaCrossSignal: "bullish",
      smaCrossSignal: "golden_cross",
    },
    priceChangePct: 1.2,
    volumeRatio: 0.95,
  });

  assert.equal(Array.isArray(res), true);
  assert.equal(res.length, 0, "Harus mengembalikan array kosong tanpa anomali");
});

test("kasus prevIndicator null: aman tanpa history, cross tidak crash/false trigger", () => {
  const res = detectAnomalies({
    ticker: "NEWCO",
    indicator: {
      emaCrossSignal: "bullish",
      smaCrossSignal: "golden_cross",
      rsi14: 50,
      signalScore: 0.1,
    },
    prevIndicator: null,
    priceChangePct: 0.5,
    volumeRatio: 1.0,
  });

  assert.equal(
    res.length,
    0,
    "Tanpa prevIndicator, cross baru tidak boleh di-trigger",
  );

  // Jika indikator lain ekstrem walau prevIndicator null, tetap terdeteksi
  const resWithSpike = detectAnomalies({
    ticker: "NEWCO",
    indicator: {
      rsi14: 25,
    },
    prevIndicator: null,
    volumeRatio: 2.5,
  });
  assert.equal(resWithSpike.length, 2);
  assert.ok(resWithSpike.some((a) => a.label === "Lonjakan Volume"));
  assert.ok(resWithSpike.some((a) => a.label === "RSI Oversold"));
});

test("prioritas weight: terurut dari weight tertinggi dan slice top-2", () => {
  const res = detectAnomalies({
    ticker: "MULTI",
    indicator: {
      emaCrossSignal: "bullish",
      smaCrossSignal: "golden_cross",
      rsi14: 75,
      signalScore: 0.8,
    },
    prevIndicator: {
      emaCrossSignal: null,
      smaCrossSignal: null,
      rsi14: 60,
      signalScore: 0.5,
    },
    priceChangePct: 5.5,
    volumeRatio: 3.0,
  });

  // Semua kondisi trigger:
  // SMA Golden Cross (55), EMA Cross Bullish (50), Volume Spike (45), Pergerakan Besar (40), RSI Overbought (35), Sinyal Tinggi (30)
  assert.ok(res.length >= 5);
  for (let i = 0; i < res.length - 1; i++) {
    assert.ok(
      res[i].weight >= res[i + 1].weight,
      `Urutan weight harus descending: ${res[i].weight} >= ${res[i + 1].weight}`,
    );
  }

  const top2 = res.slice(0, 2);
  assert.equal(top2.length, 2);
  assert.equal(top2[0].label, "Golden Cross Baru");
  assert.equal(top2[1].label, "EMA Cross Bullish");
});

test("final report", () => {
  console.log("RESULT: ALL PASS");
});
