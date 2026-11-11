import { promises as fs } from "node:fs";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { IDX_STOCKS, IDX40_TICKERS, SITE_URL } from "@/lib/constants";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { passesDepthGate } from "@/lib/glossary-deep-dives";
import { IDX_INDICES } from "@/lib/idx-indices";
import { ArticleType } from "@/generated/prisma/client";
import { isStaleArticle, isEvergreenIndexed } from "@/domains/article/article-freshness";
import KURASI_KEEP from "@/lib/seo/kurasi-keep"; // ADV-2: survivor whitelist kenapa-* pages
import { prisma } from "@/lib/prisma";
import { stockMarketService } from "@/domains/stock/stock-market.service";

// force-dynamic tetap digunakan karena build stage Next.js tidak memiliki koneksi DB.
// revalidate=3600 sebelumnya dihapus karena kontradiktif dengan force-dynamic (force-dynamic menang).
// Caching sitemap kini ditangani oleh unstable_cache dengan TTL 3600s (1 jam) dan revalidateTags ["sitemap"],
// sehingga query DB berat hanya dieksekusi sekali per jam saat runtime.
export const dynamic = "force-dynamic";

/** Mondays of the last n completed weeks (skips the in-progress week — it has
 *  no full trading data yet; bounded list, anti-spam: no unbounded dated URLs). */
function lastNWeeks(n: number): Date[] {
  const mon = new Date();
  const day = mon.getUTCDay();
  mon.setUTCDate(mon.getUTCDate() + (day === 0 ? -6 : 1 - day) - 7); // previous Monday
  mon.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const w = new Date(mon);
    w.setUTCDate(w.getUTCDate() - i * 7);
    return w;
  });
}

const getCachedSitemap = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    const baseUrl = SITE_URL;
    const idx40Set = new Set(IDX40_TICKERS);
    const today = new Date();

    // ── Fetch real lastmod dates from the database ──

    // Latest trading date — used to rank liquidity for the sitemap shortlist
    const latestPriceRow = await prisma.stockPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const latestDate = latestPriceRow?.date;

    // Get latest price date per stock (for stock pages)
    // OPTIMIZED: raw SELECT DISTINCT ON ("stockId") replaces groupBy to leverage index
    // and avoid 550k-row parallel seq scan.
    const latestPriceDates = await prisma.$queryRaw<Array<{ stockId: number; date: Date }>>`
      SELECT DISTINCT ON ("stockId") "stockId", date
      FROM "StockPrice"
      ORDER BY "stockId", date DESC
    `;

    // Build ticker→date map via Stock table
    // seo-2026-10-29 (delisting BEI 10 Nov): exclude non-active (suspended/delisted) dari sitemap
    const stockRecords = await prisma.stock.findMany({
      where: { ticker: { in: IDX_STOCKS.map((s) => s.ticker) }, isActive: true },
      select: { ticker: true, id: true },
    });
    const tickerToStockId = new Map(stockRecords.map((s) => [s.ticker, s.id]));
    const stockIdToDate = new Map(latestPriceDates.map((p) => [p.stockId, p.date]));

  // Sitemap shortlist: IDX40 (always) ∪ top 500 by 20-day average transaction value
  // (close × volume) ∪ GSC top-query stocks (search intent proven). The rest stay
  // reachable at runtime, just not promoted — thin pages drove the
  // "discovered, not indexed" bucket. Top-500 by avg20 is stabler than single-day
  // value (gorengan spike hari tunggal tak lolos). CPRO #304, SOSS #659, MAPB #877 —
  // masuk lewat GSC list; DARYA query = DVLA.JK (#790).
  const gscIntentTickers = new Set([
    "CPRO.JK", // "cpro saham" — GSC top query, halaman tak terindeks
    "MAPB.JK", // MAP Boga Adiperkasa — GSC query
    "SOSS.JK", // Shield On Service — GSC query
    "DVLA.JK", // "darya varia" = Darya-Varia Laboratoria — GSC top query
    "ELTY.JK", // "elty" — sudah masuk top-150 tapi dijamin
    // SEO-03 (audit 3 Nov): query GSC terbukti ada intent, halaman 200 tapi di luar
    // shortlist top-580 likuiditas — masukkan manual (sitemap ⊇ halaman ber-intent):
    "KONI.JK",   // "saham koni" pos 61,4 — 200 tapi tak di sitemap
    "MPRO.JK",   // "saham mpro" pos 80,2 — 200 tapi tak di sitemap
    "STAR.JK",   // "saham star" pos 92,6 — 200 tapi tak di sitemap
    "APIC.JK",   // "saham apic" pos 68,4
    "BRIS.JK",   // "harga saham bris hari ini" pos 70,8 — terbaik cluster ticker
  ]);
  const liquidRows = latestDate
    ? await prisma.stockPrice.findMany({
        where: { date: { gte: new Date(latestDate.getTime() - 30 * 24 * 3600 * 1000) } },
        select: {
          close: true,
          volume: true,
          stockId: true,
          stock: { select: { ticker: true, isActive: true } },
        },
      })
    : [];
  // avg transaction value over the window per stock (≈20 trading days in 30 calendar days)
  const avgValueByTicker = new Map<number, { ticker: string; value: number }>();
  for (const r of liquidRows) {
    if (r.stock.isActive === false) continue; // delisted/suspended: jangan promosi
    const v = r.close.toNumber() * Number(r.volume);
    const cur = avgValueByTicker.get(r.stockId) ?? { ticker: r.stock.ticker, value: 0 };
    cur.value += v;
    avgValueByTicker.set(r.stockId, cur);
  }
  const sitemapTickers = new Set<string>(idx40Set);
  [...avgValueByTicker.values()]
    .map((a) => ({ ...a, value: a.value / 21 })) // avg per hari-trading
    .sort((a, b) => b.value - a.value)
    // seo-2026-10-18-03: 500→580 — ekspansi batch-1 halaman /saham/* (+80 saham likuid yang
    // belum di-sitemap; halamannya sudah 200 deterministik). Gate rollout programmatic:
    // batch 50-100, monitor GSC 2-4 minggu sebelum batch-2 (target akhir 962 aktif).
    .slice(0, 580)
    .forEach((r) => sitemapTickers.add(r.ticker));
  gscIntentTickers.forEach((t) => sitemapTickers.add(t));

  // Phase 3 staged stock claim: add human-promoted wave tickers; keep unpromoted
  // wave landing articles out of the sitemap until an editor reviews them.
  const promotedWave = await prisma.waveAssignment.findMany({
    where: { status: "PROMOTED" },
    select: { ticker: true },
  });
  promotedWave.forEach((w) => sitemapTickers.add(w.ticker));
  const unpromotedLandingIds = new Set(
    (await prisma.waveAssignment.findMany({
      where: { status: { not: "PROMOTED" }, landingArticleId: { not: null } },
      select: { landingArticleId: true },
    }))
      .map((w) => w.landingArticleId)
      .filter((id): id is string => id != null),
  );

  // Enrich the shortlisted stocks with real dates
  // seo-2026-10-29: guard final — ticker non-aktif (delisted/suspended) tak boleh masuk sitemap dari jalur manapun
  const stockPages = IDX_STOCKS.filter((stock) => sitemapTickers.has(stock.ticker) && tickerToStockId.has(stock.ticker)).map((stock) => {
    const sid = tickerToStockId.get(stock.ticker);
    const realDate = sid ? stockIdToDate.get(sid) : undefined;
    return {
      url: `${baseUrl}/stocks/${stock.ticker}`,
      // seo-adv3 (purist audit 3 Nov): mass-stamp regeneratif merusak kepercayaan
      // crawl scheduling Google — fallback tanggal bohong DIHAPUS; lastmod hanya
      // bila ada tanggal EOD riil per-URL (Google: "we're not going to believe
      // you anymore"). Omit = jujur.
      ...(realDate ? { lastModified: realDate } : {}),
      changeFrequency: "daily" as const,
      priority: idx40Set.has(stock.ticker) ? 0.8 : 0.6,
    };
  });

  // "Kenapa naik/turun hari ini" pages — segmentasi hijau vs merah dari data EOD terakhir.
  // Naik hanya emit saat change% > 0; turun saat change% < 0; netral (0%) tidak di-emit keduanya.
  const equityStockList = await stockMarketService.getStockList().catch(() => []);
  const tickerChangeMap = new Map<string, number | null>(
    equityStockList.map((s) => [s.ticker, s.changePercent]),
  );

  const kenapaPages: MetadataRoute.Sitemap = [];
  for (const stock of IDX_STOCKS) {
    if (!sitemapTickers.has(stock.ticker)) continue;
    // ADV-2 kurasi (3 Nov): hanya survivor + GSC-intent keep yang masuk sitemap —
    // noindex di sitemap = sinyal kontradiktif (Purist audit)
    if (!KURASI_KEEP.has(stock.ticker.replace(/\.JK$/, "").toUpperCase())) continue;
    const change = tickerChangeMap.get(stock.ticker) ?? null;
    if (change === null || change === 0) continue; // Netral (0%) → jangan emit keduanya

    const sid = tickerToStockId.get(stock.ticker);
    const realDate = sid ? stockIdToDate.get(sid) : undefined;
    const cleanTicker = stock.ticker.replace(/\.JK$/, "").toLowerCase();
    const route = change > 0 ? "kenapa-naik-hari-ini" : "kenapa-turun-hari-ini";

    kenapaPages.push({
      url: `${baseUrl}/saham/${cleanTicker}/${route}`,
      // seo-adv3: omit lastmod bila tanpa tanggal riil (anti mass-stamp)
      ...(realDate ? { lastModified: realDate } : {}),
      changeFrequency: "daily" as const,
      priority: idx40Set.has(stock.ticker) ? 0.7 : 0.5,
    });
  }

  // Indicator history TABLE pages — one URL per ticker (NOT per date).
  // Anti-spam: collapsed ~47k dated URLs into ~190 table pages. See SEO plan.
  // seo-dr-2 (deep-research 641c019): diet crawl-budget — /indikator hanya 40 saham IDX40
  // (575 URL boilerplate 28,3% sitemap, volume query ~0 → thin-content risk).
  const indicatorHistoryPages = IDX_STOCKS.filter((s) => sitemapTickers.has(s.ticker) && idx40Set.has(s.ticker)).map((s) => {
    const sid = tickerToStockId.get(s.ticker);
    const realDate = sid ? stockIdToDate.get(sid) : undefined;
    return {
      // seo-2026-10-15-01: gunakan TICKER.JK uppercase — konsisten dengan canonical halaman utama/indikator.
      url: `${baseUrl}/stocks/${s.ticker}/indikator`,
      // seo-adv3: omit lastmod bila tanpa tanggal riil (anti mass-stamp)
      ...(realDate ? { lastModified: realDate } : {}),
      changeFrequency: "daily" as const,
      priority: idx40Set.has(s.ticker) ? 0.6 : 0.4,
    };
  });

  // Article pages — all PUBLISHED articles indexed regardless of isListed flag
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, updatedAt: true, articleType: true, tickerTag: true },
  });

  // Exclude stale articles (auto-noindex — see article-freshness.ts) and unpromoted
  // wave landings. DAILY_SNAPSHOT (saham-<ticker>) and LEGACY per-ticker analyses
  // (slug analisa-teknikal-<ticker>, 308'd to /stocks by proxy.ts) must stay out —
  // listing them would advertise redirected URLs. The NEW per-stock analyses
  // (slug analisa-saham-<ticker>-…, live 200 + "index, follow" since 11 Okt 2026)
  // ARE included: qa-2026-10-25-01 — compounding GROWTH assets must be crawlable.
  // Size bound: isStaleArticle drops STOCK_ANALYSIS older than 60d (evergreen
  // bucket) — stricter than the 90d recency cap proposed in the spec.
  // seo-2026-11-05: redirect paths dari next.config (21 source) — halaman yang 301
  // tidak boleh menghabiskan crawl budget di sitemap. Dibaca dari file config langsung
  // supaya redirect baru otomatis ter-exclude tanpa edit ganda.
  let nextConfigSrc = "";
  try {
    nextConfigSrc = await fs.readFile("next.config.ts", "utf8");
  } catch {
    // File tidak ada di runtime (image lama) — fallback: sitemap tanpa filter redirect.
  }
  const redirectPaths = new Set<string>();
  const redirectBlock = nextConfigSrc.slice(
    nextConfigSrc.indexOf("async redirects"),
    nextConfigSrc.indexOf("async headers") > 0
      ? nextConfigSrc.indexOf("async headers")
      : undefined,
  );
  for (const m of redirectBlock.matchAll(/source:\s*"([^"]+)"/g)) {
    if (!m[1].includes(":")) redirectPaths.add(m[1]); // statis saja; :param bukan URL sitemap
  }

  const articlePages = articles
    .filter((a) => a.articleType !== ArticleType.DAILY_SNAPSHOT)
    .filter((a) => !a.slug.startsWith("analisa-teknikal-"))
    // qa-2026-10-30-03: EDUCATIONAL evergreen selalu indexable (/akademi tak pernah
    // noindex) — jangan di-drop oleh stale-filter; sitemap wajib ⊇ halaman indexable.
    .filter((a) => isEvergreenIndexed(a) || !isStaleArticle(a))
    .filter((a) => !unpromotedLandingIds.has(a.id))
    // seo-2026-11-05: exclude Article yang di-redirect next.config (golden-cross legacy dll).
    .filter((a) => {
      const p2 = a.articleType === ArticleType.EDUCATIONAL ? `/akademi/${a.slug}` : `/berita/${a.slug}`;
      return !redirectPaths.has(p2);
    })
    .map((a) => {
    const isEducational = a.articleType === ArticleType.EDUCATIONAL;
    const path = isEducational ? `/akademi/${a.slug}` : `/berita/${a.slug}`;

    const priority = 0.7;

    return {
      url: `${baseUrl}${path}`,
      lastModified: a.updatedAt,
      changeFrequency: isEducational ? "weekly" as const : "monthly" as const,
      priority,
    };
  });

  // FAQ pages — seo-dr-2: hanya jawaban kaya (>=1500 char ≈ 250 kata) yang masuk sitemap;
  // 115 halaman tanya tipis (122-158 kata) ditarik keluar demi crawl budget.
  const faqPages = await prisma.question.findMany({
    where: { status: "ANSWERED" },
    select: { slug: true, updatedAt: true, shortAnswer: true, longAnswer: true },
  });

  const faqSitemapEntries = faqPages
    .filter((q) => ((q.longAnswer ?? q.shortAnswer)?.length ?? 0) >= 1500)
    // seo-2026-11-05 (audit 955): exclude URL yang 301 via next.config redirects —
    // single source of truth: tambah redirect baru = otomatis keluar dari sitemap.
    .filter((q) => !redirectPaths.has(`/akademi/tanya/${q.slug}`))
    .map((q) => ({
      url: `${baseUrl}/akademi/tanya/${q.slug}`,
      lastModified: q.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  // Profile pages — removed from sitemap (noindex via robots meta).
  // Keeping low-value UGC pages in the sitemap wastes crawl budget.

  // ── Static pages with today's date (they update daily) ──

  const indexIndex = {
    url: `${baseUrl}/indeks`,
    lastModified: today,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };

  const indexPages = IDX_INDICES.map((idx) => ({
    url: `${baseUrl}/indeks/${idx.slug}`,
    lastModified: today,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const glossaryIndex = {
    url: `${baseUrl}/akademi/glosarium`,
    lastModified: new Date("2026-01-01"),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  // prd-2026-11-02-03: re-entry SELEKTIF — hanya istilah lolos depth gate
  // (>=300 kata + contoh angka + link artikel). 45 istilah tetap dikecualikan
  // sesuai verdict seo-dr-2 (thin content); buka kunci massal = tunggu verdict
  // GSC batch-1 (14 hari pasca-deploy).
  const glossaryPages = GLOSSARY_TERMS.filter(passesDepthGate).map((t) => ({
    url: `${baseUrl}/akademi/glosarium/${t.slug}`,
    lastModified: new Date("2026-01-01"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    { url: baseUrl, lastModified: today, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/laporan-pasar`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    ...lastNWeeks(8).map((w) => ({
      url: `${baseUrl}/laporan-pasar/minggu-${w.toISOString().slice(0, 10)}`,
      lastModified: w,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/stocks`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/radar`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    // tracking-audit G6: URL 308 dikeluarkan (sudah redirect ke /stocks — jangan dibuang crawl budget)
    { url: `${baseUrl}/akademi`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/berita`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-oversold`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-overbought`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-golden-cross`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-akumulasi`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-uptrend`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-di-atas-ma200`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-macd-bullish`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-stochastic-oversold`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-volume-spike`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-death-cross`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-pullback-sma20`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-ema-cross`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-blue-chip`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/saham-dividen`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-undervalued`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-value-growth`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/broker-saham-terbaik`, lastModified: today, changeFrequency: "weekly", priority: 0.9 },
    // seo-dr-4/5 (deep-research 641c019): landing evergreen baru — data eksklusif BEI bebas login.
    { url: `${baseUrl}/kalender-dividen`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/aliran-dana-asing`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/saham-modal-100-ribu`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    // seo-dr-2: /compare (shell 52 kata) + halaman legal keluar dari sitemap — buang beban crawl.
    { url: `${baseUrl}/about`, lastModified: today, changeFrequency: "monthly", priority: 0.6 },
    ...stockPages,
    ...kenapaPages,
    ...indicatorHistoryPages,
    ...articlePages,
    ...faqSitemapEntries,indexIndex,
    ...indexPages,
    glossaryIndex,
    // seo-dr-2 verdict tetap utk 45 istilah thin; re-entry selektif prd-2026-11-02-03:
    // hanya 15 istilah depth-gated yang masuk sitemap (+15 URL, 0 perubahan lain).
    ...glossaryPages,
  ];
},
["sitemap-cache-v1"],
{ revalidate: 3600, tags: ["sitemap"] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getCachedSitemap();
}
