/**
 * Self-test for src/lib/verdict-prose.ts.
 * Run: npx tsx --tsconfig tsconfig.json scripts/selftest-verdict-prose.ts
 *
 * No test framework — assert-based, exits non-zero on failure.
 */
import {
  summarizeVerdict,
  explainMove,
  rankDrivers,
  toSnapshot,
  type IndicatorSnapshot,
} from "../../src/lib/verdict-prose";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("  ✗ " + msg);
  } else {
    console.log("  ✓ " + msg);
  }
}

const bare = (o: Partial<IndicatorSnapshot>): IndicatorSnapshot => ({
  rsi14: null,
  macdHist: null,
  sma20: null,
  sma50: null,
  sma200: null,
  stochK: null,
  adx: null,
  obvTrend: null,
  signalLabel: null,
  smaCrossSignal: null,
  emaCrossSignal: null,
  ...o,
});

console.log("\n[1] rankDrivers — each branch fires + ranks in order");

// verdict flip
const d1 = rankDrivers(
  bare({ signalLabel: "Bullish" }),
  bare({ signalLabel: "Bearish" }),
  1.0,
);
assert(d1[0]?.kind === "verdict" && d1[0]?.rank === 30, "verdict flip ranks 30");

// golden cross
const d2 = rankDrivers(
  bare({ smaCrossSignal: "golden_cross" }),
  bare({ smaCrossSignal: "death_cross" }),
  0.5,
);
assert(d2[0]?.kind === "crossover" && d2[0]?.label === "Golden cross", "golden cross detected");

// MACD sign flip
const d3 = rankDrivers(
  bare({ macdHist: 5 }),
  bare({ macdHist: -3 }),
  0.5,
);
assert(d3[0]?.label === "MACD bullish cross", "MACD bullish cross detected");

// big gap
const d4 = rankDrivers(bare({}), bare({}), 6.4);
assert(d4[0]?.kind === "gap" && d4[0]?.label === "Naik 6.4%", "gap detected with formatted %");
assert(d4[0]?.rank === 16.4, "gap rank = 10 + min(|gap|,10) [fractional, sort-only]");

// flat day, no changes
const d5 = rankDrivers(bare({}), bare({}), 0.2);
assert(d5.length === 0, "flat day yields no drivers");

console.log("\n[2] explainMove — headline + no gated-decimal leak");

const e1 = explainMove({
  ticker: "BBRI.JK",
  latest: bare({ signalLabel: "Bullish", macdHist: 5 }),
  prev: bare({ signalLabel: "Bearish", macdHist: -3 }),
  changePercent: 4.2,
  volumeMultiple: 2.1,
});
assert(e1 !== null, "explainer returns non-null");
assert(e1!.headline.startsWith("BBRI naik 4.2%"), "headline leads with ticker + move");
assert(e1!.primary?.kind === "verdict", "primary driver is verdict flip");
assert(e1!.prose.includes("2.1×"), "volume multiple included");
// No exact RSI/MACD decimals should appear (only the price % and volume multiple).
const gatedDecimals = /RSI (?:adalah|=)\s*\d|\bmacdHist\b|MACD (?:adalah|=)\s*-?\d/.test(e1!.prose);
assert(!gatedDecimals, "no gated indicator decimals leaked in prose");
console.log("    prose: " + e1!.prose);

const e2 = explainMove({
  ticker: "TLKM.JK",
  latest: bare({}),
  prev: bare({}),
  changePercent: 0.2,
});
assert(e2!.direction === "datar" && !e2!.hasSignal, "sub-0.5% + no signal → datar, hasSignal false");

// Rich snapshot with trend context + monitoring paragraphs
const eRich = explainMove({
  ticker: "BMRI.JK",
  latest: bare({
    signalLabel: "Bullish",
    rsi14: 72,
    macdHist: 2.5,
    sma20: 6800,
    sma50: 6500,
    sma200: 6000,
    smaCrossSignal: "golden_cross",
  }),
  prev: bare({
    signalLabel: "Bullish",
    macdHist: 1.2,
    rsi14: 65,
  }),
  changePercent: 2.8,
  volumeMultiple: 1.8,
  close: 7000,
});
assert(eRich !== null, "eRich returns non-null");
const paragraphs = eRich!.prose.split("\n\n");
assert(paragraphs.length === 3, "explainer prose contains 3 paragraphs");
assert(/SMA20/.test(paragraphs[1]) && /SMA50/.test(paragraphs[1]), "paragraph 2 covers SMA20 and SMA50 trend context");
assert(/jenuh beli|overbought/.test(paragraphs[2]), "paragraph 3 warns of overbought RSI condition");
assert(/MACD/.test(paragraphs[2]), "paragraph 3 covers MACD histogram dynamic");
const sentenceCount = eRich!.prose.split(/[.!?](?:\s+|$)/).filter(s => s.trim().length > 0).length;
assert(sentenceCount >= 6 && sentenceCount <= 8, `prose expanded to 6-8 sentences (actual: ${sentenceCount})`);
const richNoDecimals = !/RSI (?:adalah|=|\d)|SMA(?:20|50|200)\s*(?:adalah|=|\d{3,})/.test(eRich!.prose);
assert(richNoDecimals, "no raw indicator decimals leaked in rich prose");
console.log("    rich prose sentences:", sentenceCount);
console.log("    rich prose:\n" + eRich!.prose);

console.log("\n[3] summarizeVerdict — distinct per snapshot, aligned to outlook");

const sBull = summarizeVerdict(
  bare({ rsi14: 55, macdHist: 2, sma50: 100, obvTrend: "Accumulation" }),
  "Bullish",
  105,
);
const sBear = summarizeVerdict(
  bare({ rsi14: 75, macdHist: -1, sma50: 100, smaCrossSignal: "death_cross" }),
  "Bearish",
  95,
);
const sNeut = summarizeVerdict(bare({ rsi14: 50, macdHist: 0.1, sma50: 100 }), "Neutral", 100);
assert(sBull !== sBear && sBull !== sNeut, "bull/bear/neutral prose are distinct");
assert(/MACD positif/.test(sBull), "bull names MACD positif");
assert(/death cross/.test(sBear), "bear names death cross");
console.log("    bull: " + sBull);
console.log("    bear: " + sBear);
console.log("    neut: " + sNeut);

// null snapshot fallback still produces outlook-aligned text
const sNull = summarizeVerdict(null, "Bullish");
assert(/bullish/i.test(sNull), "null snapshot falls back to outlook text");

console.log("\n[4] toSnapshot — coerces Decimal-like to numbers");
const snap = toSnapshot({
  rsi14: { toString: () => "55.12" },
  macdHist: { toString: () => "2.4" },
  sma20: null,
  sma50: { toString: () => "100" },
  sma200: null,
  stochK: null,
  adx: null,
  obvTrend: "Accumulation",
  signalLabel: "Bullish",
  smaCrossSignal: null,
  emaCrossSignal: null,
});
assert(snap.rsi14 === 55.12 && snap.sma20 === null && snap.obvTrend === "Accumulation", "coerces decimals + passes strings/nulls");

console.log("\n" + (failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`));
process.exit(failures === 0 ? 0 : 1);
