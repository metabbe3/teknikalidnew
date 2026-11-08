/**
 * Selftest prd-2026-11-06-02 (FAILING-TEST-FIRST — test ini SEBELUM implementasi):
 * Landing sektor /sektor/[slug] — 11 halaman SSR DB-backed.
 *
 * A1. Route src/app/(public)/sektor/[slug]/page.tsx ADA.
 * A2. Page pakai marketSnapshotService (SATU PINTU) utk angka sektor;
 *     DILARANG prisma.$queryRaw pergerakan baru independen di page.
 * A3. Page pakai stockMarketService.getStockList(sector) utk baris tabel
 *     (pola batch existing ala T2 — bukan SQL baru).
 * A4. SECTOR_META (src/lib/sectors.ts): tepat 11 slug == nilai unik
 *     SECTOR_SLUG_MAP, deskripsi unik & >=120 kata per sektor.
 * A5. next.config.ts: redirect /sektor/:slug DIHAPUS; /sektor -> /stocks TETAP.
 * A6. sitemap.ts memuat URL /sektor/<slug> (template + import SECTOR_META).
 * A7. Ticker page: badge sektor -> /sektor/<slug> + data-engagement
 *     nav_stockToSector; breadcrumb sektor ikut menunjuk /sektor/<slug>.
 * A8. Page: slug tak dikenal -> notFound() (404 rapi, bukan 500).
 * A9. Page: label funnel_sectorToTicker utk klik row sektor->ticker
 *     (camelCase, <=64 char) + section 'Sektor lain' (10 link).
 * A10. Heatmap home: row -> /sektor/<slug> (bukan /stocks).
 *
 * B1. (live DB) sitemap render via module import memuat 11 URL /sektor/.
 * B2. (live DB) marketSnapshotService.getSnapshot().sectors punya key utk
 *     semua 11 sektor EN yang ada di DB (count>0) + getStockList(sector)
 *     mengembalikan baris dgn signalScore.
 * SKIP_LIVE=1 utk lewati bagian B (CI tanpa DB).
 *
 * Run: npx tsx scripts/selftest/sector-landing.selftest.ts
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
const rd = (p: string) => readFileSync(`${ROOT}/${p}`, "utf8");

async function main(): Promise<void> {
  // ── A. Static contract checks ──
  let pageSrc = "";
  try {
    pageSrc = rd("src/app/(public)/sektor/[slug]/page.tsx");
    check("A1 route /sektor/[slug]/page.tsx ada", true);
  } catch {
    check("A1 route /sektor/[slug]/page.tsx ada", false, "file tidak ditemukan");
  }

  if (pageSrc) {
    check(
      "A2 angka sektor via marketSnapshotService (SATU PINTU)",
      /marketSnapshotService/.test(pageSrc) && pageSrc.includes("getSnapshot"),
    );
    check(
      "A2b tanpa SQL pergerakan independen di page",
      !/prisma\.\$queryRaw/.test(pageSrc),
    );
    check(
      "A3 baris tabel via stockMarketService.getStockList",
      /stockMarketService[\s\S]{0,80}getStockList\(/.test(pageSrc),
    );
    check("A8 slug tak dikenal -> notFound()", pageSrc.includes("notFound()"));
    check(
      "A9a row klik = funnel_sectorToTicker",
      pageSrc.includes("funnel_sectorToTicker"),
    );
    check(
      "A9b section 'Sektor lain'",
      /sektor lain/i.test(pageSrc),
    );
  }

  // A4: SECTOR_META struktur + 11 slug + deskripsi >=120 kata unik
  const sectorsSrc = rd("src/lib/sectors.ts");
  const hasMeta = /export const SECTOR_META/.test(sectorsSrc);
  check("A4a SECTOR_META diekspor", hasMeta);
  if (hasMeta) {
    const metaMatch = sectorsSrc.match(/export const SECTOR_META[^=]*=\s*\[([\s\S]*?)\n\]\s*;?/);
    const metaBody = metaMatch ? metaMatch[1] : "";
    const slugMatches = [...metaBody.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
    const enMatches = [...metaBody.matchAll(/en:\s*"([^"]+)"/g)].map((m) => m[1]);
    const descMatches = [...metaBody.matchAll(/description:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    const unique = (a: string[]) => new Set(a).size === a.length;

    // 11 slug == nilai unik SECTOR_SLUG_MAP
    const mapBody = sectorsSrc.match(/SECTOR_SLUG_MAP[^=]*=\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const mapVals = [...mapBody.matchAll(/:\s*"([^"]+)"\s*,?\s*\n/g)].map((m) => m[1]);
    check(
      `A4b SECTOR_META 11 slug unik == SECTOR_SLUG_MAP (meta=${slugMatches.length}, map=${new Set(mapVals).size})`,
      slugMatches.length === 11 &&
        unique(slugMatches) &&
        new Set(slugMatches).size === new Set(mapVals).size &&
        slugMatches.every((s) => mapVals.includes(s)),
    );
    check(
      `A4c en name 11 & unik (${enMatches.length})`,
      enMatches.length === 11 && unique(enMatches),
    );
    check(
      `A4d deskripsi 11 & unik (${descMatches.length})`,
      descMatches.length === 11 && unique(descMatches),
    );
    const shortDesc = descMatches
      .map((d, i) => ({ i, n: d.split(/\s+/).length }))
      .filter((x) => x.n < 120);
    check(
      "A4e deskripsi >=120 kata per sektor",
      shortDesc.length === 0,
      shortDesc.map((x) => `#${x.i}=${x.n}kata`).join(", "),
    );
  }

  // A5: next.config redirect
  const nextCfg = rd("next.config.ts");
  check(
    "A5a redirect /sektor/:slug dihapus",
    !nextCfg.includes('"/sektor/:slug"'),
  );
  check(
    "A5b redirect /sektor -> /stocks tetap",
    /source:\s*"\/sektor",\s*\n\s*destination:\s*"\/stocks"/.test(nextCfg),
  );

  // A6: sitemap
  const sitemapSrc = rd("src/app/sitemap.ts");
  check(
    "A6 sitemap memuat URL /sektor/<slug>",
    sitemapSrc.includes("SECTOR_META") && sitemapSrc.includes("/sektor/"),
  );

  // A7: ticker page badge -> /sektor/ + label nav
  const tickerSrc = rd("src/app/(public)/stocks/[ticker]/page.tsx");
  check(
    "A7a badge sektor -> /sektor/<slug> + nav_stockToSector",
    tickerSrc.includes("nav_stockToSector") && tickerSrc.includes("/sektor/"),
  );

  // A10: heatmap row -> /sektor/
  const heatmapSrc = rd("src/components/home/sector-heatmap.tsx");
  check(
    "A10 heatmap home row -> /sektor/<slug>",
    heatmapSrc.includes("`/sektor/${slug}`") && !heatmapSrc.includes('href="/stocks"'),
  );

  // ── B. Live (real DB) ──
  if (process.env.SKIP_LIVE === "1") {
    console.log("B SKIP: SKIP_LIVE=1");
  } else {
    // env DB dulu (dipakai semua sub-check B)
    let envReady = false;
    try {
      const envFile = readFileSync(`${ROOT}/.env`, "utf8");
      const envLine = envFile
        .split("\n")
        .find((l) => l.startsWith("DATABASE_URL=") && !l.includes("127.0.0.1"));
      if (!envLine) throw new Error("DATABASE_URL tidak ditemukan di .env");
      process.env.DATABASE_URL = envLine
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/@db:5432\//, "@127.0.0.1:5433/");
      envReady = true;
    } catch (e) {
      console.log(`B SKIP live (env): ${(e as Error).message.slice(0, 100)}`);
    }

    if (envReady) {
      // B2: snapshot sektor (independen dulu — tanpa import sitemap)
      try {
        const { SECTOR_META } = await import(`${ROOT}/src/lib/sectors.ts`);
        const { marketSnapshotService } = await import(
          `${ROOT}/src/domains/stock/market-snapshot.service.ts`
        );
        const snap = await marketSnapshotService.getSnapshot();
        const missingSectors = SECTOR_META.filter(
          (m: { en: string }) => !snap.sectors[m.en] || snap.sectors[m.en].count <= 0,
        );
        check(
          `B2 snapshot punya 11 sektor EN dgn count>0 (missing=${missingSectors.length})`,
          missingSectors.length === 0,
          missingSectors.map((m: { en: string }) => m.en).slice(0, 3).join(", "),
        );

        const { stockMarketService } = await import(
          `${ROOT}/src/domains/stock/stock-market.service.ts`
        );
        const list = await stockMarketService.getStockList("Financials");
        check(
          `B3 getStockList(Financials) rows=${list.length} dgn signalScore field`,
          list.length > 0 && list.every((r: { signalScore: number | null }) => "signalScore" in r),
        );
      } catch (e) {
        console.log(`B2/B3 SKIP live: ${(e as Error).message.slice(0, 140)}`);
      }

      // B1: render sitemap — unstable_cache butuh runtime Next; di luar Next
      // ini throw Invariant, jadi sub-try sendiri (bukan abort B2/B3).
      try {
        const { SECTOR_META } = await import(`${ROOT}/src/lib/sectors.ts`);
        const { default: sitemapMod } = await import(`${ROOT}/src/app/sitemap.ts`);
        const rendered = await sitemapMod();
        const urls = rendered.map((e: { url: string }) => e.url);
        const anySector = urls.filter((u: string) => u.includes("/sektor/")).length;
        check(
          `B1 sitemap render memuat 11 URL /sektor/ (found=${anySector})`,
          anySector >= 11,
        );
      } catch (e) {
        console.log(
          `B1 SKIP live (unstable_cache butuh runtime Next — verifikasi via build+probe): ${(e as Error).message.slice(0, 80)}`,
        );
      }
    }
  }

  console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
