import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { factCheckVerdict, verifyClaim } from "../article-fact-check";

// ── factCheckVerdict — pure gate decision ──

describe("factCheckVerdict", () => {
  it("passed: publish as-is — no hold, no correction", () => {
    const v = factCheckVerdict({ passed: true, correctedContent: null });
    assert.equal(v.holdAsDraft, false);
    assert.equal(v.applyCorrection, false);
  });

  it("failed + correctedContent: apply correction, no hold", () => {
    const v = factCheckVerdict({ passed: false, correctedContent: "fixed article" });
    assert.equal(v.holdAsDraft, false);
    assert.equal(v.applyCorrection, true);
  });

  it("failed + null correction: hold as draft", () => {
    const v = factCheckVerdict({ passed: false, correctedContent: null });
    assert.equal(v.holdAsDraft, true);
    assert.equal(v.applyCorrection, false);
  });

  it("null-safe: failed + empty-string correction counts as uncorrectable → hold", () => {
    const v = factCheckVerdict({ passed: false, correctedContent: "" });
    assert.equal(v.holdAsDraft, true);
    assert.equal(v.applyCorrection, false);
  });
});

// ── verifyClaim stock_rsi — the qa-2026-10-01/04 incident class ──

function rsiLookup(entries: Record<string, number | null>) {
  const map = new Map<string, { close: number | null; changePercent: number | null; rsi14: number | null }>();
  for (const [ticker, rsi14] of Object.entries(entries)) {
    map.set(ticker, { close: null, changePercent: null, rsi14 });
  }
  return map;
}

const noIndex = { level: null, changePercent: null };
const noFx = { rate: null };

describe("verifyClaim — stock_rsi", () => {
  it("RSI within ±1.0 tolerance passes", () => {
    const claim = { claim: "RSI GOTO 10", type: "stock_rsi" as const, ticker: "GOTO", value: 10 };
    const m = verifyClaim(claim, rsiLookup({ GOTO: 10.9 }), noIndex, noFx);
    assert.equal(m, null);
  });

  it("RSI beyond ±1.0 flags mismatch with DB value", () => {
    const claim = { claim: "RSI GOTO 10", type: "stock_rsi" as const, ticker: "GOTO", value: 10 };
    const m = verifyClaim(claim, rsiLookup({ GOTO: 27.4 }), noIndex, noFx);
    assert.ok(m, "expected a mismatch");
    assert.equal(m.claimType, "stock_rsi");
    assert.equal(m.statedValue, 10);
    assert.equal(m.actualValue, 27.4);
  });

  it("null rsi14 in context (indicator missing) = skip, never mismatch", () => {
    const claim = { claim: "RSI BBSI di 11,7", type: "stock_rsi" as const, ticker: "BBSI", value: 11.7 };
    const m = verifyClaim(claim, rsiLookup({ BBSI: null }), noIndex, noFx);
    assert.equal(m, null);
  });

  it("ticker absent from context = skip, never mismatch", () => {
    const claim = { claim: "RSI GOTO 10", type: "stock_rsi" as const, ticker: "GOTO", value: 10 };
    const m = verifyClaim(claim, rsiLookup({ BBCA: 55 }), noIndex, noFx);
    assert.equal(m, null);
  });

  it("boundary: exactly 1.0 off still passes (strict >)", () => {
    const claim = { claim: "RSI BBCA 56", type: "stock_rsi" as const, ticker: "BBCA", value: 56 };
    const m = verifyClaim(claim, rsiLookup({ BBCA: 55 }), noIndex, noFx);
    assert.equal(m, null);
  });
});
