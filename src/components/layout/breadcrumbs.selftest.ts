/**
 * Selftest: Breadcrumbs (buildCrumbs) & Nav Consistency (Header & Footer).
 *
 * Verifikasi:
 * 1. buildCrumbs: pure fn pembuat breadcrumbs untuk 3 kasus:
 *    - Home ("/" / "")
 *    - Stocks list ("/stocks")
 *    - Stock detail ("/stocks/[ticker]")
 * 2. Konsistensi Link: Header & Footer navLinks memiliki 5 rute yang identik.
 *
 * Jalankan: npx tsx src/components/layout/breadcrumbs.selftest.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCrumbs } from "./breadcrumbs";
import { headerNavLinks } from "./header";
import { footerNavLinks } from "./footer";

describe("Breadcrumbs: buildCrumbs (Pure Function)", () => {
  it("Kasus 1: Home ('/' dan '') menghasilkan breadcrumb tunggal Beranda tanpa href", () => {
    const rootCrumbs = buildCrumbs("/");
    assert.equal(rootCrumbs.length, 1);
    assert.deepEqual(rootCrumbs[0], { label: "Beranda" });
    assert.equal(rootCrumbs[0].href, undefined);

    const emptyCrumbs = buildCrumbs("");
    assert.equal(emptyCrumbs.length, 1);
    assert.deepEqual(emptyCrumbs[0], { label: "Beranda" });
  });

  it("Kasus 2: Stocks list ('/stocks') menghasilkan Beranda (link) / Saham (current)", () => {
    const stocksCrumbs = buildCrumbs("/stocks");
    assert.equal(stocksCrumbs.length, 2);
    assert.deepEqual(stocksCrumbs, [
      { label: "Beranda", href: "/" },
      { label: "Saham" },
    ]);
    assert.equal(stocksCrumbs[1].href, undefined, "Item terakhir halaman aktif tidak boleh berupa link");
  });

  it("Kasus 3: Stock detail ('/stocks/BBCA') menghasilkan Beranda / Saham / BBCA", () => {
    const detailFromPath = buildCrumbs("/stocks/BBCA");
    assert.equal(detailFromPath.length, 3);
    assert.deepEqual(detailFromPath, [
      { label: "Beranda", href: "/" },
      { label: "Saham", href: "/stocks" },
      { label: "BBCA" },
    ]);

    // Uji dengan parameter ticker eksplisit dan pembersihan suffix .JK
    const detailWithTickerParam = buildCrumbs("/stocks/BBRI.JK", "BBRI");
    assert.equal(detailWithTickerParam.length, 3);
    assert.deepEqual(detailWithTickerParam, [
      { label: "Beranda", href: "/" },
      { label: "Saham", href: "/stocks" },
      { label: "BBRI" },
    ]);
    assert.equal(detailWithTickerParam[2].href, undefined, "Ticker adalah teks current (bukan link)");
  });

  it("Pure function: pemanggilan berulang menghasilkan array baru tanpa efek samping", () => {
    const a = buildCrumbs("/stocks/ASII");
    const b = buildCrumbs("/stocks/ASII");
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
  });
});

describe("Nav Consistency: Header vs Footer navLinks", () => {
  const expectedSet = [
    { href: "/", label: "Beranda" },
    { href: "/stocks", label: "Saham" },
    { href: "/stocks?view=screener", label: "Screener" },
    { href: "/agent", label: "Analisa AI" },
    { href: "/harga", label: "Harga" },
  ];

  it("Header navLinks memuat tepat 5 rute yang ditentukan", () => {
    assert.equal(headerNavLinks.length, 5);
    assert.deepEqual(headerNavLinks, expectedSet);
  });

  it("Footer navLinks memuat tepat 5 rute yang ditentukan", () => {
    assert.equal(footerNavLinks.length, 5);
    assert.deepEqual(footerNavLinks, expectedSet);
  });

  it("Header dan Footer menampilkan SET yang identik", () => {
    assert.deepEqual(headerNavLinks, footerNavLinks);
  });
});

console.log("RESULT: ALL PASS");
