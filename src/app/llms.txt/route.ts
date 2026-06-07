import { prisma } from "@/lib/prisma";
import { IDX40, SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const [questions, articles] = await Promise.all([
    prisma.question.findMany({
      where: { status: "ANSWERED" },
      select: {
        question: true,
        shortAnswer: true,
        slug: true,
        category: true,
      },
      orderBy: { helpfulVotes: "desc" },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        articleType: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
  ]);

  const lines: string[] = [];

  // Header
  lines.push("# TeknikalID");
  lines.push("#> Platform analisis teknikal saham Indonesia (IDX)");
  lines.push(`#> ${SITE_URL}`);
  lines.push("");
  lines.push(
    "TeknikalID adalah platform analisis teknikal untuk Bursa Efek Indonesia (IDX). " +
      "Menyediakan chart profesional, indikator teknikal (RSI, MACD, Bollinger Bands, SMA, EMA, Stochastic, ADX), " +
      "screener saham, berita pasar, edukasi trading, dan komunitas diskusi.",
  );
  lines.push("");

  // FAQ Section
  lines.push("## FAQ — Tanya Jawab Saham & Analisis Teknikal");
  lines.push("");
  for (const q of questions) {
    lines.push(`### Q: ${q.question}`);
    lines.push(`A: ${q.shortAnswer}`);
    lines.push(`URL: ${SITE_URL}/akademi/tanya/${q.slug}`);
    lines.push(`Kategori: ${q.category}`);
    lines.push("");
  }

  // Articles Section
  lines.push("## Artikel & Berita");
  lines.push("");
  for (const a of articles) {
    lines.push(`### ${a.title}`);
    if (a.excerpt) {
      lines.push(a.excerpt);
    }
    lines.push(`URL: ${SITE_URL}/berita/${a.slug}`);
    lines.push(`Tipe: ${a.articleType}`);
    lines.push("");
  }

  // Stock list
  lines.push("## Saham IDX40");
  lines.push("");
  lines.push("Daftar saham yang dicakup oleh TeknikalID:");
  lines.push("");
  for (const stock of IDX40) {
    lines.push(
      `- ${stock.ticker}: ${stock.name} (${stock.sector}) — ${SITE_URL}/stocks/${stock.ticker}`,
    );
  }
  lines.push("");

  // Optional paths
  lines.push("## Halaman Penting");
  lines.push("");
  lines.push(`- Homepage: ${SITE_URL}`);
  lines.push(`- Screener Saham: ${SITE_URL}/screener`);
  lines.push(`- Akademi / Edukasi: ${SITE_URL}/akademi`);
  lines.push(`- Tanya Jawab FAQ: ${SITE_URL}/akademi?tab=faq`);
  lines.push(`- Komunitas: ${SITE_URL}/community`);
  lines.push(`- Watchlist: ${SITE_URL}/watchlist`);
  lines.push(`- Berita: ${SITE_URL}/berita`);
  lines.push("");

  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
