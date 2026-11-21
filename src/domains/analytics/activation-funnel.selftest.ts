/**
 * Selftest Wave-10: ACTIVATION FUNNEL SERVICE
 *
 * Verifikasi pure function:
 * 1. transformActivationRows(dailyRows, totalRows?, options?) -> { days, totals }
 * 2. calcConversionRate(numerator, denominator)
 * 3. isActivationFunnelEvent(event)
 *
 * Run: npx tsx src/domains/analytics/activation-funnel.selftest.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  transformActivationRows,
  calcConversionRate,
  isActivationFunnelEvent,
  ACTIVATION_FUNNEL_EVENTS,
  type RawActivationDailyRow,
  type RawActivationTotalRow,
} from "./activation-funnel.service";

describe("Activation Funnel Pure Functions", () => {
  it("isActivationFunnelEvent: validasi 6 event funnel resmi", () => {
    const expected = [
      "guest_chat_open",
      "guest_first_question",
      "guest_quota_wall",
      "register_click_from_chat",
      "analysis_block_cta",
      "hero_ai_cta",
    ];

    assert.equal(ACTIVATION_FUNNEL_EVENTS.length, 6);
    for (const ev of expected) {
      assert.equal(isActivationFunnelEvent(ev), true, `${ev} harus terdaftar`);
    }

    assert.equal(isActivationFunnelEvent("invalid_event"), false);
    assert.equal(isActivationFunnelEvent(""), false);
    assert.equal(isActivationFunnelEvent(null), false);
    assert.equal(isActivationFunnelEvent(123), false);
  });

  it("calcConversionRate: perhitungan persentase aman dan akurat", () => {
    // Normal cases
    assert.equal(calcConversionRate(10, 20), 50.0);
    assert.equal(calcConversionRate(1, 4), 25.0);
    assert.equal(calcConversionRate(0, 50), 0);

    // Division by zero / invalid denominator
    assert.equal(calcConversionRate(10, 0), null);
    assert.equal(calcConversionRate(0, 0), null);
    assert.equal(calcConversionRate(10, -5), null);
    assert.equal(calcConversionRate(10, NaN), null);
  });

  it("transformActivationRows: transformasi dummy rows harian ke struktur days + totals", () => {
    const dummyDaily: RawActivationDailyRow[] = [
      { date: "2026-11-20", event: "guest_chat_open", count: 10 },
      { date: "2026-11-20", event: "guest_first_question", count: 6 },
      { date: "2026-11-20", event: "guest_quota_wall", count: 2 },
      { date: "2026-11-20", event: "register_click_from_chat", count: 1 },
      { date: "2026-11-20", event: "analysis_block_cta", count: 4 },
      { date: "2026-11-20", event: "hero_ai_cta", count: 5 },
      // Hari kedua
      { date: "2026-11-21", event: "guest_chat_open", count: 20 },
      { date: "2026-11-21", event: "guest_first_question", count: 14 },
      { date: "2026-11-21", event: "guest_quota_wall", count: 5 },
      { date: "2026-11-21", event: "register_click_from_chat", count: 3 },
      { date: "2026-11-21", event: "analysis_block_cta", count: 8 },
      { date: "2026-11-21", event: "hero_ai_cta", count: 12 },
    ];

    const result = transformActivationRows(dummyDaily);

    // Default order desc: 2026-11-21 lalu 2026-11-20
    assert.equal(result.days.length, 2);
    assert.equal(result.days[0].date, "2026-11-21");
    assert.equal(result.days[0].guest_chat_open, 20);
    assert.equal(result.days[0].guest_first_question, 14);
    assert.equal(result.days[0].guest_quota_wall, 5);
    assert.equal(result.days[0].register_click_from_chat, 3);
    assert.equal(result.days[0].analysis_block_cta, 8);
    assert.equal(result.days[0].hero_ai_cta, 12);

    assert.equal(result.days[1].date, "2026-11-20");
    assert.equal(result.days[1].guest_chat_open, 10);
    assert.equal(result.days[1].guest_first_question, 6);
    assert.equal(result.days[1].guest_quota_wall, 2);
    assert.equal(result.days[1].register_click_from_chat, 1);
    assert.equal(result.days[1].analysis_block_cta, 4);
    assert.equal(result.days[1].hero_ai_cta, 5);

    // Totals dihitung otomatis dari penjumlahan harian
    assert.equal(result.totals.guest_chat_open, 30);
    assert.equal(result.totals.guest_first_question, 20);
    assert.equal(result.totals.guest_quota_wall, 7);
    assert.equal(result.totals.register_click_from_chat, 4);
    assert.equal(result.totals.analysis_block_cta, 12);
    assert.equal(result.totals.hero_ai_cta, 17);
  });

  it("transformActivationRows: mendukung daftar tanggal target eksplit (isi 0 jika kosong)", () => {
    const dates = [
      "2026-11-21",
      "2026-11-20",
      "2026-11-19",
      "2026-11-18",
      "2026-11-17",
      "2026-11-16",
      "2026-11-15",
    ];

    // Hanya ada data di 2026-11-21
    const dummyDaily: RawActivationDailyRow[] = [
      { date: "2026-11-21", event: "guest_chat_open", count: 7 },
    ];

    const result = transformActivationRows(dummyDaily, undefined, { dates });

    assert.equal(result.days.length, 7);
    assert.equal(result.days[0].date, "2026-11-21");
    assert.equal(result.days[0].guest_chat_open, 7);

    // Tanggal tanpa event harus tetap ada dengan nilai 0
    for (let i = 1; i < 7; i++) {
      assert.equal(result.days[i].date, dates[i]);
      assert.equal(result.days[i].guest_chat_open, 0);
      assert.equal(result.days[i].guest_first_question, 0);
      assert.equal(result.days[i].guest_quota_wall, 0);
      assert.equal(result.days[i].register_click_from_chat, 0);
      assert.equal(result.days[i].analysis_block_cta, 0);
      assert.equal(result.days[i].hero_ai_cta, 0);
    }

    assert.equal(result.totals.guest_chat_open, 7);
  });

  it("transformActivationRows: mendukung totalRows eksplisit dari query terpisah", () => {
    const dummyDaily: RawActivationDailyRow[] = [
      { date: "2026-11-21", event: "guest_chat_open", count: 5 },
    ];

    const dummyTotals: RawActivationTotalRow[] = [
      { event: "guest_chat_open", count: 45 },
      { event: "guest_first_question", count: 25 },
      { event: "hero_ai_cta", count: 18 },
    ];

    const result = transformActivationRows(dummyDaily, dummyTotals);

    // Totals memakai data dari totalRows
    assert.equal(result.totals.guest_chat_open, 45);
    assert.equal(result.totals.guest_first_question, 25);
    assert.equal(result.totals.hero_ai_cta, 18);
    assert.equal(result.totals.guest_quota_wall, 0);
  });

  it("transformActivationRows: mengabaikan event tak dikenal dan mengonversi bigint", () => {
    const dummyDaily: RawActivationDailyRow[] = [
      { date: "2026-11-21", event: "guest_chat_open", count: BigInt(42) },
      { date: "2026-11-21", event: "unknown_random_event", count: 999 },
    ];

    const result = transformActivationRows(dummyDaily);

    assert.equal(result.days[0].guest_chat_open, 42);
    // Tidak ada properti unknown_random_event yang merusak struktur
    assert.equal((result.days[0] as unknown as Record<string, unknown>)["unknown_random_event"], undefined);
    assert.equal(result.totals.guest_chat_open, 42);
  });

  it("transformActivationRows: input kosong menghasilkan hari kosong dan totals 0", () => {
    const result = transformActivationRows([]);
    assert.deepEqual(result.days, []);
    assert.deepEqual(result.totals, {
      guest_chat_open: 0,
      guest_first_question: 0,
      guest_quota_wall: 0,
      register_click_from_chat: 0,
      analysis_block_cta: 0,
      hero_ai_cta: 0,
    });
  });
});

console.log("\nRESULT: ALL PASS\n");
