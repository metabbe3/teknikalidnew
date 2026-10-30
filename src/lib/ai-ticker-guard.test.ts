import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectTickerInText, extractTickersRanked } from "./ai-ticker-guard";

const cases: [string, string | null][] = [
  ["Saham apa yang lagi oke hari ini?", null],
  ["apakah bbca layak di beli ?", "BBCA"],
  ["BBCA kenapa turun?", "BBCA"],
  ["bandingin sama BBRI dong", "BBRI"],
  ["data macd rsi gimana?", null],
  ["aku nyangkut di 5200 gimana", null],
  ["DATA saham apa yang bagus", "DATA"],
  ["naik atau turun ya besok", null],
  ["bank mana yang bagus", null],
  ["CUAN masih bisa naik?", "CUAN"],
  ["unit link itu apa", null],
  ["SUPA kenapa ya", "SUPA"],
  ["pada satu titik saham apa aman?", null],
  ["saham CUAN gimana?", "CUAN"],
  ["gimana prospek saham EMAS?", "EMAS"],
  ["$CUAN masih worth it?", "CUAN"],
  ["buat awal bulan saham apa?", null],
  ["bca vs bri mana bagus", "BBCA"],
  ["MACD & VWAP itu apa?", null],
  ["support terdekatnya berapa?", null],
];

describe("ai-ticker-guard v2 (whitelist 939 + homonym 107)", () => {
  for (const [q, want] of cases) {
    it(`${q} → ${want}`, () => {
      assert.equal(detectTickerInText(q), want);
    });
  }
  it("ranked: COMPARE dua ticker", () => {
    assert.deepEqual(extractTickersRanked("bandingin BBCA sama BBRI dong"), ["BBCA", "BBRI"]);
  });
});
