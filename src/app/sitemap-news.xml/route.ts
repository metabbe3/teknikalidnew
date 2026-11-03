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

/**
 * SEO-T5 (audit 3 Nov): sebagian artikel lama tersimpan dengan timestamp WIB
 * yang salah label UTC (future-dated ~7 jam). Google News mengabaikan artikel
 * future-dated, jadi saat emit: kalau pubDate di masa depan, asumsikan salah
 * label WIB dan geser mundur 7 jam; kalau masih future juga (data aneh),
 * clamp ke "sekarang" supaya sitemap selalu valid.
 */
function clampFutureDate(d: Date): Date {
  const now = Date.now();
  if (d.getTime() <= now) return d;
  const shifted = new Date(d.getTime() - 7 * 60 * 60 * 1000);
  return shifted.getTime() <= now ? shifted : new Date(now);
}

export async function GET() {
  // Google News / Fresh news sitemap: semua artikel terbit 30 hari terakhir
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let articles: { slug: string; title: string; publishedAt: Date }[] = [];
  try {
    articles = await prisma.article.findMany({
      where: {
        articleType: {
          in: [
            ArticleType.NEWS,
            ArticleType.STOCK_ANALYSIS,
            ArticleType.MOVEMENT_ANALYSIS,
            ArticleType.DAILY_SNAPSHOT,
            ArticleType.GENERAL,
          ],
        },
        status: ArticleStatus.PUBLISHED,
        publishedAt: { gt: since },
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, publishedAt: true },
    });
  } catch {
    // DB down: empty urlset, never 500
  }

  // SEO-01 (audit 3 Nov): news sitemap WAJIB berisi URL final 200 saja — Google
  // menurunkan kepercayaan crawl pada sitemap yang mengiklankan redirect.
  // proxy.ts 308-kan pola berikut ke /stocks atau /akademi; jangan pernah di-emit:
  //  - saham-<ticker> / saham-<ticker>-<tanggal>  (DAILY_SNAPSHOT legacy)
  //  - kenapa-saham-<ticker>-naik/turun-hari-ini  (MOVEMENT_ANALYSIS legacy)
  //  - analisa-teknikal-<ticker>                  (STOCK_ANALYSIS legacy)
  //  - slug EDUCATIONAL                           (canonical di /akademi)
  const REDIRECTED_SLUG = /^(saham-[a-z0-9]+(-\d+-[a-z]+-\d{4})?|kenapa-saham-[a-z0-9]+-(naik|turun)-hari-ini|analisa-teknikal-.+)$/;
  const finalUrls = articles.filter((a) => !REDIRECTED_SLUG.test(a.slug));

  const urls = finalUrls.map((a) => `  <url>
    <loc>${SITE_URL}/berita/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>TeknikalID</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${clampFutureDate(a.publishedAt).toISOString()}</news:publication_date>
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
