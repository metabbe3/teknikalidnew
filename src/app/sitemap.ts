import type { MetadataRoute } from "next";
import { IDX_STOCKS, IDX40_TICKERS, SITE_URL } from "@/lib/constants";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { SECTORS } from "@/lib/sectors";
import { IDX_INDICES } from "@/lib/idx-indices";
import { ArticleType } from "@/generated/prisma/client";
import { isStaleArticle } from "@/domains/article/article-freshness";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // generated at runtime (build stage has no DB access)
export const revalidate = 3600; // Regenerate hourly

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  const latestPriceDates = await prisma.stockPrice.groupBy({
    by: ["stockId"],
    _max: { date: true },
  });

  // Build ticker→date map via Stock table
  // seo-2026-10-29 (delisting BEI 10 Nov): exclude non-active (suspended/delisted) dari sitemap
  const stockRecords = await prisma.stock.findMany({
    where: { ticker: { in: IDX_STOCKS.map((s) => s.ticker) }, isActive: true },
    select: { ticker: true, id: true },
  });
  const tickerToStockId = new Map(stockRecords.map((s) => [s.ticker, s.id]));
  const stockIdToDate = new Map(latestPriceDates.map((p) => [p.stockId, p._max.date]));

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
      lastModified: realDate ?? new Date("2026-01-01"),
      changeFrequency: "daily" as const,
      priority: idx40Set.has(stock.ticker) ? 0.8 : 0.6,
    };
  });

  // "Kenapa naik/turun hari ini" pages — deterministic, always-on (no longer 404).
  const kenapaPages = IDX_STOCKS.filter((stock) => sitemapTickers.has(stock.ticker)).map((stock) => {
    const sid = tickerToStockId.get(stock.ticker);
    const realDate = sid ? stockIdToDate.get(sid) : undefined;
    return {
      url: `${baseUrl}/saham/${stock.ticker.replace(/\.JK$/, "").toLowerCase()}/kenapa-naik-hari-ini`,
      lastModified: realDate ?? today,
      changeFrequency: "daily" as const,
      priority: idx40Set.has(stock.ticker) ? 0.7 : 0.5,
    };
  });

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
      lastModified: realDate ?? today,
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
  const articlePages = articles
    .filter((a) => a.articleType !== ArticleType.DAILY_SNAPSHOT)
    .filter((a) => !a.slug.startsWith("analisa-teknikal-"))
    .filter((a) => !isStaleArticle(a))
    .filter((a) => !unpromotedLandingIds.has(a.id))
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
    .map((q) => ({
      url: `${baseUrl}/akademi/tanya/${q.slug}`,
      lastModified: q.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  // Profile pages — removed from sitemap (noindex via robots meta).
  // Keeping low-value UGC pages in the sitemap wastes crawl budget.

  // ── Static pages with today's date (they update daily) ──

  const sectorIndex = {
    url: `${baseUrl}/sektor`,
    lastModified: today,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };

  const sectorPages = SECTORS.map((s) => ({
    url: `${baseUrl}/sektor/${s.slug}`,
    lastModified: today,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

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

  const glossaryPages = GLOSSARY_TERMS.map((t) => ({
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
    // tracking-audit G6: URL 308 dikeluarkan (sudah redirect ke /stocks — jangan dibuang crawl budget)
    { url: `${baseUrl}/akademi`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/berita`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-oversold`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-overbought`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-golden-cross`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
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
    { url: `${baseUrl}/community`, lastModified: today, changeFrequency: "daily", priority: 0.6 },
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
    ...faqSitemapEntries,
    sectorIndex,
    ...sectorPages,
    indexIndex,
    ...indexPages,
    glossaryIndex,
    // seo-dr-2: 60 glosarium per-term (82-86 kata) dikeluarkan; otoritas terkumpul di index.
    // ...glossaryPages,
  ];
}
