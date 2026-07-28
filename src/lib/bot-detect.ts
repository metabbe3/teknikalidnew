import { lookupAsn, isDatacenter } from "@/lib/ip-asn";

// Known crawler/spider user-agent patterns (case-insensitive)
export const BOT_UA_PATTERNS: RegExp[] = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /crawl/i,
  /scan/i,
  /fetcher/i,
  /archiver/i,
  /monitor/i,
  /checker/i,
  /preview/i,
  /slurp/i, // Yahoo
  /baidu/i, // Baidu
  /yandex/i, // Yandex
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /google/i, // Googlebot, Google-Read-Aloud, etc.
  /bing/i, // Bingbot
  /duckduckbot/i,
  /applebot/i,
  /petalbot/i, // Huawei
  /semrush/i,
  /ahrefs/i,
  /dataprovider/i,
  /python-requests/i,
  /curl/i,
  /wget/i,
  /go-http-client/i,
  /java\//i,
  /okhttp/i,
  /httpclient/i,
  /node-fetch/i,
  /axios/i,
  /gtmetrix/i,
  /lighthouse/i,
  /w3c_validator/i,
  /headless/i, // Headless Chrome
  /phantom/i, // PhantomJS
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /cypress/i,
];

/**
 * Detect if a request is likely from a bot/crawler.
 * Returns { isBot, reason, datacenter }.
 *
 * Step 4 (ASN) catches the Chrome-spoofing cloud scrapers the UA list can't see
 * (Hetzner/DO/OVH/AWS running headless Chrome). A datacenter IP firing a client
 * beacon is a scraper by definition — real visitors don't browse from hosting
 * providers. lookupAsn is cached 24h + fail-soft, so the per-request cost is one
 * cached map lookup for repeat IPs (the common case for a fixed scraper).
 */
export async function detectBot(
  userAgent: string | null,
  ip: string | null,
): Promise<{ isBot: boolean; reason: string | null; datacenter: boolean }> {
  // 1. No user-agent at all → definitely automated
  if (!userAgent || userAgent.trim() === "") {
    return { isBot: true, reason: "empty-ua", datacenter: false };
  }

  // 2. Match against known bot patterns
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, reason: `ua:${pattern.source}`, datacenter: false };
    }
  }

  // 3. Suspiciously short UA (real browsers are 100+ chars)
  if (userAgent.length < 30) {
    return { isBot: true, reason: "short-ua", datacenter: false };
  }

  // 4. Datacenter ASN (async lookup, 24h-cached). Ceiling: ip-api free tier is
  // 45/min; under sustained >45-new-IPs/min bursts this fail-softs to non-datacenter
  // and misses. Upgrade path: local GeoLite2 DB if that ever bites.
  if (ip) {
    const info = await lookupAsn(ip);
    if (isDatacenter(info)) {
      return {
        isBot: true,
        reason: `datacenter-asn:${info.asn ?? info.org ?? "?"}`,
        datacenter: true,
      };
    }
  }

  return { isBot: false, reason: null, datacenter: false };
}
