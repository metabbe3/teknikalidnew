/**
 * Selftest: Verifikasi copy & struktur kartu halaman /harga.
 *
 * Assert:
 *  1. Pure fn buildPricingCards() return array kartu {tier, price, features[], ctaHref}.
 *  2. Tepat 3 kartu (Free, Night Trader, Pro).
 *  3. ctaHref tier berbayar mengandung "t.me/TeknikalidAgentBot".
 *  4. Disclaimer string memuat "bukan nasihat keuangan" (fn getPricingDisclaimer & di page source).
 *  5. Tidak ada nilai undefined pada properti kartu yang terdaftar.
 *  6. Baris payment netral ("Bayar via bot Telegram · Midtrans · batal kapan saja") ada di kartu berbayar & page source.
 *
 * Run: npx tsx src/app/(public)/harga/harga-copy.selftest.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildPricingCards,
  getPricingDisclaimer,
  PRICING_DISCLAIMER,
  PAYMENT_NOTE,
  type PricingCard,
} from "./pricing-data";

describe("Halaman Harga: buildPricingCards & Copy Verification", () => {
  it("mengembalikan array tepat 3 kartu dengan properti wajib {tier, price, features, ctaHref}", () => {
    const cards = buildPricingCards();

    assert.ok(Array.isArray(cards), "Harus mengembalikan array");
    assert.equal(cards.length, 3, "Harus tepat 3 kartu harga");

    for (const card of cards) {
      assert.ok(card.tier, "tier harus terdefinisi dan tidak kosong");
      assert.ok(card.price, "price harus terdefinisi dan tidak kosong");
      assert.ok(Array.isArray(card.features), "features harus berupa array");
      assert.ok(card.features.length >= 3, "features minimal memuat 3 item");
      assert.ok(card.ctaHref, "ctaHref harus terdefinisi dan tidak kosong");

      // Cek tidak ada undefined di seluruh nilai object yang diset
      for (const [key, val] of Object.entries(card)) {
        assert.notEqual(val, undefined, `Properti "${key}" tidak boleh undefined`);
      }
      for (const f of card.features) {
        assert.notEqual(f, undefined, "Item fitur tidak boleh undefined");
        assert.ok(typeof f === "string" && f.trim().length > 0, "Item fitur harus string valid");
      }
    }
  });

  it("tier berbayar (Night Trader & Pro) memiliki ctaHref yang mengarah ke bot Telegram", () => {
    const cards = buildPricingCards();
    const nightTrader = cards.find((c) => c.tier === "Night Trader");
    const pro = cards.find((c) => c.tier === "Pro");

    assert.ok(nightTrader, "Kartu Night Trader harus ada");
    assert.ok(pro, "Kartu Pro harus ada");

    assert.ok(
      nightTrader.ctaHref.includes("t.me/TeknikalidAgentBot"),
      `ctaHref Night Trader (${nightTrader.ctaHref}) harus mengandung t.me/TeknikalidAgentBot`,
    );
    assert.ok(
      nightTrader.ctaHref.includes("start=upgrade"),
      "ctaHref Night Trader harus memiliki parameter start=upgrade",
    );

    assert.ok(
      pro.ctaHref.includes("t.me/TeknikalidAgentBot"),
      `ctaHref Pro (${pro.ctaHref}) harus mengandung t.me/TeknikalidAgentBot`,
    );
    assert.ok(
      pro.ctaHref.includes("start=upgrade"),
      "ctaHref Pro harus memiliki parameter start=upgrade",
    );
  });

  it("memiliki copy nominal terverifikasi dari kode repo (Night Trader Rp14.900, Pro Rp29.000)", () => {
    const cards = buildPricingCards();
    const nightTrader = cards.find((c) => c.tier === "Night Trader")!;
    const pro = cards.find((c) => c.tier === "Pro")!;
    const free = cards.find((c) => c.tier === "Free")!;

    assert.ok(
      nightTrader.price.includes("14.900") || nightTrader.price.includes("14,900"),
      `Harga Night Trader harus Rp14.900, didapat: ${nightTrader.price}`,
    );
    assert.ok(
      pro.price.includes("29.000") || pro.price.includes("29,000"),
      `Harga Pro harus Rp29.000, didapat: ${pro.price}`,
    );
    assert.ok(
      free.price.includes("0"),
      `Harga Free harus Rp0, didapat: ${free.price}`,
    );
  });

  it("disclaimer string tersedia via function dan memuat frasa 'bukan nasihat keuangan'", () => {
    const disclaimer = getPricingDisclaimer();
    assert.ok(typeof disclaimer === "string", "Disclaimer harus berupa string");
    assert.ok(
      disclaimer.toLowerCase().includes("bukan nasihat keuangan"),
      `Disclaimer (${disclaimer}) harus memuat frasa 'bukan nasihat keuangan'`,
    );

    assert.ok(
      PRICING_DISCLAIMER.toLowerCase().includes("bukan nasihat keuangan"),
      "Konstanta PRICING_DISCLAIMER harus memuat frasa 'bukan nasihat keuangan'",
    );
  });

  it("disclaimer string ada di source code page /harga", () => {
    const pagePathCandidates = [
      join(process.cwd(), "src/app/(public)/harga/page.tsx"),
      join(process.cwd(), "src/app/harga/page.tsx"),
    ];

    const targetPath = pagePathCandidates.find((p) => existsSync(p));
    assert.ok(targetPath, "File page.tsx untuk halaman harga harus ada");

    const pageSource = readFileSync(targetPath, "utf-8");
    assert.ok(
      pageSource.toLowerCase().includes("bukan nasihat keuangan") ||
        pageSource.includes("PRICING_DISCLAIMER"),
      "Source page.tsx harus memuat 'bukan nasihat keuangan' atau referensi PRICING_DISCLAIMER",
    );
  });

  it("baris payment netral muncul di buildPricingCards() pada kartu berbayar", () => {
    const cards = buildPricingCards();
    const paidCards = cards.filter((c) => c.tier !== "Free");

    assert.equal(paidCards.length, 2, "Harus ada 2 kartu berbayar");
    for (const card of paidCards) {
      assert.ok(card.paymentNote, `Kartu ${card.tier} harus memiliki paymentNote`);
      assert.match(
        card.paymentNote!,
        /Bayar via bot Telegram · Midtrans · batal kapan saja/,
        `paymentNote pada kartu ${card.tier} harus memuat social proof netral`,
      );
    }

    const freeCard = cards.find((c) => c.tier === "Free")!;
    assert.equal(
      freeCard.paymentNote,
      undefined,
      "Kartu Free tidak boleh memuat paymentNote",
    );

    assert.equal(
      PAYMENT_NOTE,
      "Bayar via bot Telegram · Midtrans · batal kapan saja",
      "Konstanta PAYMENT_NOTE harus sesuai copy jujur tanpa dark pattern",
    );
  });

  it("baris payment netral muncul di source page.tsx /harga", () => {
    const pagePath = join(process.cwd(), "src/app/(public)/harga/page.tsx");
    assert.ok(existsSync(pagePath), "File page.tsx untuk halaman harga harus ada");

    const pageSource = readFileSync(pagePath, "utf-8");
    assert.ok(
      pageSource.includes("card.paymentNote") ||
        pageSource.includes("Bayar via bot Telegram · Midtrans · batal kapan saja"),
      "Source page.tsx harus me-render paymentNote untuk kartu berbayar",
    );
  });
});

console.log("RESULT: ALL PASS");
