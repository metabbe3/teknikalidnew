import { test } from "node:test";
import assert from "node:assert/strict";
import { tgDeepLink } from "../tg-deeplink";

test("tgDeepLink: default single ticker formats to TICKER_JK", () => {
  const url = tgDeepLink(["FORU.JK"]);
  assert.equal(url, "https://t.me/TeknikalidAgentBot?start=FORU_JK");
});

test("tgDeepLink: intent payloads match bot parser contract without 4-letter tokens", () => {
  const intents = ["entry", "level", "risiko"] as const;

  for (const intent of intents) {
    const url = tgDeepLink(["FORU"], intent);
    const parsed = new URL(url);
    const start = parsed.searchParams.get("start") ?? "";

    // Payload format check
    assert.equal(start, `FORU_JK_${intent}`);

    // Section 3.2 rules:
    // 1. Length before __a_<12hex> must be <= 48 chars
    assert.ok(start.length <= 48, `start param ${start} exceeds 48 chars`);

    // 2. No 4-letter tokens except the ticker itself
    const tokens = start.split("_");
    const fourLetterTokens = tokens.filter((tok) => tok.length === 4);
    assert.deepEqual(
      fourLetterTokens,
      ["FORU"],
      `Expected only ticker FORU to be 4 letters in start param: ${start}`
    );
  }
});

test("tgDeepLink: multiple tickers format to watch_T1_T2", () => {
  const url = tgDeepLink(["BBCA", "BBRI"]);
  assert.equal(url, "https://t.me/TeknikalidAgentBot?start=watch_BBCA_BBRI");
});

test("tgDeepLink: watch=true flag formats to watch_TICKER", () => {
  const url = tgDeepLink(["TLKM.JK"], true);
  assert.equal(url, "https://t.me/TeknikalidAgentBot?start=watch_TLKM");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { tgDeepLink, tgAnonSuffix } from "../tg-deeplink";

// PRD prd-2026-11-18-01 AC1: suffix identitas web harus dari SATU helper.
test("tgAnonSuffix: 12hex valid dari localStorage eng_anon (UUID strip dash)", () => {
  const hex = tgAnonSuffix("f81d4fae-7dec-11d0-a765-00a0c91e6bf6");
  assert.equal(hex, "__a_f81d4fae7dec");
});

test("tgAnonSuffix: non-hex / pendek => string kosong", () => {
  assert.equal(tgAnonSuffix("zz-not-hex"), "");
  assert.equal(tgAnonSuffix("abc"), "");
  assert.equal(tgAnonSuffix(""), "");
});

test("tgDeepLink: payload single-ticker menempel suffix anon saat tersedia (browser-side)", () => {
  // window/localStorage disimulasikan lewat globalThis
  (globalThis as { window?: object }).window = {};
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => (k === "eng_anon" ? "F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6" : null),
  } as Storage;
  try {
    const url = tgDeepLink(["BBCA.JK"]);
    assert.equal(url, "https://t.me/TeknikalidAgentBot?start=BBCA_JK__a_f81d4fae7dec");
  } finally {
    delete (globalThis as { window?: object }).window;
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
});
