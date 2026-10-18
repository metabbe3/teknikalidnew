import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeWaitlistSource, normalizeWa } from "./waitlist";

/**
 * PRD prd-2026-10-17-01 (idea-2026-10-17-1b) — Waitlist lead-capture v1.5.
 * AC2: source = utm_source ter-sanitasi whitelist ^[a-z0-9_-]{1,32}$
 *      (pola hook register prd-2026-10-01-01 via parseUtmParam); tanpa/invalid = "direct".
 * AC1: channel wa inline — normalizeWa (dipindah dari route.ts, perilaku identik).
 */
describe("sanitizeWaitlistSource — AC2 attribution UTM", () => {
  it("utm_source valid lolos apa adanya", () => {
    assert.equal(sanitizeWaitlistSource("instagram"), "instagram");
    assert.equal(sanitizeWaitlistSource("newsletter-brief_06"), "newsletter-brief_06");
  });

  it("null/undefined/kosong → 'direct'", () => {
    assert.equal(sanitizeWaitlistSource(null), "direct");
    assert.equal(sanitizeWaitlistSource(undefined), "direct");
    assert.equal(sanitizeWaitlistSource(""), "direct");
    assert.equal(sanitizeWaitlistSource("   "), "direct");
  });

  it("invalid (spasi, simbol, @) → 'direct'", () => {
    assert.equal(sanitizeWaitlistSource("ig story"), "direct");
    assert.equal(sanitizeWaitlistSource("utm;<script>"), "direct");
    assert.equal(sanitizeWaitlistSource("user@example.com"), "direct");
  });

  it("lebih dari 32 char → 'direct' (whitelist {1,32})", () => {
    assert.equal(sanitizeWaitlistSource("a".repeat(33)), "direct");
    assert.equal(sanitizeWaitlistSource("a".repeat(32)), "a".repeat(32));
  });

  it("uppercase dinormalisasi lowercase (parseUtmParam)", () => {
    assert.equal(sanitizeWaitlistSource("IG-Story"), "ig-story");
  });

  it("output selalu muat kolom VarChar(64)", () => {
    for (const v of ["x", "IG Story!", "a".repeat(100), null]) {
      const out = sanitizeWaitlistSource(v as string | null);
      assert.ok(out.length <= 64, `output "${out}" > 64 char`);
    }
  });
});

describe("normalizeWa — AC1 channel wa (ekstrak dari route, perilaku identik)", () => {
  it("08xx → 62xx: pretty +62xx dan hashed sha256 hex", () => {
    const r = normalizeWa("0812-3456-789");
    assert.equal(r.ok, true);
    assert.equal(r.pretty, "+628123456789");
    assert.match(r.hashed!, /^[0-9a-f]{64}$/);
  });

  it("+628xx tetap (tanpa perubahan)", () => {
    const r = normalizeWa("+628123456789");
    assert.equal(r.ok, true);
    assert.equal(r.pretty, "+628123456789");
  });

  it("628xx tanpa plus tetap", () => {
    assert.equal(normalizeWa("628123456789").pretty, "+628123456789");
  });

  it("terlalu pendek / bukan digit → ok:false", () => {
    assert.equal(normalizeWa("123").ok, false);
    assert.equal(normalizeWa("abcdef").ok, false);
    assert.equal(normalizeWa("6212345").ok, false);
  });

  it("hash deterministik — nomor sama = hash sama (idempotent duplicate check)", () => {
    const a = normalizeWa("081234567891");
    const b = normalizeWa("+6281234567891");
    assert.equal(a.hashed, b.hashed);
  });
});
