import test, { describe, it } from "node:test";
import assert from "node:assert";
import { generateKenapaMetaDescription, determineSignalTone } from "../src/lib/kenapa-meta";

describe("kenapa-meta deskripsi (deadband, guard, format id-ID, arah sinyal)", () => {
  it("kasus 1: naik besar (>0.5%) dengan format koma id-ID", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "BBCA",
      changePercent: 12.5,
      signalTone: "menguat",
    });
    assert.strictEqual(
      desc,
      "BBCA naik 12,5% didorong penguatan sinyal teknikal — momentum beli dominan di pasar.",
    );
  });

  it("kasus 2: naik mikro 0.04% -> deadband < 0.5% masuk cabang datar (bukan naik 0.0%)", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "TLKM",
      changePercent: 0.04,
      signalTone: "menguat",
    });
    assert.strictEqual(
      desc,
      "TLKM bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.",
    );
  });

  it("kasus 3: turun (< -0.5%) dengan format koma id-ID", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "ASII",
      changePercent: -2.8,
      signalTone: "melemah",
    });
    assert.strictEqual(
      desc,
      "ASII turun 2,8% seiring pelemahan sinyal teknikal — tekanan jual mendominasi pasar.",
    );
  });

  it("kasus 4: 0% / turun mikro (-0.04%) masuk cabang datar", () => {
    const descZero = generateKenapaMetaDescription({
      ticker: "ICBP",
      changePercent: 0,
      signalTone: "netral",
    });
    assert.strictEqual(
      descZero,
      "ICBP bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.",
    );

    const descMicroTurun = generateKenapaMetaDescription({
      ticker: "ICBP",
      changePercent: -0.04,
      signalTone: "melemah",
    });
    assert.strictEqual(
      descMicroTurun,
      "ICBP bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.",
    );
  });

  it("kasus 5: Infinity / -Infinity / NaN guard -> cabang datar, jangan pernah 'Infinity%'", () => {
    const descInf = generateKenapaMetaDescription({
      ticker: "GOTO",
      changePercent: Number.POSITIVE_INFINITY,
      signalTone: "menguat",
    });
    assert.strictEqual(
      descInf,
      "GOTO bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.",
    );

    const descNaN = generateKenapaMetaDescription({
      ticker: "GOTO",
      changePercent: Number.NaN,
      signalTone: "menguat",
    });
    assert.strictEqual(
      descNaN,
      "GOTO bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.",
    );
  });

  it("kasus 6: format persen id-ID (koma bukan titik)", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "BMRI",
      changePercent: 2.5,
      signalTone: "menguat",
    });
    assert.match(desc, /2,5%/);
    assert.doesNotMatch(desc, /2\.5%/);
  });
});

describe("determineSignalTone (threshold P5/P95: -0.20 / +0.34 + guard)", () => {
  it("score > 0.34 menguat, score < -0.20 melemah, di antaranya netral", () => {
    assert.strictEqual(determineSignalTone(null, 0.35), "menguat");
    assert.strictEqual(determineSignalTone(null, 0.34), "netral");
    assert.strictEqual(determineSignalTone(null, 0.10), "netral");
    assert.strictEqual(determineSignalTone(null, -0.19), "netral");
    assert.strictEqual(determineSignalTone(null, -0.21), "melemah");
  });

  it("guard NaN / undefined / null menghasilkan netral", () => {
    assert.strictEqual(determineSignalTone(null, Number.NaN), "netral");
    assert.strictEqual(determineSignalTone(null, null), "netral");
    assert.strictEqual(determineSignalTone(null, undefined), "netral");
  });

  it("primaryDriverTone mengoverride score numerik", () => {
    assert.strictEqual(determineSignalTone("bullish", -0.5), "menguat");
    assert.strictEqual(determineSignalTone("bearish", 0.8), "melemah");
    assert.strictEqual(determineSignalTone("neutral", 0.5), "menguat");
  });
});
