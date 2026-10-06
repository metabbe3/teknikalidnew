import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decidePublish, factCheckMetaFor } from "./publish-gate";
import type { FactCheckResult, MarketContext } from "./article-fact-check";

/**
 * Publish Fact-Check Gate unit tests (prd-2026-10-05-01).
 * Pure decision logic — no DB, no AI, no mocks beyond plain fixtures.
 *
 * Fixtures mirror the historical P1 incidents (qa-2026-09-30-01 wrong-day
 * breadth, qa-2026-10-01-01 wrong RSI superlative, qa-2026-10-04-01 wrong
 * GOTO RSI): content with wrong numbers that fact-check flags, but where
 * no deterministic/AI correction is available.
 */

const ctx = null as unknown as MarketContext; // not used by decision logic

function fc(partial: Partial<FactCheckResult>): FactCheckResult {
  return {
    passed: false,
    mismatches: [],
    correctedContent: null,
    correctedTitle: null,
    meta: { claimsChecked: 5, checkedAt: "2026-10-06T00:00:00.000Z" },
    ...partial,
  } as FactCheckResult;
}

void ctx;

describe("decidePublish — publish path (fail-open, healthy)", () => {
  it("fact-check unavailable → publish (fail-open, AC5: gate must not kill the brief pipeline)", () => {
    assert.deepEqual(decidePublish(null), { action: "publish" });
  });

  it("passed → publish", () => {
    assert.deepEqual(decidePublish(fc({ passed: true })), { action: "publish" });
  });

  it("passed with zero claims checked (no numbers in text) → publish", () => {
    assert.deepEqual(
      decidePublish(fc({ passed: true, meta: { claimsChecked: 0, checkedAt: "x" } })),
      { action: "publish" },
    );
  });
});

describe("decidePublish — corrected path (AC1)", () => {
  it("!passed + correctedContent → publish-corrected", () => {
    const r = fc({ correctedContent: "fixed body" });
    assert.deepEqual(decidePublish(r), { action: "publish-corrected" });
  });

  it("!passed + correctedTitle only (title mismatch, body clean) → publish-corrected", () => {
    // Preserves the title-only branch at article-fact-check.ts L272-294.
    const r = fc({ correctedTitle: "fixed title", correctedContent: null });
    assert.deepEqual(decidePublish(r), { action: "publish-corrected" });
  });
});

describe("decidePublish — hold-draft path (the 12 P1 incidents)", () => {
  it("!passed + no correction → hold-draft with count in reason (qa-2026-09-30-01 shape: 582 saham turun wrong-day)", () => {
    const r = fc({
      mismatches: [
        { claim: "582 saham turun", statedValue: 582, actualValue: 311, description: "salah hari" },
      ],
    });
    const d = decidePublish(r);
    assert.equal(d.action, "hold-draft");
    assert.match(d.reason, /1 klaim angka/);
  });

  it("!passed + empty mismatches (total gate failure) → hold-draft generic reason", () => {
    const d = decidePublish(fc({}));
    assert.equal(d.action, "hold-draft");
    assert.match(d.reason, /gagal total/);
  });

  it("multiple mismatches without correction → count reflected (qa-2026-09-28-02 shape: 4 EMA values wrong)", () => {
    const mm = [1, 2, 3, 4].map((i) => ({
      claim: `EMA${i}`,
      statedValue: 383,
      actualValue: 300 + i,
      description: "tabel EMA salah",
    }));
    const d = decidePublish(fc({ mismatches: mm }));
    assert.equal(d.action, "hold-draft");
    assert.match(d.reason, /4 klaim angka/);
  });
});

describe("factCheckMetaFor — AC4 visibility", () => {
  it("null fact-check → factCheckPassed=unavailable (distinguishable in SQL)", () => {
    assert.deepEqual(factCheckMetaFor(null, false), { factCheckPassed: "unavailable" });
  });

  it("held article → factCheckHeld=true recorded", () => {
    const m = factCheckMetaFor(fc({}), true);
    assert.equal(m.factCheckHeld, "true");
    assert.equal(m.factCheckErrors, "0");
  });

  it("corrected article → factCheckCorrected=true, no factCheckHeld", () => {
    const m = factCheckMetaFor(fc({ correctedContent: "x" }), false);
    assert.equal(m.factCheckCorrected, "true");
    assert.equal(m.factCheckHeld, undefined);
  });
});
