/**
 * Unit test parser slug compare /saham/[a]-vs-[b] (prd-2026-11-05-01).
 *
 * PRD AC1: URL valid = 2 ticker; ticker invalid / 3 ticker → 404 rapi (bukan 500).
 * Parser = pure fn → diuji tanpa DB.
 *
 * Runner: npx tsx tests/compare-slug.test.ts  (node:test + assert)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseCompareSlug, safeDecodeCompareSlug, toJk } from "../src/domains/stock/compare.service";

test("slug valid: bbca-vs-bbri → [BBCA, BBRI] (normalisasi uppercase)", () => {
  assert.deepEqual(parseCompareSlug("bbca-vs-bbri"), ["BBCA", "BBRI"]);
});

test("slug valid: BBCA.JK-vs-BBRI.JK (uppercase + suffix)", () => {
  assert.deepEqual(parseCompareSlug("BBCA.JK-vs-BBRI.JK"), ["BBCA.JK", "BBRI.JK"]);
});

test("slug biasa (tanpa -vs-) → null (bukan halaman compare)", () => {
  assert.equal(parseCompareSlug("bbca"), null);
  assert.equal(parseCompareSlug("bbca/kenapa-naik-hari-ini"), null);
});

test("3 ticker (A-vs-B-vs-C) → null → 404 (PRD AC1)", () => {
  assert.equal(parseCompareSlug("bbca-vs-bbri-vs-bmri"), null);
});

test("ticker invalid (angka/karakter aneh/terlalu panjang) → null", () => {
  assert.equal(parseCompareSlug("bbc@-vs-bbri"), null);
  assert.equal(parseCompareSlug("bbca-vs-$£¥"), null);
  assert.equal(parseCompareSlug("BBCAABCD-vs-BBRI"), null); // >5 char
});

test("ticker sama kedua sisi → null", () => {
  assert.equal(parseCompareSlug("bbca-vs-bbca"), null);
});

test("sisi kosong → null", () => {
  assert.equal(parseCompareSlug("-vs-bbri"), null);
  assert.equal(parseCompareSlug("bbca-vs-"), null);
});

test("safeDecodeCompareSlug: percent-encoding malformed tidak boleh throw (500 live 5 Nov)", () => {
  // Reproduksi live 5 Nov: /saham/bbca-vs-$%£ → 500 (URIError dari decodeURIComponent
  // di page). Helper WAJIB fallback ke string mentah, bukan throw → 404 rapi (AC1).
  let threw = false;
  let out: string | null = null;
  try {
    out = safeDecodeCompareSlug("bbca-vs-%C3");
  } catch {
    threw = true;
  }
  assert.equal(threw, false, "decode tidak boleh throw");
  assert.equal(typeof out, "string");
  assert.ok(out!.includes("-vs-"));
});

test("safeDecodeCompareSlug: slug sehat tetap ter-decode", () => {
  assert.equal(safeDecodeCompareSlug("bbca-vs-bbri"), "bbca-vs-bbri");
});

test("toJk normalisasi suffix", () => {
  assert.equal(toJk("bbca"), "BBCA.JK");
  assert.equal(toJk("BBCA.JK"), "BBCA.JK");
});
