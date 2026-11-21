import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyReferrerGroup, buildLandingSourceLabel } from "../src/lib/landing-source";

/**
 * prd-2026-11-21-01 AC1 — landing_source instrument (failing-first).
 * Klassifikasi referrer → grup (sosmed/organic/direct/other) + label builder.
 * Murni pure function — tidak menyentuh DB.
 */
describe("landing-source classification (prd-2026-11-21-01)", () => {
  it(" Kasus 1: referrer threads/instagram/facebook/tiktok/x → sosmed", () => {
    assert.equal(classifyReferrerGroup("https://l.threads.com/p/abc"), "sosmed");
    assert.equal(classifyReferrerGroup("https://www.threads.net/@tek.id"), "sosmed");
    assert.equal(classifyReferrerGroup("https://www.instagram.com/"), "sosmed");
    assert.equal(classifyReferrerGroup("https://m.facebook.com/story.php"), "sosmed");
    assert.equal(classifyReferrerGroup("https://www.tiktok.com/@tek.id/video/1"), "sosmed");
    assert.equal(classifyReferrerGroup("https://x.com/tek_id/status/1"), "sosmed");
    assert.equal(classifyReferrerGroup("https://twitter.com/tek_id"), "sosmed");
    assert.equal(classifyReferrerGroup("https://t.co/abc123"), "sosmed");
  });

  it(" Kasus 2: google/bing/yahoo/duckduckgo → organic", () => {
    assert.equal(classifyReferrerGroup("https://www.google.com/"), "organic");
    assert.equal(classifyReferrerGroup("https://www.google.co.id/search?q=saham"), "organic");
    assert.equal(classifyReferrerGroup("https://www.bing.com/search?q=ihsg"), "organic");
    assert.equal(classifyReferrerGroup("https://duckduckgo.com/"), "organic");
    assert.equal(classifyReferrerGroup("https://search.yahoo.com/search?p=ihsg"), "organic");
  });

  it(" Kasus 3: referrer teknikal.id sendiri = internal, BUKAN first-touch", () => {
    assert.equal(classifyReferrerGroup("https://teknikal.id/stocks"), "internal");
    assert.equal(classifyReferrerGroup("https://www.teknikal.id/"), "internal");
  });

  it(" Kasus 4: null / kosong / bukan URL → direct", () => {
    assert.equal(classifyReferrerGroup(null), "direct");
    assert.equal(classifyReferrerGroup(""), "direct");
    assert.equal(classifyReferrerGroup("not a url"), "direct");
  });

  it(" Kasus 5: host tak dikenal → other (bukan dibuang — tetap terdata)", () => {
    assert.equal(classifyReferrerGroup("https://example.com/page"), "other");
    assert.equal(classifyReferrerGroup("https://news.ycombinator.com/"), "other");
    assert.equal(classifyReferrerGroup("https://example.com/page"), "other");
  });

  it(" Kasus 6: utm_source eksplisit menang atas referrer (paid/kanal lain terdata)", () => {
    assert.equal(classifyReferrerGroup("https://example.com/", "telegram"), "sosmed");
    assert.equal(classifyReferrerGroup(null, "telegram"), "sosmed");
    assert.equal(classifyReferrerGroup(null, "google"), "organic");
  });

  it(" Kasus 7: buildLandingSourceLabel — format landing:<group>:<path-seg> (cap 64)", () => {
    assert.equal(buildLandingSourceLabel("sosmed", "/"), "landing:sosmed:/");
    assert.equal(buildLandingSourceLabel("organic", "/stocks"), "landing:organic:/stocks");
    assert.equal(buildLandingSourceLabel("direct", "/paper-trading"), "landing:direct:/paper-trading");
    // path panjang di-cap 64 char (kolom label VARCHAR(64))
    const long = "/" + "a".repeat(80);
    assert.ok(buildLandingSourceLabel("other", long).length <= 64);
  });
});
