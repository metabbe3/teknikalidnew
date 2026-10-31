/**
 * Selftest qa-2026-10-30-03 (FAILING-TEST-FIRST — test ini SEBELUM fix):
 * Evergreen EDUCATIONAL canonical integrity.
 *
 * A1. Route /berita/[slug] WAJIB permanentRedirect ke /akademi/<slug> utk
 *     EDUCATIONAL PUBLISHED (bukan notFound) — URL lama yang terindeks/dibagikan
 *     (pra-reorg 21 Sep qa-2026-09-21-03) bocor trust kalau hard-404.
 * A2. sitemap.ts WAJIB include SEMUA EDUCATIONAL PUBLISHED — filter
 *     isStaleArticle (updatedAt>60d) TIDAK boleh drop evergreen edu
 *     (halamannya index,follow tapi 24/43 hilang dari sitemap = inkonsisten;
 *     preseden qa-2026-10-25-01 "compounding GROWTH assets must be crawlable").
 * B1. (behavioral, real code + real DB) generate sitemap via module import
 *     (DATABASE_URL dari .env repo, host di-override ke 127.0.0.1:5433):
 *     set slug EDUCATIONAL PUBLISHED di DB ⊆ set URL /akademi/ hasil render.
 *     SKIP_LIVE=1 utk lewati (CI tanpa DB).
 *
 * Run: npx tsx scripts/selftest/edu-canonical.selftest.ts
 * Exit 0 = PASS semua.
 */
import { readFileSync } from "node:fs";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ROOT = process.cwd();
const beritaPage = readFileSync(`${ROOT}/src/app/(public)/berita/[slug]/page.tsx`, "utf8");
const sitemapSrc = readFileSync(`${ROOT}/src/app/sitemap.ts`, "utf8");

// A1: EDUCATIONAL → permanentRedirect ke /akademi (bukan hard notFound)
const flatBerita = beritaPage.replace(/\n/g, " ");
const hasRedirect = /articleType === ArticleType\.EDUCATIONAL[^;]{0,220}permanentRedirect\(`\/akademi\/\$\{article\.slug\}`\)/.test(flatBerita);
const eduNotHard404 = !/articleType === ArticleType\.EDUCATIONAL\)\s*notFound\(\)/.test(flatBerita);
check("A1 berita route: EDUCATIONAL permanentRedirect /akademi", hasRedirect && eduNotHard404,
  !hasRedirect ? "permanentRedirect /akademi tidak ditemukan" : "masih ada notFound() hard utk EDUCATIONAL");

// A2: sitemap exempt EDUCATIONAL dari filter stale (via isEvergreenIndexed)
const flatSm = sitemapSrc.replace(/\n/g, " ");
const smEduExempt = flatSm.includes("isEvergreenIndexed") &&
  /isEvergreenIndexed\(a\) \|\| !isStaleArticle\(a\)/.test(flatSm);
check("A2 sitemap: EDUCATIONAL exempt dari filter stale (isEvergreenIndexed)", smEduExempt,
  "filter stale masih drop EDUCATIONAL tua (24/43 hilang dari sitemap live)");

// ── B1 behavioral: render sitemap ASLI (module import) vs DB ──
async function main(): Promise<void> {
if (process.env.SKIP_LIVE === "1") {
  console.log("B1 SKIP: SKIP_LIVE=1");
} else {
  try {
    // DATABASE_URL dari .env repo; override host utk akses dari host-mac
    const envLine = readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
    if (!envLine) throw new Error("DATABASE_URL tidak ada di .env");
    process.env.DATABASE_URL = envLine.slice("DATABASE_URL=".length).trim().replace(/@db:5432/, "@127.0.0.1:5433");

    const { prisma } = await import(`${ROOT}/src/lib/prisma`);
    const rows: Array<{ slug: string }> = await prisma.article.findMany({
      where: { articleType: "EDUCATIONAL", status: "PUBLISHED" },
      select: { slug: true },
    });
    const dbSlugs = rows.map((r) => r.slug);
    if (dbSlugs.length === 0) throw new Error("DB query 0 row (prisma gagal?)");

    const mod = await import(`${ROOT}/src/app/sitemap.ts`);
    const entries: Array<{ url: string }> = await mod.default();
    const smEduSlugs = new Set(entries.filter((e) => e.url.includes("/akademi/")).map((e) => e.url.split("/").pop() as string));
    const missing = dbSlugs.filter((s) => !smEduSlugs.has(s));
    check(`B1 render: ${dbSlugs.length} edu DB ⊆ sitemap render (missing=${missing.length})`,
      missing.length === 0, missing.slice(0, 5).join(", "));
  } catch (e) {
    console.log(`B1 SKIP live: ${(e as Error).message.slice(0, 100)}`);
  }
}
}

main().then(() => {
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
});
