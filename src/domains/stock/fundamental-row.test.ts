import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * FAILING-TEST-FIRST for qa-2026-10-20-03 (commit terpisah sebelum fix).
 * Cermin perilaku buildPriceItems (komentar data-sync.service.ts): baris
 * fundamental HARUS distamp dari market-time quote, bukan wall clock —
 * kalau tidak, run weekend/pagi mencetak baris Sabtu/Minggu/esok hari yang
 * membawa nilai sesi trading sebelumnya (kontaminasi 2026-10-17/18).
 *
 * Sebelum fix: test GAGAL karena buildFundamentalItems pakai `new Date()`
 * dan menyalin quote.marketCap mentah (lag 1 hari vs price).
 */

import { deriveFundamentalRow } from "./fundamental-row";

const WEEKEND_QUOTE = {
  ticker: "BBCA.JK",
  quote: {
    marketState: "CLOSED",
    regularMarketPrice: 5175,
    regularMarketTime: Math.floor(Date.UTC(2026, 9, 16, 9, 0, 0) / 1000), // Jumat 16 Okt
    trailingPE: 10.22,
    priceToBook: 2.11,
    marketCap: 637948367578125, // basi: shares × close Jumat — BUKAN harga saat ini
    sharesOutstanding: 123281489000,
  },
};

const stockLookup = new Map([["BBCA.JK", { id: 97 }]]);

describe("deriveFundamentalRow — date stamp + provenance marketCap (qa-2026-10-20-03)", () => {
  it("distamp date dari regularMarketTime quote, BUKAN wall clock (run Minggu => baris Jumat)", () => {
    const row = deriveFundamentalRow(WEEKEND_QUOTE, stockLookup);
    assert.ok(row, "baris harus dihasilkan");
    assert.equal(new Date(row.date).toISOString().slice(0, 10), "2026-10-16");
  });

  it("menghitung marketCap = sharesOutstanding × regularMarketPrice (hari sama), abaikan quote.marketCap basi", () => {
    const row = deriveFundamentalRow(WEEKEND_QUOTE, stockLookup);
    assert.ok(row);
    const expected = BigInt(Math.round(123281489000 * 5175));
    assert.equal(row.marketCap, expected);
  });

  it("fallback ke quote.marketCap hanya saat sharesOutstanding absen", () => {
    const noShares = { ticker: "BBCA.JK", quote: { ...WEEKEND_QUOTE.quote, sharesOutstanding: undefined } };
    const row = deriveFundamentalRow(noShares, stockLookup);
    assert.ok(row);
    assert.equal(row.marketCap, BigInt(637948367578125));
  });

  it("lewati baris tanpa market time yang bisa dipakai", () => {
    const row = deriveFundamentalRow(
      { ticker: "BBCA.JK", quote: { ...WEEKEND_QUOTE.quote, regularMarketTime: 0 } },
      stockLookup,
    );
    assert.equal(row, null, "harus null saat regularMarketTime=0 — tak bisa distamp jujur");
  });

  it("lewati baris tanpa harga", () => {
    const row = deriveFundamentalRow(
      { ticker: "BBCA.JK", quote: { ...WEEKEND_QUOTE.quote, regularMarketPrice: null } },
      stockLookup,
    );
    assert.equal(row, null);
  });
});
