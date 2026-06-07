import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ArticleContent, extractHeadings, estimateReadingTime, extractTickers } from "@/components/article/article-renderer";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { ShareButtons } from "@/components/ui/share-buttons";
import { ArticleType } from "@/generated/prisma/client";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockArticleCard } from "@/components/stock/stock-article-card";

const BERITA_TYPES: ArticleType[] = [ArticleType.STOCK_ANALYSIS, ArticleType.NEWS, ArticleType.GENERAL, ArticleType.DAILY_SNAPSHOT];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, articleType: true, tickerTag: true, publishedAt: true, updatedAt: true },
  });
  if (!article || !BERITA_TYPES.includes(article.articleType)) return {};

  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}&type=berita${article.tickerTag ? `&ticker=${article.tickerTag.replace(".JK", "")}` : ""}`;

  return {
    title: `${article.title} — Berita TeknikalID`,
    description: article.excerpt,
    alternates: { canonical: `/berita/${slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      url: `${SITE_URL}/berita/${slug}`,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt ?? undefined,
    },
  };
}

export default async function BeritaArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, username: true, image: true } },
    },
  });

  if (!article || article.status !== "PUBLISHED" || !BERITA_TYPES.includes(article.articleType)) notFound();

  const headings = extractHeadings(article.content);
  const readingTime = estimateReadingTime(article.content);
  const mentionedTickers = extractTickers(article.content);

  // Fetch related articles by ticker or overlapping tags
  const relatedWhere = article.tickerTag
    ? { status: "PUBLISHED" as const, articleType: { in: BERITA_TYPES }, id: { not: article.id }, tickerTag: article.tickerTag }
    : { status: "PUBLISHED" as const, articleType: { in: BERITA_TYPES }, id: { not: article.id }, tags: { hasSome: article.tags } };

  const [prevArticle, nextArticle, stockCards, relatedArticles] = await Promise.all([
    prisma.article.findFirst({
      where: { status: "PUBLISHED", articleType: { in: BERITA_TYPES }, publishedAt: { lt: article.publishedAt } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.article.findFirst({
      where: { status: "PUBLISHED", articleType: { in: ["STOCK_ANALYSIS", "NEWS", "GENERAL"] }, publishedAt: { gt: article.publishedAt } },
      orderBy: { publishedAt: "asc" },
      select: { slug: true, title: true },
    }),
    mentionedTickers.length > 0
      ? stockMarketService.getStockBatchWithIndicators(mentionedTickers)
      : Promise.resolve([]),
    prisma.article.findMany({
      where: relatedWhere,
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, slug: true, title: true, publishedAt: true, articleType: true, tickerTag: true },
    }),
  ]);

  const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}&type=berita${article.tickerTag ? `&ticker=${article.tickerTag.replace(".JK", "")}` : ""}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        datePublished: article.publishedAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        image: ogImageUrl,
        author: {
          "@type": "Person",
          name: "Tim Analis TeknikalID",
          jobTitle: "Analis Pasar Saham",
          url: `${SITE_URL}/berita`,
        },
        publisher: {
          "@type": "Organization",
          name: "TeknikalID",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${SITE_URL}/berita/${slug}`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Berita", item: `${SITE_URL}/berita` },
          ...(article.tickerTag
            ? [{ "@type": "ListItem" as const, position: 2, name: article.tickerTag.replace(".JK", ""), item: `${SITE_URL}/stocks/${article.tickerTag}` }]
            : []),
          { "@type": "ListItem", position: article.tickerTag ? 3 : 2, name: article.title, item: `${SITE_URL}/berita/${slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-mono text-text-tertiary mb-8">
            <Link href="/berita" className="hover:text-accent transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Berita
            </Link>
            {article.tickerTag && (
              <>
                <ChevronRight className="h-3 w-3 opacity-40" />
                <span className="text-accent">{article.tickerTag.replace(".JK", "")}</span>
              </>
            )}
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="text-text-secondary truncate max-w-[200px] sm:max-w-none">
              {article.title}
            </span>
          </nav>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-10">
            {/* Main content */}
            <div>
              {/* Article header */}
              <header className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  {article.tickerTag && (
                    <Link
                      href={`/stocks/${article.tickerTag}`}
                      className="text-xs font-mono font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded hover:bg-blue-500/20 transition-colors"
                    >
                      {article.tickerTag.replace(".JK", "")}
                    </Link>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-5">
                  {article.title}
                </h1>

                {article.coverImageUrl && (
                  <div className="rounded-xl overflow-hidden mb-6">
                    <img src={article.coverImageUrl} alt={article.title} className="w-full object-cover max-h-[400px]" loading="lazy" />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                      T
                    </div>
                    <span className="text-text-secondary font-medium">Tim Analis TeknikalID</span>
                  </div>
                  <span className="font-mono text-xs">
                    {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(article.publishedAt))}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs">
                    <Clock className="h-3 w-3" />
                    {readingTime} menit baca
                  </span>
                </div>

                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-accent-muted text-accent border-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </header>

              {/* Share bar */}
              <div className="flex items-center gap-3 py-3 mb-6 border-y border-border">
                <ShareButtons
                  url={`${SITE_URL}/berita/${slug}`}
                  title={article.title}
                  text={article.excerpt ?? undefined}
                />
              </div>

              {/* Article body */}
              <ArticleContent content={article.content} />

              {/* Stock cards for mentioned tickers */}
              {stockCards.length > 0 && (
                <div className="mt-8 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Saham Terkait</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stockCards.map((stock) => (
                      <StockArticleCard key={stock.ticker} {...stock} />
                    ))}
                  </div>
                </div>
              )}

              {/* Related articles */}
              {relatedArticles.length > 0 && (
                <div className="mt-8 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Artikel Terkait</p>
                  <div className="space-y-2">
                    {relatedArticles.map((ra) => (
                      <Link key={ra.id} href={`/berita/${ra.slug}`} className="group block bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                              {ra.title}
                            </p>
                            <p className="text-xs text-text-tertiary mt-1 font-mono">
                              {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ra.publishedAt))}
                            </p>
                          </div>
                          {ra.tickerTag && (
                            <span className="text-xs font-mono font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded shrink-0">
                              {ra.tickerTag.replace(".JK", "")}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Source attribution */}
              {article.generationMeta && typeof article.generationMeta === "object" && "sourceUrl" in article.generationMeta && (
                <div className="mt-8 p-4 bg-bg-card rounded-xl depth-shadow border-l-4 border-accent/30">
                  <p className="text-xs text-text-tertiary font-medium mb-1">Referensi</p>
                  <a href={String(article.generationMeta.sourceUrl)} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                    {String(article.generationMeta.sourceName ?? "Baca selengkapnya")}
                  </a>
                </div>
              )}

              {/* Bottom CTA banner */}
              <div className="akademi-cta-banner mt-12 p-8">
                <div className="relative z-10 space-y-4">
                  <p className="text-lg font-semibold text-white">Cek Chart & Sinyal Teknikal</p>
                  <p className="text-gray-400 text-sm max-w-lg">
                    Pantau pergerakan harga real-time, RSI, MACD, dan sinyal trading langsung dari halaman saham TeknikalID.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {article.tickerTag && (
                      <Link href={`/stocks/${article.tickerTag}`} className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors press-scale">
                        Lihat {article.tickerTag.replace(".JK", "")}
                      </Link>
                    )}
                    <Link href="/screener" className="bg-white/10 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors press-scale">
                      Buka Screener
                    </Link>
                  </div>
                </div>
              </div>

              {/* Prev / Next navigation */}
              {(prevArticle || nextArticle) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {prevArticle ? (
                    <Link href={`/berita/${prevArticle.slug}`} className="group bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover transition-all">
                      <p className="text-xs text-text-tertiary font-medium mb-1">Analisa Sebelumnya</p>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">{prevArticle.title}</p>
                    </Link>
                  ) : (
                    <div />
                  )}
                  {nextArticle && (
                    <Link href={`/berita/${nextArticle.slug}`} className="group bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover transition-all text-right">
                      <p className="text-xs text-text-tertiary font-medium mb-1">Analisa Selanjutnya</p>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">{nextArticle.title}</p>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* TOC sidebar */}
            {headings.length > 0 && (
              <aside className="hidden lg:block">
                <div className="toc-sidebar">
                  <div className="bg-bg-card rounded-xl depth-shadow p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">Daftar Isi</p>
                    <nav className="space-y-0.5">
                      {headings.map((h) => (
                        <a key={h.id} href={`#${h.id}`} className="toc-link">{h.text}</a>
                      ))}
                    </nav>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
