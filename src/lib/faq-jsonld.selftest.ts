/**
 * Selftest for buildFaqJsonLd pure function.
 * Run: npx tsx --test src/lib/faq-jsonld.selftest.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildFaqJsonLd } from "./faq-jsonld";

const FORBIDDEN_WORDS = [/\brekomendasi\b/i, /\bbeli sekarang\b/i, /\bjual sekarang\b/i, /\bcut loss\b/i];

function assertNoRecommendation(text: string) {
  for (const regex of FORBIDDEN_WORDS) {
    assert.equal(
      regex.test(text),
      false,
      `Teks tidak boleh mengandung rekomendasi beli/jual agresif (${regex}): "${text}"`,
    );
  }
}

test("valid struktur FAQPage dan Q&A (array facts)", () => {
  const result = buildFaqJsonLd({
    ticker: "BBCA.JK",
    verdictLine:
      "EMA bullish dan RSI 62 menunjukkan momentum menguat dan belum overbought, menarik untuk kamu watch.",
    facts: [
      "Skor sinyal: +0,45 (Bullish) pada skala −1 s.d. +1",
      "Moving Average: Terbentuk Golden Cross mengindikasikan tren kenaikan solid",
      "Volume: 12,5 jt lembar (1,5x di atas rata-rata 20 sesi — minat transaksi tinggi)",
    ],
    asOf: "21 Nov 2026",
  });

  assert.ok(result !== null, "Result tidak boleh null");
  assert.equal(result["@context"], "https://schema.org");
  assert.equal(result["@type"], "FAQPage");
  assert.ok(Array.isArray(result.mainEntity));
  assert.ok(
    result.mainEntity.length >= 2 && result.mainEntity.length <= 3,
    `Jumlah Q&A harus 2-3, aktual: ${result.mainEntity.length}`,
  );

  // Q1: Kondisi teknikal
  const q1 = result.mainEntity[0];
  assert.equal(q1["@type"], "Question");
  assert.match(q1.name, /kondisi teknikal BBCA hari ini/i);
  assert.equal(q1.acceptedAnswer["@type"], "Answer");
  assert.match(q1.acceptedAnswer.text, /EMA bullish dan RSI 62/);
  assert.match(q1.acceptedAnswer.text, /Skor sinyal/);
  assertNoRecommendation(q1.acceptedAnswer.text);

  // Q2: Arti skor sinyal
  const q2 = result.mainEntity[1];
  assert.equal(q2["@type"], "Question");
  assert.match(q2.name, /skor sinyal.*BBCA/i);
  assert.equal(q2.acceptedAnswer["@type"], "Answer");
  assert.match(q2.acceptedAnswer.text, /bullish.*kamu/i);
  assertNoRecommendation(q2.acceptedAnswer.text);

  // Q3: Moving average & volume
  const q3 = result.mainEntity[2];
  assert.ok(q3, "Q3 harus ada ketika MA dan volume tersedia");
  assert.equal(q3["@type"], "Question");
  assert.match(q3.acceptedAnswer.text, /Golden Cross/);
  assert.match(q3.acceptedAnswer.text, /Volume/);
});

test("valid struktur FAQPage dengan facts object", () => {
  const result = buildFaqJsonLd({
    ticker: "BBRI",
    verdictLine:
      "Tekanan penurunan masih dominan dan indikator cenderung melemah, waspadai risiko koreksi.",
    facts: {
      scoreFormatted: "-0,40",
      labelText: "Bearish",
      crossFact: "EMA 12 melintas ke bawah EMA 26 — momentum jangka pendek melemah",
      volumeFact: "Perdagangan relatif sepi di bawah rata-rata 20 sesi",
    },
    asOf: "21 Nov 2026",
  });

  assert.ok(result !== null);
  assert.equal(result["@type"], "FAQPage");
  assert.equal(result.mainEntity.length, 3);

  const q1 = result.mainEntity[0];
  assert.match(q1.name, /BBRI/);
  assert.match(q1.acceptedAnswer.text, /Tekanan penurunan masih dominan/);
  assert.match(q1.acceptedAnswer.text, /-0,40/);

  const q2 = result.mainEntity[1];
  assert.match(q2.name, /-0,40 \(Bearish\)/);
  assert.match(q2.acceptedAnswer.text, /bearish.*waspada/i);

  const q3 = result.mainEntity[2];
  assert.match(q3.acceptedAnswer.text, /EMA 12 melintas ke bawah EMA 26/);
});

test("kasus netral: menghasilkan penjelasan netral/konsolidasi", () => {
  const result = buildFaqJsonLd({
    ticker: "TLKM",
    verdictLine:
      "Kondisi teknikal relatif berimbang tanpa arah tren yang dominan, kamu bisa pantau support-resistance.",
    facts: [
      "Skor sinyal: +0,05 (Netral) pada skala −1 s.d. +1",
    ],
  });

  assert.ok(result !== null);
  assert.equal(result.mainEntity.length, 2);

  const q2 = result.mainEntity[1];
  assert.match(q2.acceptedAnswer.text, /netral|konsolidasi.*kamu/i);
});

test("no undefined/null leak ke JSON string", () => {
  const result = buildFaqJsonLd({
    ticker: "ASII",
    verdictLine: "Pergerakan harga stabil dan tren terjaga.",
    facts: [
      "Skor sinyal: +0,20 (Bullish) pada skala −1 s.d. +1",
    ],
    asOf: null,
  });

  assert.ok(result !== null);
  const jsonStr = JSON.stringify(result);

  assert.equal(jsonStr.includes("undefined"), false, "JSON string tidak boleh mengandung 'undefined'");
  assert.equal(jsonStr.includes(":null"), false, "JSON string tidak boleh mengandung property ':null'");
  assert.equal(jsonStr.includes('"null"'), false, "JSON string tidak boleh mengandung string '\"null\"'");
});

test("escape karakter kutip dan simbol khusus", () => {
  const result = buildFaqJsonLd({
    ticker: `GOTO "Tech"`,
    verdictLine: `Harga di atas "SMA 20" & momentum <kuat>, menarik untuk kamu watch 'hari ini'.`,
    facts: [
      `Skor sinyal: +0,50 ("Strong Buy") pada skala −1 s.d. +1`,
    ],
  });

  assert.ok(result !== null);
  const jsonStr = JSON.stringify(result);

  // Parsing JSON string harus valid tanpa throw SyntaxError
  assert.doesNotThrow(() => {
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed["@type"], "FAQPage");
    assert.equal(parsed.mainEntity[0]["@type"], "Question");
  });

  // Karakter kutip harus ter-escape dengan benar
  const parsed = JSON.parse(jsonStr);
  assert.match(parsed.mainEntity[0].acceptedAnswer.text, /"SMA 20"/);
});

test("kasus null / invalid: harus return null", () => {
  // Verdict kosong/null
  assert.equal(buildFaqJsonLd({ ticker: "BBCA", verdictLine: null }), null);
  assert.equal(buildFaqJsonLd({ ticker: "BBCA", verdictLine: "" }), null);
  assert.equal(buildFaqJsonLd({ ticker: "BBCA", verdictLine: "   " }), null);

  // Ticker kosong
  assert.equal(buildFaqJsonLd({ ticker: "", verdictLine: "Verdict valid" }), null);

  // Parameter null / undefined
  assert.equal(buildFaqJsonLd(null), null);
  assert.equal(buildFaqJsonLd(undefined), null);
});

test("final report", () => {
  console.log("RESULT: ALL PASS (valid struktur FAQPage, array Question/acceptedAnswer, no undefined/null leak, escape karakter kutip)");
});
