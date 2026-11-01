import test, { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeShortName, normalizeTickerTitle } from "../src/lib/normalize-ticker-title";

describe("shortname-sanitizer", () => {
  it("strips corporate suffixes like (Persero) Tbk", () => {
    assert.strictEqual(
      sanitizeShortName("Bank Syariah Indonesia (Persero) Tbk", "BRIS"),
      "Bank Syariah Indonesia",
    );
  });

  it("fixes (Perser unclosed suffix bug from database", () => {
    assert.strictEqual(
      sanitizeShortName("Bank Syariah Indonesia (Perser", "BRIS"),
      "Bank Syariah Indonesia",
    );
    assert.strictEqual(
      sanitizeShortName("Bank Rakyat Indonesia (Persero", "BBRI"),
      "Bank Rakyat Indonesia",
    );
    assert.strictEqual(
      sanitizeShortName("Alamtri Resources Indonesia Tb", "ADRO"),
      "Alamtri Resources Indonesia",
    );
    assert.strictEqual(
      sanitizeShortName("Adira Dinamika Multi Finance T", "ADMF"),
      "Adira Dinamika Multi Finance",
    );
  });

  it("keeps non-corporate parentheses like (BRI) intact", () => {
    assert.strictEqual(
      sanitizeShortName("Bank Rakyat Indonesia (BRI)", "BBRI"),
      "Bank Rakyat Indonesia (BRI)",
    );
  });

  it("truncates to max 30 characters without cutting words in half", () => {
    const longName = "Perusahaan Perkebunan Kelapa Sawit Nusantara Jaya";
    const res = sanitizeShortName(longName, "TEST", 30);
    assert.ok(res.length <= 30, `length ${res.length} should be <= 30`);
    assert.strictEqual(res, "Perusahaan Perkebunan Kelapa");
    // Verify words are not sliced mid-word
    assert.ok(!res.endsWith("Saw"), "did not cut Sawit in half");
  });

  it("does not truncate in the middle of parentheses", () => {
    // "Perusahaan (Kelapa Sawit) Nusantara" -> if 30 char falls inside (Kelapa Sawit)
    // 30 chars: "Perusahaan (Kelapa Sawit) Nusan"
    const withParen = "Perusahaan (Kelapa Sawit Indonesia) Jaya";
    const res = sanitizeShortName(withParen, "TEST", 30);
    assert.ok(res.length <= 30);
    assert.strictEqual(res, "Perusahaan");
    assert.ok(!res.includes("("), "stripped unclosed opening parenthesis");
  });

  it("works with normalizeTickerTitle alias", () => {
    assert.strictEqual(
      normalizeTickerTitle("Bank Syariah Indonesia (Persero) Tbk", "BRIS"),
      "Bank Syariah Indonesia",
    );
  });
});
