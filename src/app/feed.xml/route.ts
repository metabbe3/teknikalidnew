import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const revalidate = 3600;

export async function GET() {
  const articles = await prisma.article.findMany({
    where: {
      status: ArticleStatus.PUBLISHED,
      isListed: true,
      articleType: { in: [ArticleType.STOCK_ANALYSIS, ArticleType.NEWS, ArticleType.GENERAL] },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      tickerTag: true,
      author: { select: { name: true, username: true } },
    },
  });

  const items = articles
    .map((a) => {
      const escapedTitle = a.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedExcerpt = (a.excerpt ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const category = a.tickerTag ? `<category>${a.tickerTag.replace(".JK", "")}</category>` : "";

      return `    <item>
      <title>${escapedTitle}</title>
      <link>${SITE_URL}/berita/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/berita/${a.slug}</guid>
      <description>${escapedExcerpt}</description>
      <pubDate>${a.publishedAt.toUTCString()}</pubDate>
      <dc:creator>${a.author.name ?? a.author.username}</dc:creator>
      ${category}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
>
  <channel>
    <title>TeknikalID — Berita &amp; Analisis Saham BEI</title>
    <link>${SITE_URL}</link>
    <description>Analisis teknikal saham IDX terkini: insight harga, indikator, dan sinyal trading untuk investor Indonesia.</description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
