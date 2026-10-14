/**
 * Self-test untuk internal-link gate di src/domains/article/article-fact-check.ts
 * (PRD idea-2026-10-12-3 AC3 / task prd-2026-10-12-02).
 * Run: npx tsx --tsconfig tsconfig.json scripts/selftest-factcheck-links.ts
 *
 * Pure-function fixture — validateInternalLinks menerima slug sets sehingga
 * testable tanpa DB. Fixture = slug live yang pernah salah di-generate
 * (root-path tanpa prefix, 16 link di-backfill via SQL 2026-10-13).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateInternalLinks } from "../src/domains/article/article-fact-check";

const EDU_SLUGS = new Set(["cara-membaca-macd-saham-panduan-trader-pemula"]);
const NEWS_SLUGS = new Set(["brief-pasar-idx-2026-10-13-pasar-merah-lebar"]);

describe("validateInternalLinks — gate prefix link internal", () => {
  it("(a) link edu root-path → error, wajib prefix /akademi/", () => {
    const content =
      "Untuk dasar-dasarnya, baca [panduan MACD lengkap](/cara-membaca-macd-saham-panduan-trader-pemula) terlebih dahulu.";
    const issues = validateInternalLinks(content, EDU_SLUGS, NEWS_SLUGS);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].correctHref, "/akademi/cara-membaca-macd-saham-panduan-trader-pemula");
    assert.equal(
      issues[0].message,
      "Link internal artikel edukasi tanpa prefix /akademi/ (404): /cara-membaca-macd-saham-panduan-trader-pemula — ganti jadi /akademi/cara-membaca-macd-saham-panduan-trader-pemula",
    );
  });

  it("(b) link edu dengan prefix /akademi/ → lolos", () => {
    const content =
      "Baca [panduan MACD lengkap](/akademi/cara-membaca-macd-saham-panduan-trader-pemula) untuk dasarnya.";
    assert.deepEqual(validateInternalLinks(content, EDU_SLUGS, NEWS_SLUGS), []);
  });

  it("(c) link berita benar dengan prefix /berita/ → lolos", () => {
    const content =
      "Lihat [brief pasar kemarin](/berita/brief-pasar-idx-2026-10-13-pasar-merah-lebar) untuk konteksnya.";
    assert.deepEqual(validateInternalLinks(content, EDU_SLUGS, NEWS_SLUGS), []);
  });

  it("link berita root-path → error, wajib prefix /berita/", () => {
    const content =
      "Lihat [brief pasar kemarin](/brief-pasar-idx-2026-10-13-pasar-merah-lebar) untuk konteksnya.";
    const issues = validateInternalLinks(content, EDU_SLUGS, NEWS_SLUGS);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].correctHref, "/berita/brief-pasar-idx-2026-10-13-pasar-merah-lebar");
    assert.match(issues[0].message, /tanpa prefix \/berita\/ \(404\)/);
  });

  it("slug tak dikenal / path non-artikel / eksternal → tidak ada finding (no false positive)", () => {
    const content = [
      "Chart [BBCA](/stocks/BBCA), [screener](/stocks?view=screener),",
      "[hub berita](/berita), [artikel tak dikenal](/artikel-random-tidak-ada),",
      "plus [eksternal](https://example.com/x) dan [image](/cara-membaca-macd-saham-panduan-trader-pemula.png).",
    ].join(" ");
    assert.deepEqual(validateInternalLinks(content, EDU_SLUGS, NEWS_SLUGS), []);
  });
});
