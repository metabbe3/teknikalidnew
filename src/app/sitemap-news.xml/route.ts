import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 900;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Google News sitemap: only articles from the last 48h (spec window)
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  let articles: { slug: string; title: string; publishedAt: Date }[] = [];
  try {
    articles = await prisma.article.findMany({
      where: {
        articleType: ArticleType.NEWS,
        status: ArticleStatus.PUBLISHED,
        publishedAt: { gt: since },
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, publishedAt: true },
    });
  } catch {
    // DB down: empty urlset, never 500
  }

  const urls = articles.map((a) => `  <url>
    <loc>${SITE_URL}/berita/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>TeknikalID</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt.toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}
