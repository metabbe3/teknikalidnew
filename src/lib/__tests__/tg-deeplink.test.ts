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
