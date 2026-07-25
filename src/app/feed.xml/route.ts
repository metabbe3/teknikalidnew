import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 300;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Fetch latest 50 published articles (news + analysis + daily snapshots)
  const articles = await prisma.article.findMany({
    where: {
      status: ArticleStatus.PUBLISHED,
      isListed: true,
      articleType: {
        in: [ArticleType.NEWS, ArticleType.STOCK_ANALYSIS, ArticleType.GENERAL, "DAILY_SNAPSHOT" as ArticleType],
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      updatedAt: true,
      tickerTag: true,
      tags: true,
      articleType: true,
      author: { select: { name: true } },
    },
  });

  const items = articles.map((a) => {
    const url = `${SITE_URL}/berita/${a.slug}`;
    const category = a.tickerTag
      ? `<category>${escapeXml(a.tickerTag.replace(".JK", ""))}</category>`
      : "";
    const tags = (a.tags as string[]).slice(0, 5).map((t) => `<category>${escapeXml(t)}</category>`).join("");

    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.excerpt ?? "")}</description>
      <pubDate>${a.publishedAt.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(a.author.name ?? "Tim TeknikalID")}</dc:creator>
      ${category}${tags}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>TeknikalID — Berita Saham &amp; Analisa Teknikal IDX</title>
    <link>${SITE_URL}/berita</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Analisa teknikal saham IDX terkini, sinyal trading, dan insight pasar untuk investor Indonesia. Update harian untuk 950+ saham.</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>30</ttl>
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>TeknikalID</title>
      <link>${SITE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
