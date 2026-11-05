/**
 * Selftest bug-2026-11-04-01 (FAILING-TEST-FIRST — commit ini SEBELUM fix):
 * Screener hasil memuat ^JKSE (indeks) — link detail /stocks/^JKSE = 404.
 * Root: ^JKSE assetClass='EQUITY' + isActive=true → lolos filter preset.
 *
 * T1: ^JKSE dikenali sebagai indeks (isIndexTicker).
 * T2: baris ^JKSE ter-exclude dari hasil equity screener (excludeIndexRows);
 *     ticker normal (BBCA, BRPT, dst) tetap lolos.
 * T3: null/undefined ticker (data kotor) TIDAK throw & TIDAK ter-exclude
 *     (baris tanpa ticker bukan kompetensi filter ini; aman dipasang di jalur
 *     data apa pun).
 * T4: choke-point terpasang — screener-analysis.service meng-import filter
 *     (grep statis; gagal hari ini = fix belum dipasang di service).
 *
 * Run: npx tsx scripts/selftest/screener-index-leak.selftest.ts
 * Exit 0 = PASS semua.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import {
  isIndexTicker,
  isTradableEquityTicker,
  excludeIndexRows,
} from "../../src/domains/stock/screener-filter";

test("T1: isIndexTicker — ^JKSE/^IHSG=true, BBCA/BRPT=false", () => {
  assert.equal(isIndexTicker("^JKSE"), true);
  assert.equal(isIndexTicker("^IHSG"), true);
  assert.equal(isIndexTicker("BBCA"), false);
  assert.equal(isIndexTicker("BRPT"), false);
});

test("T2: excludeIndexRows membuang baris indeks, emiten normal tetap", () => {
  const rows = [
    { ticker: "BBCA", close: 9000 },
    { ticker: "^JKSE", close: 7000 },
    { ticker: "BRPT", close: 12000 },
    { ticker: "^IHSG", close: 7100 },
  ];
  const filtered = excludeIndexRows(rows);
  assert.equal(filtered.length, 2);
  assert.deepEqual(
    filtered.map((r) => r.ticker),
    ["BBCA", "BRPT"]
  );
  assert.equal(isTradableEquityTicker("^JKSE"), false);
});

test("T3: ticker null/undefined tidak throw, tidak dibuang", () => {
  const dirty = [
    { ticker: null as unknown as string, close: 1 },
    { ticker: undefined as unknown as string, close: 2 },
    { ticker: "ARTO", close: 3 },
  ];
  const filteredDirty = excludeIndexRows(dirty);
  assert.equal(filteredDirty.length, 3);
  assert.equal(isIndexTicker(null), false);
});

test("T4: choke-point — service memakai filter", () => {
  const svcPath = path.join(process.cwd(), "src/domains/stock/screener-analysis.service.ts");
  const svc = readFileSync(svcPath, "utf8");
  assert.ok(
    svc.includes("excludeIndexRows") || svc.includes("isTradableEquityTicker"),
    "screener-analysis.service wajib memakai excludeIndexRows/isTradableEquityTicker"
  );
});
