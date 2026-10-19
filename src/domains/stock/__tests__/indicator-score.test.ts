import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSignalScore,
  detectGorengan,
} from "../indicator.service";

/**
 * Coverage night/test-2026-10-19-01 — signal-score engine (TRUST pillar).
 *
 * computeSignalScore = label sinyal publik (Strong Bullish…Strong Bearish) yang
 * dipakai halaman saham, community signal-detector, dan feeds verdict-prose +
 * track-record. detectGorengan = guard "hype_alert". Keduanya pure — sebelumnya
 * ZERO test (risk: regresi diam-diam mengubah label trust yang dilihat user).
 *
 * Angka expected dihitung manual dari bobot di implementasi:
 *   SMA .10 · EMA .10 · Supertrend .10 · ADX .10 · RSI .12 · MACD .12
 *   · Stoch .11 · OBV .125 · VWAP .125  (total = 1.00)
 * Label mapping: score < -0.6 Strong Bearish · < -0.2 Bearish · < 0.2 Netral
 *   · < 0.6 Bullish · else Strong Bullish.
 */

const base = {
  price: 105, sma20: 100, sma50: 95, sma200: 90,
  ema12: 102, ema26: 98,
  rsi14: 55, macdHist: 0.5,
  stochK: 60, stochD: 50,
  adx: 30,
  supertrend: 100,
  obvTrend: "Accumulation",
  vwap: 101,
};

describe("computeSignalScore — agregasi 9 indikator → label", () => {
  it("semua null → breakdown 9 netral, score 0, label Netral", () => {
    const allNull = Object.fromEntries(
      Object.keys(base).map((k) => [k, null]),
    ) as unknown as Parameters<typeof computeSignalScore>[0];
    const r = computeSignalScore(allNull);
    assert.equal(r.breakdown.length, 9, "9 indikator selalu tercatat");
    assert.ok(r.breakdown.every((b) => b.sentiment === "netral"));
    assert.equal(r.score, 0);
    assert.equal(r.label, "Netral");
  });

  it("fixture bullish penuh → score 0.88 Strong Bullish (RSI 55 = netral)", () => {
    const r = computeSignalScore(base);
    // positif: SMA,EMA,ST,ADX (.40) + MACD .12 + Stoch .11 + OBV .125 + VWAP .125
    // netral : RSI .12  → 0.40+0.12+0.11+0.25 = 0.88
    assert.equal(r.score, 0.88);
    assert.equal(r.label, "Strong Bullish");
    const rsi = r.breakdown.find((b) => b.name === "RSI");
    assert.equal(rsi?.sentiment, "netral", "RSI 55 zona sehat = netral");
  });

  it("bearish berat → tepat -0.58 'Bearish': ADX(+0.10) & stoch-oversold(+0.11) meredam dari -0.79", () => {
    const r = computeSignalScore({
      ...base,
      price: 90, sma20: 100, sma50: 95, sma200: 92,
      ema12: 95, ema26: 99,
      rsi14: 75, macdHist: -0.5,
      stochK: 15, stochD: 25,
      supertrend: 100,
      obvTrend: "Distribution",
      vwap: 95,
    });
    // negatif: SMA,EMA,ST,RSI,MACD,OBV,VWAP = -0.79; positif: ADX .10 (ukur
    // kekuatan tren, arah-agnostik) + Stoch .11 (jenuh jual = potensi rebound).
    // Pin quirk ini: market jatuh dalam + tren kuat + oversold TIDAK bisa
    // mencapai Strong Bearish — damping by design dari translator.
    assert.equal(r.score, -0.58);
    assert.equal(r.label, "Bearish");
    const adx = r.breakdown.find((b) => b.name === "ADX");
    assert.equal(adx?.sentiment, "positif", "ADX ukur kekuatan tren, bukan arah");
    const stoch = r.breakdown.find((b) => b.name === "Stochastic");
    assert.equal(stoch?.sentiment, "positif", "stoch <20 dibaca peluang rebound");
  });

  it("bearish murni tanpa peredam (ADX null, stoch overbought) → -0.79 Strong Bearish", () => {
    const r = computeSignalScore({
      ...base,
      price: 90, sma20: 100, sma50: 95, sma200: 92,
      ema12: 95, ema26: 99,
      rsi14: 75, macdHist: -0.5,
      stochK: 85, stochD: 80,   // >80 overbought → negatif
      adx: null,                // netral 0 — tanpa peredam ADX
      supertrend: 100,
      obvTrend: "Distribution",
      vwap: 95,
    });
    // Semua 9 bobot negatif kecuali ADX (null=0): -(0.79+0.11) = -0.90.
    assert.equal(r.score, -0.9);
    assert.equal(r.label, "Strong Bearish");
  });

  it("ADX positif sendirian (0.10) tidak cukup jadi Bullish — label Netral", () => {
    const onlyAdx = { ...Object.fromEntries(Object.keys(base).map((k) => [k, null])), adx: 30 } as unknown as Parameters<typeof computeSignalScore>[0];
    const r = computeSignalScore(onlyAdx);
    assert.equal(r.score, 0.1);
    assert.equal(r.label, "Netral");
  });

  it("bobot breakdown selalu berjumlah tepat 1.00", () => {
    const r = computeSignalScore(base);
    const sum = r.breakdown.reduce((s, b) => s + b.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum=${sum}`);
  });

  it("monoton: membalik VWAP turun mengurangi score 0.25 (±2×0.125)", () => {
    const up = computeSignalScore(base).score;
    const down = computeSignalScore({ ...base, vwap: 110 }).score; // price 105 < vwap
    assert.ok(Math.abs((up - down) - 0.25) < 1e-9, `delta=${up - down}`);
  });
});

describe("detectGorengan — guard hype (>=2 flag)", () => {
  const calm = {
    price: 5000, high: 5100, low: 4950,          // swing 3%
    sma200: 4900,                                 // deviasi 2%
    volume: 1_000_000, avgVolume20d: 1_000_000,   // 1.0x
    marketCap: 1_500_000_000_000,                 // 1.5T
  };

  it("sahham tenang besar → 0 flag, false", () => {
    assert.equal(detectGorengan(calm), false);
  });

  it("volume 6x + swing 18% → 2 flag, true", () => {
    assert.equal(
      detectGorengan({ ...calm, volume: 6_000_000, high: 5600, low: 4700 }),
      true,
    );
  });

  it("smallcap + deviasi >40% dari SMA200 → 2 flag, true", () => {
    assert.equal(
      detectGorengan({ ...calm, marketCap: 500_000_000_000, price: 7500 }),
      true,
    );
  });

  it("1 flag saja (swing 18%) → false — butuh >=2", () => {
    assert.equal(detectGorengan({ ...calm, high: 5600, low: 4700 }), false);
  });

  it("null-safe: avgVolume/sma200/marketCap null + swing kecil → false", () => {
    assert.equal(
      detectGorengan({ ...calm, avgVolume20d: null, sma200: null, marketCap: null }),
      false,
    );
  });

  it("null-safe: swing besar sendirian (metrik lain null) = hanya 1 flag → false", () => {
    // Pin perilaku: indikator null tidak dihitung flag — swing 18% saja tak cukup.
    assert.equal(
      detectGorengan({ ...calm, avgVolume20d: null, sma200: null, marketCap: null, high: 5600, low: 4700 }),
      false,
    );
  });

  it("null-safe: swing besar + smallcap (2 flag nyata) → true walau volume/sma null", () => {
    assert.equal(
      detectGorengan({ ...calm, avgVolume20d: null, sma200: null, marketCap: 500_000_000_000, high: 5600, low: 4700 }),
      true,
    );
  });

  it("avgVolume20d=0 tidak memicu flag volume (guard div-0)", () => {
    assert.equal(
      detectGorengan({ ...calm, avgVolume20d: 0, volume: 6_000_000 }),
      false,
    );
  });
});
