import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  savedScreenerFiltersSchema,
  MAX_SAVED_FILTERS_LENGTH,
} from "../validation";

/**
 * AC2 prd-2026-10-03-02 (PRD idea-2026-10-03-1): POST/PUT /api/screener/saved
 * must whitelist screener-param keys + cap serialized filters at 512 chars.
 *
 * Fixtures below are the REAL shapes the client emits:
 *  - preset mode:  screener-client.tsx guestSaveFilters -> { preset, rsi_max }
 *  - custom mode:  screener-presets.tsx buildParams -> snake_case numbers via
 *                  apiMap + camelCase boolean toggles (macdBullish, ...)
 *  - legacy rows:  camelCase number keys (rsiMax, adxMin) re-saved via PUT
 */
describe("savedScreenerFiltersSchema \u2014 valid client shapes", () => {
  it("accepts preset-only save (golden_cross)", () => {
    const r = savedScreenerFiltersSchema.safeParse({ preset: "golden_cross" });
    assert.equal(r.success, true);
  });

  it("accepts preset + slider param (rsi_oversold + rsi_max)", () => {
    const r = savedScreenerFiltersSchema.safeParse({ preset: "rsi_oversold", rsi_max: "25" });
    assert.equal(r.success, true);
  });

  it("accepts custom-builder boolean toggles (camelCase)", () => {
    const r = savedScreenerFiltersSchema.safeParse({
      macdBullish: "true",
      aboveSma200: "true",
      bbSqueeze: "true",
      excludeGorengan: "true",
    });
    assert.equal(r.success, true);
  });

  it("accepts custom-builder numeric params incl. negative decimals", () => {
    const r = savedScreenerFiltersSchema.safeParse({
      rsi_min: "15",
      rsi_max: "30",
      stoch_k_max: "20",
      adx_min: "25",
      signal_score_min: "-0.2",
    });
    assert.equal(r.success, true);
  });

  it("accepts legacy camelCase keys re-saved from old rows (PUT path)", () => {
    const r = savedScreenerFiltersSchema.safeParse({ rsiMax: "30", adxMin: "25", stochKMax: "20" });
    assert.equal(r.success, true);
  });

  it("accepts sort/assetClass/sector extras", () => {
    const r = savedScreenerFiltersSchema.safeParse({
      sort_by: "rsi14",
      sort_order: "asc",
      assetClass: "EQUITY",
      sector: "Perbankan,Energi",
    });
    assert.equal(r.success, true);
  });

  it("accepts empty object (radar-guest fulfill path saves {})", () => {
    const r = savedScreenerFiltersSchema.safeParse({});
    assert.equal(r.success, true);
  });
});

describe("savedScreenerFiltersSchema \u2014 rejects junk (AC2 whitelist + cap)", () => {
  it("rejects unknown key", () => {
    const r = savedScreenerFiltersSchema.safeParse({ foo: "bar" });
    assert.equal(r.success, false);
  });

  it("rejects HTML/script key (log-injection guard)", () => {
    const r = savedScreenerFiltersSchema.safeParse({ "<script>": "x" });
    assert.equal(r.success, false);
  });

  it("rejects quote/semicolon payload outside charset", () => {
    const r = savedScreenerFiltersSchema.safeParse({ preset: "golden_cross' or '1'='1" });
    assert.equal(r.success, false);
  });

  it("rejects non-string value (number)", () => {
    const r = savedScreenerFiltersSchema.safeParse({ rsi_max: 30 });
    assert.equal(r.success, false);
  });

  it("rejects non-object input (array / null / string)", () => {
    assert.equal(savedScreenerFiltersSchema.safeParse(["preset"]).success, false);
    assert.equal(savedScreenerFiltersSchema.safeParse(null).success, false);
    assert.equal(savedScreenerFiltersSchema.safeParse("preset=golden_cross").success, false);
  });

  it("rejects single value longer than 64 chars", () => {
    const r = savedScreenerFiltersSchema.safeParse({ sector: "x".repeat(65) });
    assert.equal(r.success, false);
  });

  it("round-trips: valid shapes serialize under the cap", () => {
    const valid = {
      preset: "rsi_oversold",
      rsi_max: "25",
      sort_by: "rsi14",
      sort_order: "asc",
      assetClass: "EQUITY",
      sector: "Perbankan,Energi",
    };
    assert.ok(JSON.stringify(valid).length <= MAX_SAVED_FILTERS_LENGTH);
    assert.equal(savedScreenerFiltersSchema.safeParse(valid).success, true);
  });
});
