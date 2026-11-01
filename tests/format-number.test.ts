import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDecimalId, formatRupiah } from "../src/lib/format-number";

test("formatDecimalId: 24.4 dengan 1 digit -> 24,4", () => {
  assert.equal(formatDecimalId(24.4, 1), "24,4");
});

test("formatDecimalId: 0.78 dengan 2 digit -> 0,78", () => {
  assert.equal(formatDecimalId(0.78, 2), "0,78");
});

test("formatDecimalId: 1.5 dengan 1 digit -> 1,5", () => {
  assert.equal(formatDecimalId(1.5, 1), "1,5");
});

test("formatDecimalId: negatif -2.62 dengan 2 digit -> -2,62", () => {
  assert.equal(formatDecimalId(-2.62, 2), "-2,62");
});

test("formatDecimalId: null / undefined / non-finite -> string kosong", () => {
  assert.equal(formatDecimalId(null, 2), "");
  assert.equal(formatDecimalId(undefined, 2), "");
  assert.equal(formatDecimalId(NaN, 2), "");
  assert.equal(formatDecimalId(Infinity, 2), "");
});

test("formatRupiah: null -> -", () => {
  assert.equal(formatRupiah(null), "-");
});

test("formatRupiah: nominal angka -> currency IDR tanpa desimal", () => {
  const formatted = formatRupiah(10000);
  assert.ok(formatted.includes("10.000"), `Expected 10.000 in formatted string, got ${formatted}`);
  assert.ok(formatted.startsWith("Rp"), `Expected to start with Rp, got ${formatted}`);
});

