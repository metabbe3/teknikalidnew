import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeGeneratedContent } from "./content-sanitizer";

/**
 * Same call pattern the service uses for LLM excerpt/title fields:
 *   sanitizeGeneratedContent(result.excerpt ?? "").slice(0, 500)
 *   resolveTitle(sanitizeGeneratedContent(result.title), ...)
 */
describe("sanitizeGeneratedContent — LLM excerpt field", () => {
  it("fixes 'saam' typo in excerpt via service call pattern", () => {
    const excerpt = "IHSG dibuka menguat, saam banking memimpin kenaikan hari ini.";
    const persisted = sanitizeGeneratedContent(excerpt ?? "").slice(0, 500);
    assert.equal(persisted, "IHSG dibuka menguat, saham banking memimpin kenaikan hari ini.");
  });

  it("rewrites '11,5 juta lot' to '11,5 juta saham' in excerpt", () => {
    const excerpt = "Volume BBCA melonjak menjadi 11,5 juta lot pada sesi pertama.";
    const persisted = sanitizeGeneratedContent(excerpt ?? "").slice(0, 500);
    assert.equal(persisted, "Volume BBCA melonjak menjadi 11,5 juta saham pada sesi pertama.");
  });

  it("truncates to 500 chars after sanitizing", () => {
    const excerpt = `saam ${"x".repeat(600)}`;
    const persisted = sanitizeGeneratedContent(excerpt ?? "").slice(0, 500);
    assert.equal(persisted.length, 500);
    assert.ok(persisted.startsWith("saham "));
  });
});

describe("sanitizeGeneratedContent — LLM title field", () => {
  it("fixes 'saam' typo in title", () => {
    const title = "Analisa Teknikal: saam TLKM berpotensi naik";
    assert.equal(sanitizeGeneratedContent(title), "Analisa Teknikal: saham TLKM berpotensi naik");
  });
});

describe("sanitizeGeneratedContent — static (non-LLM) text untouched", () => {
  it("is identity on clean template excerpt", () => {
    const template = "Analisa teknikal BBCA berdasarkan indikator RSI, MACD, SMA, Bollinger Bands, dan lainnya. Data terkini per September 2026.";
    assert.equal(sanitizeGeneratedContent(template), template);
  });

  it("keeps legitimate educational prose about 'lot' (1 lot = 100 saham)", () => {
    const educational = "Di IDX, 1 lot = 100 saham, jadi 5 lot artinya 500 saham.";
    assert.equal(sanitizeGeneratedContent(educational), educational);
  });
});
