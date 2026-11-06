import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSahamViewMode } from "../saham-view";
import { filterSwingCandidates } from "../stocks-swing-panel";
import { computeBreadthRatios } from "../stocks-pasar-panel";

test("parseSahamViewMode: maps valid view query params to SahamViewMode", () => {
  assert.equal(parseSahamViewMode(null), "semua");
  assert.equal(parseSahamViewMode(undefined), "semua");
  assert.equal(parseSahamViewMode("unknown"), "semua");
  assert.equal(parseSahamViewMode("screener"), "screener");
  assert.equal(parseSahamViewMode("swing"), "swing");
  assert.equal(parseSahamViewMode("pasar"), "pasar");
  // When allowExtended is false (e.g. CRYPTO), swing & pasar fallback to semua
  assert.equal(parseSahamViewMode("swing", false), "semua");
  assert.equal(parseSahamViewMode("pasar", false), "semua");
  assert.equal(parseSahamViewMode("screener", false), "screener");
});

test("filterSwingCandidates: caps candidates at max (default 12) and handles null/empty safely", () => {
  assert.deepEqual(filterSwingCandidates(null), []);
  assert.deepEqual(filterSwingCandidates(undefined), []);

  const mock = Array.from({ length: 15 }, (_, idx) => ({
    ticker: `T${idx}.JK`,
    name: `Emiten ${idx}`,
    sector: "Finance",
    close: 1000,
    signalScore: 0.75,
    healthScore: 80,
    healthMeta: { color: "green", bg: "green", label: "Kuat" },
    signalLabel: "STRONG_BUY",
    rsi14: 55,
    atr: 25,
    sma50: 950,
    distanceSma50Pct: 5.2,
    estimatedRR: 2.1,
    estimatedStop: 960,
    estimatedTarget: 1085,
  }));

  const top12 = filterSwingCandidates(mock);
  assert.equal(top12.length, 12);
  assert.equal(top12[0].ticker, "T0.JK");
  assert.equal(top12[11].ticker, "T11.JK");
});

test("computeBreadthRatios: computes percentage bars summing to 100%", () => {
  const r = computeBreadthRatios(300, 200, 100);
  assert.equal(r.advPct, 50);
  assert.equal(r.decPct, 33);
  assert.equal(r.unchPct, 17);
  assert.equal(r.advPct + r.decPct + r.unchPct, 100);

  const empty = computeBreadthRatios(0, 0, 0);
  assert.equal(empty.advPct, 0);
  assert.equal(empty.decPct, 0);
  assert.equal(empty.unchPct, 100);
});
