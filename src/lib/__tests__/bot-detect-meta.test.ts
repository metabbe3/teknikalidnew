import { test } from "node:test";
import assert from "node:assert/strict";
import { detectBot } from "../bot-detect";

test("bot-detect: (a) 2a03:2880:f122:83:: + Chrome/74 UA is identified as meta-preview-crawler bot", async () => {
  const ip = "2a03:2880:f122:83::";
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36";
  const res = await detectBot(ua, ip);
  assert.equal(res.isBot, true, "Crawler preview Meta tanpa in-app token WAJIB isBot: true");
  assert.equal(res.reason, "meta-preview-crawler");
  assert.equal(res.datacenter, true);
});

test("bot-detect: (b) 2a03:2880:f122:83:: + Instagram/Barcelona/FBAN UA is identified as human (isBot: false)", async () => {
  const ip = "2a03:2880:f122:83::";

  // Instagram in-app browser
  const uaInsta =
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36 Instagram 312.1.0.34.111";
  const resInsta = await detectBot(uaInsta, ip);
  assert.equal(resInsta.isBot, false, "Instagram in-app browser dari Meta ASN TIDAK boleh ditandai bot");

  // Threads (Barcelona) in-app browser
  const uaBarcelona =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 320.0.0.18.109";
  const resBarcelona = await detectBot(uaBarcelona, ip);
  assert.equal(resBarcelona.isBot, false, "Threads (Barcelona) in-app browser TIDAK boleh ditandai bot");

  // Facebook (FBAN/FBAV) in-app browser
  const uaFban =
    "Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.5993.80 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/438.0.0.32.118;]";
  const resFban = await detectBot(uaFban, ip);
  assert.equal(resFban.isBot, false, "Facebook (FBAN/FBAV) in-app browser TIDAK boleh ditandai bot");
});

test("bot-detect: (c) Residential Telkomsel IP + Chrome/131 UA is identified as human (isBot: false)", async () => {
  const ip = "114.125.45.10"; // Telkomsel residential block AS7713
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const res = await detectBot(ua, ip);
  assert.equal(res.isBot, false, "Residential IP dengan Chrome modern WAJIB isBot: false");
});
