/**
 * Selftest ops-2026-10-29-04: QuoteSchema harus menerima shortName/longName null.
 *
 * Bukti live: docker logs teknikalidnew-app-1 24h = 21x
 * "[pasar-live] live IHSG quote failed, falling back to DB: Invalid quote data
 * for ^JKSE: ... shortName expected string received null / longName ... null".
 * fetchQuotesTradingView (mapRow) mengembalikan shortName/longName NULL untuk
 * indeks (^JKSE tidak ada di scanner) -> safeParse gagal -> throw "Invalid
 * quote data" -> fallback v8 = dead code -> IHSG pasar-live selalu DB.
 *
 * Fix: shortName/longName z.string().nullable().optional(). Test ini menjaga
 * (a) null diterima, (b) guard tipe tetap hidup (number tetap ditolak),
 * (c) field hilang tetap diterima (optional).
 *
 * Run: npx tsx scripts/selftest/quote-null.selftest.ts
 * Exit 0 = PASS semua.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { QuoteSchema } from "../../src/lib/yahoo-finance";

test("[N1] ^JKSE scanner row: shortName/longName null HARUS success", () => {
  const r = QuoteSchema.safeParse({
    symbol: "^JKSE",
    marketState: "REGULAR",
    regularMarketPrice: null,
    regularMarketChange: null,
    shortName: null,
    longName: null,
  });
  assert.equal(r.success, true, `expected success, got: ${JSON.stringify(r.success ? null : r.error.issues)}`);
});

test("[N2] guard tipe tetap hidup: shortName number HARUS gagal", () => {
  const r = QuoteSchema.safeParse({ symbol: "X", marketState: "REGULAR", shortName: 123 });
  assert.equal(r.success, false, "shortName: 123 harus ditolak zod (guard tipe mati = regresi)");
});

test("[N3] field hilang (optional) HARUS success", () => {
  const r = QuoteSchema.safeParse({ symbol: "^JKSE", marketState: "REGULAR" });
  assert.equal(r.success, true, `expected success, got: ${JSON.stringify(r.success ? null : r.error.issues)}`);
});
