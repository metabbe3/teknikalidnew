/**
 * Selftest prd-2026-11-19-01 (CTO night 19 Nov): fuel klaster halaman pivot.
 *
 * FASE-1 PRD idea-2026-11-19-1: 4 halaman pivot (aliran-dana-asing/agent/
 * paper-trading/bottom-fishing) = 6,6% views tapi terlibat 29% register situs
 * (5/17, dedup anonId) — konversi 3-5x baseline — namun 0 dukungan konten.
 *
 * Failing-test-first: file ini dijalankan SEBELUM implementasi — [C1]..[C8]
 * harus GAGAL (fungsi/repository/dispatch/section/sitemap belum ada).
 * Pasca-implementasi semua HIJAU.
 *
 * Run: npx tsx scripts/selftest/foreign-flow-daily.selftest.ts — Exit 0 = PASS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("[C1] article.service: fungsi generateForeignFlowDaily ada (template SATU PINTU, no AI call)", () => {
  const src = read("src/domains/article/article.service.ts");
  assert.ok(src.includes("generateForeignFlowDaily"), "fungsi generateForeignFlowDaily belum ada");
});

test("[C2] SATU PINTU: angka asing dari pasarLiveService._getSnapshotUncached (bypass cache 60s), bukan query independen", () => {
  const src = read("src/domains/article/article.service.ts");
  assert.ok(
    src.includes("_getSnapshotUncached"),
    "generator harus baca foreign flow via pasarLiveService._getSnapshotUncached (bypass micro-cache — data baru saja di-upsert sync-foreign)",
  );
  assert.ok(
    !/generateForeignFlowDaily[\s\S]*?foreignFlow\.findMany/.test(src),
    "generator DILARANG query ForeignFlow independen (doktrin satu pintu ref-2026-10-17-01)",
  );
});

test("[C3] repository: findLatestForeignFlowArticle utk dedupe per sesi + findRelatedForeignArticles utk section pivot", () => {
  const src = read("src/domains/article/article.repository.ts");
  assert.ok(src.includes("findLatestForeignFlowArticle"), "findLatestForeignFlowArticle belum ada di repository");
  assert.ok(src.includes("findRelatedForeignArticles"), "findRelatedForeignArticles belum ada di repository");
});

test("[C4] cron sync-foreign: dispatch artikel pasca-upsert (data segar 17:20, fire-soft)", () => {
  const src = read("src/app/api/cron/sync-foreign/route.ts");
  assert.ok(
    src.includes("generateForeignFlowDaily"),
    "sync-foreign route harus memanggil generateForeignFlowDaily pasca-upsert (data paling segar)",
  );
  assert.ok(
    /\.catch\(/.test(src),
    "panggilan harus fire-soft (.catch) agar kegagalan artikel tidak menggagalkan cron sync utama",
  );
});

test("[C5] cron generate-articles: fallback dispatch pagi (idempoten slug sesi)", () => {
  const src = read("src/app/api/cron/generate-articles/route.ts");
  assert.ok(
    src.includes("generateForeignFlowDaily"),
    "generate-articles pagi harus fallback generateForeignFlowDaily (kalau sync-foreign 17:20 gagal)",
  );
});

test("[C6] halaman pivot /aliran-dana-asing: section Artikel Terkait Aliran Dana Asing (max 3)", () => {
  const src = read("src/app/(public)/aliran-dana-asing/page.tsx");
  assert.ok(
    src.includes("findRelatedForeignArticles"),
    "halaman pivot harus query artikel terkait via findRelatedForeignArticles",
  );
  assert.ok(
    src.includes("Artikel Terkait"),
    "section 'Artikel Terkait' belum dirender di halaman pivot",
  );
});

test("[C7] cross-link: 3 halaman pivot (agent/paper-trading/bottom-fishing) memuat anchor ke cluster aliran-dana-asing", () => {
  for (const f of [
    "src/app/(public)/agent/page.tsx",
    "src/app/(public)/paper-trading/page.tsx",
    "src/app/(public)/bottom-fishing/page.tsx",
  ]) {
    const src = read(f);
    assert.ok(
      src.includes('"/aliran-dana-asing"'),
      `${f} belum memuat link ke /aliran-dana-asing (cross-cluster wiring AC4)`,
    );
  }
});

test("[C8] sitemap: 3 path pivot yatim masuk (/agent /paper-trading /bottom-fishing)", () => {
  const src = read("src/app/sitemap.ts");
  for (const p of ["/agent`", "/paper-trading`", "/bottom-fishing`"]) {
    assert.ok(
      src.includes("`${baseUrl}" + p),
      `sitemap belum memuat entry ${p} (AC3)`,
    );
  }
});
