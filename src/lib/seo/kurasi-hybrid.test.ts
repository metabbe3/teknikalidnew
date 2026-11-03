import { test } from "node:test";
import assert from "node:assert";

// Replika logika kurasi hybrid movement-page-helper (wave-4)
function isCuratedFn(keep: Set<string>, ticker: string, prices: number[] /* baru→tua */): boolean {
  if (keep.size > 0 && !keep.has(ticker)) {
    const recent = prices.slice(0, 15);
    return recent.some((p, i) => {
      if (i === 0) return false;
      const prev = recent[i - 1];
      if (!prev || !p) return false;
      return Math.abs(p / prev - 1) >= 0.05;
    });
  }
  return true;
}

test("whitelist survivor selalu indexable walau flat", () => {
  assert.equal(isCuratedFn(new Set(["TLKM"]), "TLKM", [100, 100, 100]), true);
});

test("mover BARU non-whitelist (big-move 14d) → indexable", () => {
  // naik 6% kemarin (halo effect smallcap ARA)
  assert.equal(isCuratedFn(new Set(["TLKM"]), "NEWC", [1060, 1000, 990]), true);
});

test("dormant non-whitelist → noindex", () => {
  assert.equal(isCuratedFn(new Set(["TLKM"]), "AADI", [100, 100.5, 100, 99.8]), false);
});

test("whitelist kosong (fail-open) → semua indexable", () => {
  assert.equal(isCuratedFn(new Set(), "AADI", [100, 100]), true);
});

test("move 4.9% di bawah threshold → noindex (bukan mover)", () => {
  assert.equal(isCuratedFn(new Set(["TLKM"]), "SMMC", [1049, 1000]), false);
});
