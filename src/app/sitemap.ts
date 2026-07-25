import type { MetadataRoute } from "next";
import { IDX_STOCKS, IDX40_TICKERS, SITE_URL } from "@/lib/constants";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { SECTORS } from "@/lib/sectors";
import { IDX_INDICES } from "@/lib/idx-indices";
import { ArticleType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // generated at runtime (build stage has no DB access)
export const revalidate = 3600; // Regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const idx40Set = new Set(IDX40_TICKERS);

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

  // Article pages — already use real updatedAt
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", isListed: true },
    select: { slug: true, updatedAt: true, articleType: true, tickerTag: true },
  });

  // Exclude non-IDX40 DAILY_SNAPSHOT from sitemap (noindex'd — reduces scaled-content signal)
  const articlePages = articles
    .filter((a) => !(a.articleType === "DAILY_SNAPSHOT" && a.tickerTag && !idx40Set.has(a.tickerTag)))
    .map((a) => {
    const isEducational = a.articleType === ArticleType.EDUCATIONAL;
    const isSnapshot = a.articleType === "DAILY_SNAPSHOT";
    const path = isEducational ? `/akademi/${a.slug}` : `/berita/${a.slug}`;
    const isIdx40Analysis = a.articleType === ArticleType.STOCK_ANALYSIS && a.tickerTag && idx40Set.has(a.tickerTag);

    let priority: number;
    if (isSnapshot) priority = 0.8;
    else if (isIdx40Analysis) priority = 0.9;
    else if (a.articleType === ArticleType.STOCK_ANALYSIS) priority = 0.8;
    else priority = 0.7;

    return {
      url: `${baseUrl}${path}`,
      lastModified: a.updatedAt,
      changeFrequency: isSnapshot ? "daily" as const : isEducational ? "weekly" as const : "monthly" as const,
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
  const today = new Date();

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
    { url: `${baseUrl}/stocks`, lastModified: today, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/akademi`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/berita`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-oversold`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-overbought`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-golden-cross`, lastModified: today, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/saham-blue-chip`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/broker-saham-terbaik`, lastModified: today, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/community`, lastModified: today, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/compare`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/about`, lastModified: today, changeFrequency: "monthly", priority: 0.6 },
    ...stockPages,
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
