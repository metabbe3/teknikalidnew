/**
 * Self-test untuk UTM attribution register hook (PRD idea-2026-09-25-1 / task prd-2026-10-01-01).
 * Run: npx tsx scripts/selftest-utm.ts
 *
 * Menguji parseUtmParam + extractPageviewAttribution dari src/lib/validation.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUtmParam, extractPageviewAttribution } from "../src/lib/validation";

test("[1] parseUtmParam", () => {
  assert.equal(parseUtmParam("stocks_screener"), "stocks_screener", "'stocks_screener' lolos");
  assert.equal(parseUtmParam("signup hero!"), null, "'signup hero!' -> null");
  assert.equal(parseUtmParam(""), null, "string kosong -> null");
  assert.equal(parseUtmParam("a".repeat(33)), null, "33 char -> null");
  assert.equal(parseUtmParam("STOCKS"), "stocks", "'STOCKS' -> 'stocks' lolos");
});

test("[2] extractPageviewAttribution scope", () => {
  // /auth/ path + UTM query -> path bersih, utm terisi
  const a = extractPageviewAttribution("/auth/register?utm_source=abc&utm_medium=cta");
  assert.equal(a.path, "/auth/register", "path tanpa query string");
  assert.equal(a.utmSource, "abc", "utmSource 'abc'");
  assert.equal(a.utmMedium, "cta", "utmMedium 'cta'");

  // Non-auth path -> UTM dibuang
  const b = extractPageviewAttribution("/stocks?utm_source=abc");
  assert.equal(b.path, "/stocks", "path non-auth tetap tanpa query");
  assert.equal(b.utmSource, null, "path non-auth -> utmSource null");

  // /auth/ tanpa query -> null/null
  const c = extractPageviewAttribution("/auth/register");
  assert.equal(c.path, "/auth/register", "path utuh");
  assert.equal(c.utmSource, null, "tanpa query -> utmSource null");
  assert.equal(c.utmMedium, null, "tanpa query -> utmMedium null");
});
