/**
 * Selftest ops-2026-11-05-02 (FAILING-TEST-FIRST — commit ini SEBELUM fix):
 * TypeError "b.getTime is not a function" di /api/me/morning-delta — guard
 * latestDate hanya null-check, jadi date-string (jalur raw-SQL/deserialize)
 * lolos filter lalu meledak di .getTime(). Fix: toSafeDate/pickLatestDate
 * normalisasi Date|string → Date|null sebelum sort.
 *
 * Run: npx tsx scripts/selftest/morning-delta.selftest.ts
 * Exit 0 = PASS semua.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  toSafeDate,
  pickLatestDate,
} from "../../src/domains/stock/morning-delta.service";

test("toSafeDate: Date valid → dikembalikan apa adanya", () => {
  const d = new Date("2026-11-04T00:00:00.000Z");
  const out = toSafeDate(d);
  assert.ok(out instanceof Date);
  assert.equal(out.getTime(), d.getTime());
});

test("toSafeDate: ISO string → Date valid", () => {
  const out = toSafeDate("2026-11-04T00:00:00.000Z");
  assert.ok(out instanceof Date);
  assert.ok(!Number.isNaN(out.getTime()));
  assert.equal(out.getTime(), new Date("2026-11-04T00:00:00.000Z").getTime());
});

test("toSafeDate: date-only string → Date valid", () => {
  const out = toSafeDate("2026-11-04");
  assert.ok(out instanceof Date);
  assert.ok(!Number.isNaN(out.getTime()));
});

test("toSafeDate: null / undefined → null", () => {
  assert.equal(toSafeDate(null), null);
  assert.equal(toSafeDate(undefined), null);
});

test("toSafeDate: string bukan tanggal → null", () => {
  assert.equal(toSafeDate("bukan-tanggal"), null);
});

test("toSafeDate: Date invalid → null", () => {
  assert.equal(toSafeDate(new Date("invalid")), null);
});

test("pickLatestDate: date-strings TIDAK throw, pilih terbaru (regresi bug)", () => {
  const out = pickLatestDate(["2026-11-03", "2026-11-05", "2026-11-04"]);
  assert.ok(out instanceof Date);
  assert.equal(out.getTime(), new Date("2026-11-05").getTime());
});

test("pickLatestDate: campuran Date|null|string → terbaru", () => {
  const out = pickLatestDate([new Date("2026-11-03"), null, "2026-11-05"]);
  assert.ok(out instanceof Date);
  assert.equal(out.getTime(), new Date("2026-11-05").getTime());
});

test("pickLatestDate: kosong / semua null → null", () => {
  assert.equal(pickLatestDate([]), null);
  assert.equal(pickLatestDate([null, null]), null);
});
