import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { ArticleType, ArticleStatus } from "@/generated/prisma/client";
import { ArticleContent, extractHeadings, estimateReadingTime } from "@/components/article/article-renderer";
import { ArrowLeft, Clock, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { ShareButtons } from "@/components/ui/share-buttons";
import { StockArticleCard } from "@/components/stock/stock-article-card";

export const revalidate = 3600; // 1 hour ISR
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  // No DB at build time — pages are generated on-demand at runtime
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const tickerUpper = ticker.toUpperCase();
  const tickerJK = tickerUpper.endsWith(".JK") ? tickerUpper : `${tickerUpper}.JK`;

  // Find the movement analysis article for this ticker
  const article = await prisma.article.findFirst({
    where: {
      articleType: ArticleType.MOVEMENT_ANALYSIS,
      status: ArticleStatus.PUBLISHED,
      OR: [
        { tickerTag: tickerJK },
        { tickerTag: tickerUpper },
        { slug: { startsWith: `kenapa-saham-${tickerUpper.toLowerCase()}` } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { title: true, excerpt: true, tickerTag: true, publishedAt: true, updatedAt: true, slug: true },
  });

  if (!article) return {};

  const t = tickerUpper;
  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}&type=movement&ticker=${t}`;

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/saham/${ticker}/kenapa-naik-hari-ini` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url: `${SITE_URL}/saham/${ticker}/kenapa-naik-hari-ini`,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
    keywords: [
      `kenapa saham ${t} naik`,
      `kenapa saham ${t} turun`,
      `harga saham ${t} hari ini`,
      `analisa saham ${t}`,
      `saham ${t}`,
      `pergerakan harga ${t}`,
    ],
  };
}

export default async function MovementAnalysisPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const tickerUpper = ticker.toUpperCase();
  const tickerJK = tickerUpper.endsWith(".JK") ? tickerUpper : `${tickerUpper}.JK`;

  // Find the movement analysis article
  const article = await prisma.article.findFirst({
    where: {
      articleType: ArticleType.MOVEMENT_ANALYSIS,
      status: ArticleStatus.PUBLISHED,
      OR: [
        { tickerTag: tickerJK },
        { tickerTag: tickerUpper },
        { slug: { startsWith: `kenapa-saham-${tickerUpper.toLowerCase()}` } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      author: { select: { name: true, username: true, image: true } },
    },
  });

  if (!article) notFound();

  const headings = extractHeadings(article.content);
  const readingTime = estimateReadingTime(article.content);
  const isNaik = article.slug.includes("-naik-");

  // Fetch related articles
  const [stockCards, relatedArticles] = await Promise.all([
    prisma.article.findFirst({
      where: {
        articleType: ArticleType.DAILY_SNAPSHOT,
        status: ArticleStatus.PUBLISHED,
        tickerTag: tickerJK,
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, tickerTag: true },
    }),
    prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        articleType: { in: [ArticleType.MOVEMENT_ANALYSIS, ArticleType.NEWS] },
        id: { not: article.id },
        OR: [{ tickerTag: tickerJK }, { tags: { hasSome: article.tags } }],
      },
      take: 4,
      orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true, tickerTag: true },
    }),
  ]);

  const tickerClean = tickerUpper.replace(".JK", "");

  return (
    <article className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href={`/stocks/${tickerJK}`} className="hover:text-foreground">Saham {tickerClean}</Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-semibold">
            Kenapa {isNaik ? "Naik" : "Turun"} Hari Ini?
          </li>
        </ol>
      </nav>

      {/* Article Header */}
      <header className="mx-auto max-w-4xl px-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
            isNaik ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"
          }`}>
            {isNaik ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isNaik ? "Naik" : "Turun"}
          </span>
          <span className="text-sm text-muted-foreground">
            Update: {article.updatedAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
          {article.title}
        </h1>

        <p className="text-lg text-muted-foreground mb-4">{article.excerpt}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {readingTime} menit baca
          </span>
          <ShareButtons
            title={article.title}
            url={`${SITE_URL}/saham/${ticker}/kenapa-naik-hari-ini`}
          />
        </div>
      </header>

      {/* Article Content */}
      <div className="mx-auto max-w-4xl px-4">
        <ArticleContent content={article.content} />
      </div>

      {/* CTA: Link to stock page */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h3 className="text-xl font-bold mb-2">
            Pantau {tickerClean} Real-time
          </h3>
          <p className="text-muted-foreground mb-4">
            Lihat harga, chart, indikator teknikal, dan sinyal {tickerClean} secara lengkap di halaman saham.
          </p>
          <Link
            href={`/stocks/${tickerJK}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            Lihat Chart {tickerClean} →
          </Link>
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-12">
          <h2 className="text-2xl font-bold mb-4">Artikel Terkait</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/berita/${rel.slug}`}
                className="group rounded-lg border border-border p-4 hover:border-primary/50 transition"
              >
                <h3 className="font-semibold group-hover:text-primary transition mb-1">
                  {rel.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{rel.excerpt}</p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  {rel.publishedAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <Link
          href={`/stocks/${tickerJK}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Saham {tickerClean}
        </Link>
      </div>
    </article>
  );
}
