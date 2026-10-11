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
  const stockRecords = await prisma.stock.findMany({
    where: { ticker: { in: IDX_STOCKS.map((s) => s.ticker) } },
    select: { ticker: true, id: true },
  });
  const tickerToStockId = new Map(stockRecords.map((s) => [s.ticker, s.id]));
  const stockIdToDate = new Map(latestPriceDates.map((p) => [p.stockId, p._max.date]));

  // Sitemap shortlist: IDX40 (always) ∪ top 150 by latest-day transaction value
  // (close × volume). The other ~800 IDX stocks stay reachable at runtime, just
  // not promoted — they were thin pages driving the "discovered, not indexed" bucket.
  const liquidRows = latestDate
    ? await prisma.stockPrice.findMany({
        where: { date: latestDate },
        select: { close: true, volume: true, stock: { select: { ticker: true } } },
      })
    : [];
  const sitemapTickers = new Set<string>(idx40Set);
  liquidRows
    .map((r) => ({ ticker: r.stock.ticker, value: r.close.toNumber() * Number(r.volume) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 150)
    .forEach((r) => sitemapTickers.add(r.ticker));

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
  const stockPages = IDX_STOCKS.filter((stock) => sitemapTickers.has(stock.ticker)).map((stock) => {
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
  const indicatorHistoryPages = IDX_STOCKS.filter((s) => sitemapTickers.has(s.ticker)).map((s) => {
    const sid = tickerToStockId.get(s.ticker);
    const realDate = sid ? stockIdToDate.get(sid) : undefined;
    return {
      url: `${baseUrl}/stocks/${s.ticker.replace(/\.JK$/, "").toLowerCase()}/indikator`,
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

  // Exclude stale articles (auto-noindex — see article-freshness.ts), unpromoted
  // wave landings, and per-ticker types now 308'd to /stocks (DAILY_SNAPSHOT via
  // saham-<ticker>, STOCK_ANALYSIS via analisa-teknikal-<ticker> — their content
  // lives on the stock page, so listing them here would advertise redirected URLs)
  const articlePages = articles
    .filter((a) => a.articleType !== ArticleType.DAILY_SNAPSHOT)
    .filter((a) => a.articleType !== ArticleType.STOCK_ANALYSIS)
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

  // FAQ pages
  const faqPages = await prisma.question.findMany({
    where: { status: "ANSWERED" },
    select: { slug: true, updatedAt: true },
  });

  const faqSitemapEntries = faqPages.map((q) => ({
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
    { url: `${baseUrl}/harga-saham-hari-ini`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
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
    { url: `${baseUrl}/broker-saham-terbaik`, lastModified: today, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/community`, lastModified: today, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/compare`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.3 },
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
    ...glossaryPages,
  ];
}
