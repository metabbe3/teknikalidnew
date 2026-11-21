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
  getHargaFaqs,
  HARGA_FAQS,
  type PricingCard,
} from "./pricing-data";
import { metadata } from "./page";

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

  it("blok FAQ memuat 3 Q&A statis dengan copy pertanyaan wajib via getHargaFaqs()", () => {
    const faqs = getHargaFaqs();
    assert.equal(faqs.length, 3, "Harus tepat 3 Q&A FAQ");

    const questions = faqs.map((f) => f.question);
    assert.ok(
      questions.includes("Bagaimana cara berlangganan?"),
      "Harus memuat Q: Bagaimana cara berlangganan?",
    );
    assert.ok(
      questions.includes("Bisa berhenti langganan kapan saja?"),
      "Harus memuat Q: Bisa berhenti langganan kapan saja?",
    );
    assert.ok(
      questions.includes("Apa bedanya Night Trader dan Pro?"),
      "Harus memuat Q: Apa bedanya Night Trader dan Pro?",
    );

    for (const item of faqs) {
      assert.ok(item.question.trim().length > 0, "Pertanyaan FAQ tidak boleh kosong");
      assert.ok(item.answer.trim().length > 0, "Jawaban FAQ tidak boleh kosong");
    }
  });

  it("label kartu mid tier (Night Trader) tidak memakai klaim 'laris' tanpa data riil dan memuat 'Rekomendasi awal'", () => {
    const cards = buildPricingCards();
    const mid = cards.find((c) => c.tier === "Night Trader");
    assert.ok(mid, "Kartu Night Trader harus ada");
    assert.ok(mid.badge, "Badge Night Trader harus ada");

    // Anti fake scarcity: tidak boleh mengandung klaim "laris"
    assert.equal(
      /laris/i.test(mid.badge),
      false,
      `Badge mid-tier (${mid.badge}) tidak boleh mengandung kata 'laris' tanpa bukti riil`,
    );

    // Label jujur "Rekomendasi awal"
    assert.match(
      mid.badge,
      /rekomendasi awal/i,
      `Badge mid-tier (${mid.badge}) harus memuat 'Rekomendasi awal'`,
    );
  });

  it("metadata canonical /harga terpasang dan sesuai spesifikasi", () => {
    assert.ok(metadata.alternates, "Metadata alternates harus terdefinisi");
    assert.equal(
      metadata.alternates.canonical,
      "/harga",
      "Canonical URL harus '/harga'",
    );

    const pagePath = join(process.cwd(), "src/app/(public)/harga/page.tsx");
    const pageSource = readFileSync(pagePath, "utf-8");
    assert.match(
      pageSource,
      /canonical:\s*["']\/harga["']/,
      "Source page.tsx harus memuat alternates: { canonical: '/harga' }",
    );
  });

  it("source page.tsx me-render blok FAQ dan JSON-LD FAQPage", () => {
    const pagePath = join(process.cwd(), "src/app/(public)/harga/page.tsx");
    const pageSource = readFileSync(pagePath, "utf-8");

    assert.ok(
      pageSource.includes("faqJsonLd") || pageSource.includes("buildCustomFaqJsonLd"),
      "page.tsx harus mengintegrasikan JSON-LD FAQPage",
    );
    assert.ok(
      pageSource.includes("application/ld+json"),
      "page.tsx harus memuat tag script application/ld+json",
    );
    assert.ok(
      pageSource.includes("faqs.map") || pageSource.includes("getHargaFaqs"),
      "page.tsx harus me-render daftar pertanyaan FAQ",
    );
  });
});

console.log("RESULT: ALL PASS");
