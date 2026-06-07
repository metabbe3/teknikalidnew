import type { MetadataRoute } from "next";
import { IDX_STOCKS, IDX40_TICKERS, SITE_URL } from "@/lib/constants";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { SECTORS } from "@/lib/sectors";
import { ArticleType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const idx40Set = new Set(IDX40_TICKERS);
  const STATIC_DATE = new Date("2026-01-01");

  const stockPages = IDX_STOCKS.map((stock) => ({
    url: `${baseUrl}/stocks/${stock.ticker}`,
    lastModified: STATIC_DATE,
    changeFrequency: "daily" as const,
    priority: idx40Set.has(stock.ticker) ? 0.8 : 0.5,
  }));

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true, articleType: true, tickerTag: true },
  });

  const articlePages = articles.map((a) => {
    const isEducational = a.articleType === ArticleType.EDUCATIONAL;
    const isSnapshot = a.articleType === "DAILY_SNAPSHOT";
    const path = isEducational ? `/akademi/${a.slug}` : `/berita/${a.slug}`;
    const isIdx40Analysis = a.articleType === ArticleType.STOCK_ANALYSIS && a.tickerTag && idx40Set.has(a.tickerTag);

    let priority: number;
    if (isSnapshot) priority = 0.5;
    else if (isIdx40Analysis) priority = 0.9;
    else if (a.articleType === ArticleType.STOCK_ANALYSIS) priority = 0.8;
    else priority = 0.7;

    return {
      url: `${baseUrl}${path}`,
      lastModified: a.updatedAt,
      changeFrequency: isSnapshot ? "never" as const : isEducational ? "weekly" as const : "monthly" as const,
      priority,
    };
  });

  // FAQ pages for sitemap
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

  const activeUsers = await prisma.user.findMany({
    where: { bannedAt: null },
    orderBy: { reputation: "desc" },
    take: 100,
    select: { username: true, createdAt: true },
  });

  const profilePages = activeUsers.map((u) => ({
    url: `${baseUrl}/profile/${u.username}`,
    lastModified: u.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));

  // Sector pages
  const sectorIndex = {
    url: `${baseUrl}/sektor`,
    lastModified: STATIC_DATE,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };

  const sectorPages = SECTORS.map((s) => ({
    url: `${baseUrl}/sektor/${s.slug}`,
    lastModified: STATIC_DATE,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Glossary pages
  const glossaryIndex = {
    url: `${baseUrl}/akademi/glosarium`,
    lastModified: STATIC_DATE,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  const glossaryPages = GLOSSARY_TERMS.map((t) => ({
    url: `${baseUrl}/akademi/glosarium/${t.slug}`,
    lastModified: STATIC_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    { url: baseUrl, lastModified: STATIC_DATE, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/stocks`, lastModified: STATIC_DATE, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/akademi`, lastModified: STATIC_DATE, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/berita`, lastModified: STATIC_DATE, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/screener`, lastModified: STATIC_DATE, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/community`, lastModified: STATIC_DATE, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/compare`, lastModified: STATIC_DATE, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/disclaimer`, lastModified: STATIC_DATE, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: STATIC_DATE, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: STATIC_DATE, changeFrequency: "monthly", priority: 0.3 },
    ...stockPages,
    ...articlePages,
    ...faqSitemapEntries,
    ...profilePages,
    sectorIndex,
    ...sectorPages,
    glossaryIndex,
    ...glossaryPages,
  ];
}
