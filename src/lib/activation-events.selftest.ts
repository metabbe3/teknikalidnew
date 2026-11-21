/**
 * Selftest Wave-7: ACTIVATION FUNNEL EVENTS (Argon & Opus directive 21 Nov 2026).
 *
 * Verifikasi:
 * 1. Whitelist validation pure function (isValidActivationEvent)
 * 2. Sanitasi props tanpa PII, max 5 key, cap panjang string (sanitizeActivationProps)
 * 3. Rate-limiter ringan max 60 event/menit (checkActivationRateLimit)
 *
 * Run: npx tsx src/lib/activation-events.selftest.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVATION_EVENTS,
  ACTIVATION_EVENT_LIST,
  isValidActivationEvent,
  sanitizeActivationProps,
} from "./activation-events";
import {
  checkActivationRateLimit,
  _resetActivationRateLimitBuckets,
} from "../app/api/track/activation/limiter";

test("whitelist validation: semua konstanta event resmi lolos validasi", () => {
  assert.equal(ACTIVATION_EVENTS.GUEST_CHAT_OPEN, "guest_chat_open");
  assert.equal(ACTIVATION_EVENTS.GUEST_FIRST_QUESTION, "guest_first_question");
  assert.equal(ACTIVATION_EVENTS.GUEST_QUOTA_WALL, "guest_quota_wall");
  assert.equal(ACTIVATION_EVENTS.REGISTER_CLICK_FROM_CHAT, "register_click_from_chat");
  assert.equal(ACTIVATION_EVENTS.ANALYSIS_BLOCK_SEEN, "analysis_block_seen");
  assert.equal(ACTIVATION_EVENTS.ANALYSIS_BLOCK_CTA, "analysis_block_cta");
  assert.equal(ACTIVATION_EVENTS.HERO_AI_CTA, "hero_ai_cta");

  const expectedEvents = [
    "guest_chat_open",
    "guest_first_question",
    "guest_quota_wall",
    "register_click_from_chat",
    "analysis_block_seen",
    "analysis_block_cta",
    "hero_ai_cta",
  ];

  for (const exp of expectedEvents) {
    assert.equal(
      isValidActivationEvent(exp),
      true,
      `Event "${exp}" harus valid di whitelist`,
    );
  }

  for (const name of ACTIVATION_EVENT_LIST) {
    assert.equal(
      isValidActivationEvent(name),
      true,
      `Event "${name}" dari ACTIVATION_EVENT_LIST harus valid`,
    );
  }
});

test("whitelist validation: reject event sembarang / tidak dikenal", () => {
  const invalidEvents = [
    "purchase_success",
    "page_view",
    "random_event",
    "",
    "   ",
    null,
    undefined,
    12345,
    {},
    [],
    "GUEST_CHAT_OPEN", // case-sensitive check: nilai aktual adalah lowercase
  ];

  for (const inv of invalidEvents) {
    assert.equal(
      isValidActivationEvent(inv),
      false,
      `Nilai "${String(inv)}" harus di-reject oleh whitelist`,
    );
  }
});

test("props sanitization: memfilter PII dan membatasi maksimal 5 key", () => {
  const rawProps = {
    ticker: "BBCA",
    path: "/stocks/BBCA.JK",
    source: "guest_banner",
    isGuest: true,
    count: 3,
    extra1: "should_be_dropped_because_more_than_5_keys",
    extra2: "also_dropped",
    password: "secret_password",
    userEmail: "test@example.com",
    authToken: "bearer 123",
  };

  const sanitized = sanitizeActivationProps(rawProps);
  assert.ok(sanitized, "Sanitized props tidak boleh undefined");

  const keys = Object.keys(sanitized!);
  assert.ok(keys.length <= 5, `Jumlah key maksimal 5, dapat ${keys.length}`);

  // PII keys harus terbuang
  assert.equal("password" in sanitized!, false);
  assert.equal("userEmail" in sanitized!, false);
  assert.equal("authToken" in sanitized!, false);

  // Field aman terjaga
  assert.equal(sanitized!.ticker, "BBCA");
  assert.equal(sanitized!.isGuest, true);
  assert.equal(sanitized!.count, 3);
});

test("props sanitization: string panjang dipotong ke 100 karakter", () => {
  const longString = "A".repeat(250);
  const sanitized = sanitizeActivationProps({ note: longString });
  assert.ok(sanitized);
  assert.equal(
    typeof sanitized!.note,
    "string",
    "Note harus berupa string",
  );
  assert.equal(
    (sanitized!.note as string).length,
    100,
    "String panjang harus dipotong ke 100 karakter",
  );
});

test("props sanitization: input non-objek / null / array menghasilkan undefined", () => {
  assert.equal(sanitizeActivationProps(null), undefined);
  assert.equal(sanitizeActivationProps(undefined), undefined);
  assert.equal(sanitizeActivationProps("invalid"), undefined);
  assert.equal(sanitizeActivationProps(123), undefined);
  assert.equal(sanitizeActivationProps([]), undefined);
  assert.equal(sanitizeActivationProps({}), undefined);
});

test("rate limit: mengizinkan hingga 60 event per menit per identitas, memblokir ke-61", () => {
  _resetActivationRateLimitBuckets();
  const testKey = "test-anon-uuid-123456";

  // 1 s/d 60 harus true (lolos)
  for (let i = 1; i <= 60; i++) {
    const allowed = checkActivationRateLimit(testKey, 60, 60_000);
    assert.equal(
      allowed,
      true,
      `Request ke-${i} harus diizinkan dalam rate limit`,
    );
  }

  // Ke-61 harus false (terblokir)
  const blocked = checkActivationRateLimit(testKey, 60, 60_000);
  assert.equal(
    blocked,
    false,
    "Request ke-61 harus diblokir oleh rate limiter (429)",
  );

  // Identitas lain tidak terpengaruh
  const otherKey = "test-anon-other-999999";
  const allowedOther = checkActivationRateLimit(otherKey, 60, 60_000);
  assert.equal(
    allowedOther,
    true,
    "Identitas lain harus tetap diizinkan",
  );
});

test("final report", () => {
  console.log("RESULT: ALL PASS (whitelist, pii guard, props cap, rate limiter)");
});
