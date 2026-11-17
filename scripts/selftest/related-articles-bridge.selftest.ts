/**
 * Selftest prd-2026-11-17-01 (FAILING-TEST-FIRST — commit ini SEBELUM fix):
 * assert merge behavior bridge DS. Saat test ditulis, helper belum dipakai
 * page.tsx (query masih exclude DS) — test merge unit + konstanta kontrak.
 *
 * Run: npx tsx scripts/selftest/related-articles-bridge.selftest.ts
 * Exit 0 = PASS semua.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_DAILY_SNAPSHOT_SLOTS,
  mergeRelatedArticles,
  type RelatedArticleLite,
} from "../../src/lib/related-articles";

const T = (id: string, hoursAgo: number, articleType = "NEWS"): RelatedArticleLite => ({
  id,
  slug: `slug-${id}`,
  title: `Judul ${id}`,
  publishedAt: new Date(Date.now() - hoursAgo * 36e5),
  articleType,
});

test("kontrak slot: maksimal 2 DAILY_SNAPSHOT", () => {
  assert.equal(MAX_DAILY_SNAPSHOT_SLOTS, 2);
});

test("DS termuda masuk saat berita biasa kosong (ticker non-NEWS)", () => {
  const out = mergeRelatedArticles([], [T("a", 3, "DAILY_SNAPSHOT"), T("b", 26, "DAILY_SNAPSHOT")]);
  assert.equal(out.length, 2);
  assert.ok(out.every((x) => x.articleType === "DAILY_SNAPSHOT"));
});

test("cap DS = 2 walau DS tersedia lebih (ambil termuda)", () => {
  const out = mergeRelatedArticles(
    [T("n1", 30)],
    [T("d1", 1, "DAILY_SNAPSHOT"), T("d2", 2, "DAILY_SNAPSHOT"), T("d3", 50, "DAILY_SNAPSHOT")],
  );
  const ds = out.filter((x) => x.articleType === "DAILY_SNAPSHOT");
  assert.equal(ds.length, 2);
  assert.ok(ds.some((x) => x.id === "d1"));
  assert.ok(!out.some((x) => x.id === "d3")); // DS tertua digugurkan
});

test("merge re-sort recency: DS 3 jam lalu di atas berita 2 hari lalu", () => {
  const out = mergeRelatedArticles(
    [T("n1", 48), T("n2", 72)],
    [T("d1", 3, "DAILY_SNAPSHOT")],
  );
  assert.equal(out[0].id, "d1");
});

test("total cap take 6 (5 berita + DS tak meluber)", () => {
  const out = mergeRelatedArticles(
    [T("n1", 10), T("n2", 20), T("n3", 30), T("n4", 40), T("n5", 50), T("n6", 60)],
    [T("d1", 1, "DAILY_SNAPSHOT"), T("d2", 2, "DAILY_SNAPSHOT"), T("d3", 3, "DAILY_SNAPSHOT")],
  );
  assert.equal(out.length, 6);
  assert.equal(out.filter((x) => x.articleType === "DAILY_SNAPSHOT").length, 2);
});

test("berita biasa murni: tak berubah perilaku (path lama tetap aman)", () => {
  const out = mergeRelatedArticles([T("n1", 5), T("n2", 25)], []);
  assert.deepEqual(out.map((x) => x.id), ["n1", "n2"]);
});
