import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";
import { SITE_URL } from "@/lib/constants";
import { BeritaGrid } from "./berita-grid";

export const revalidate = 300;

const PAGE_SIZE = 12;

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "DAILY_SNAPSHOT", label: "Saham Hari Ini" },
  { value: "STOCK_ANALYSIS", label: "Analisis Saham" },
  { value: "NEWS", label: "Berita Pasar" },
  { value: "GENERAL", label: "Opini & Insight" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DAILY_SNAPSHOT: { label: "Saham Hari Ini", color: "text-emerald-500 bg-emerald-500/10" },
  STOCK_ANALYSIS: { label: "Analisis Saham", color: "text-blue-500 bg-blue-500/10" },
  NEWS: { label: "Berita Pasar", color: "text-amber-500 bg-amber-500/10" },
  GENERAL: { label: "Opini & Insight", color: "text-purple-500 bg-purple-500/10" },
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

type SearchParams = Promise<{ type?: string; page?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { type: activeType, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const typeSuffix = activeType ? `?type=${activeType}` : "";
  const canonicalPath = currentPage > 1 ? `/berita?page=${currentPage}${activeType ? `&type=${activeType}` : ""}` : `/berita${typeSuffix}`;

  const links: Record<string, string> = {};
  if (currentPage > 1) {
    links.prev = `${SITE_URL}/berita${currentPage === 2 ? typeSuffix : `?page=${currentPage - 1}${activeType ? `&type=${activeType}` : ""}`}`;
  }

  const articleWhere: Record<string, unknown> = {
    status: ArticleStatus.PUBLISHED,
    isListed: true,
    articleType: activeType
      ? (activeType as ArticleType)
      : { in: ["DAILY_SNAPSHOT", "STOCK_ANALYSIS", "NEWS", "GENERAL"] as ArticleType[] },
  };
  const totalCount = await prisma.article.count({ where: articleWhere as never });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (currentPage < totalPages) {
    links.next = `${SITE_URL}/berita?page=${currentPage + 1}${activeType ? `&type=${activeType}` : ""}`;
  }

  return {
    title: currentPage > 1 ? `Berita Saham & Rekomendasi Hari Ini — Halaman ${currentPage}` : "Berita Saham & Rekomendasi Hari Ini — Analisa Teknikal IDX",
    description: "Berita saham IDX terkini, analisis teknikal, rekomendasi saham hari ini, dan insight pasar untuk investor Indonesia. Update harian.",
    alternates: { canonical: canonicalPath },
    keywords: [
      "berita saham hari ini", "rekomendasi saham hari ini", "analisis saham",
      "berita saham idx", "insight pasar saham", "analisa teknikal saham hari ini",
    ],
    openGraph: {
      title: "Berita Saham & Rekomendasi Hari Ini — Analisa Teknikal IDX",
      description: "Berita saham IDX terkini, analisis teknikal, rekomendasi saham hari ini, dan insight pasar untuk investor Indonesia.",
      url: `${SITE_URL}/berita`,
      images: [{ url: `${SITE_URL}/api/og?title=Berita+Saham+Rekomendasi+Hari+Ini&type=berita`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Berita Saham & Rekomendasi Hari Ini — Analisa Teknikal IDX",
      description: "Berita saham IDX terkini, analisis teknikal, rekomendasi saham hari ini, dan insight pasar.",
    },
    ...(Object.keys(links).length > 0 ? { other: links } : {}),
  };
}

export default async function BeritaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type: activeType, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const articleWhere: Record<string, unknown> = {
    status: ArticleStatus.PUBLISHED,
    isListed: true,
    articleType: activeType
      ? (activeType as ArticleType)
      : { in: ["DAILY_SNAPSHOT", "STOCK_ANALYSIS", "NEWS", "GENERAL"] as ArticleType[] },
  };

  const [totalCount, rows] = await Promise.all([
    prisma.article.count({ where: articleWhere as never }),
    prisma.article.findMany({
      where: articleWhere as never,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true, username: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const featuredArticle = rows[0];
  const gridArticles = rows.slice(1);

  // Serialize grid articles for client component
  const serializedGrid = gridArticles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    articleType: a.articleType,
    tickerTag: a.tickerTag,
    tags: a.tags,
    publishedAt: a.publishedAt.toISOString(),
    coverImageUrl: a.coverImageUrl ?? null,
    author: { name: a.author.name, username: a.author.username },
  }));

  // Pagination URLs for SEO link tags
  const typeSuffix = activeType ? `&type=${activeType}` : "";
  const prevHref = currentPage > 1
    ? currentPage === 2
      ? `/berita${activeType ? `?type=${activeType}` : ""}`
      : `/berita?page=${currentPage - 1}${typeSuffix}`
    : null;
  const nextHref = currentPage < totalPages
    ? `/berita?page=${currentPage + 1}${typeSuffix}`
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Berita & Analisis Saham",
        url: `${SITE_URL}/berita`,
        ...(totalPages > 1 ? { potentialAction: {
          "@type": "ReadAction",
          target: Array.from({ length: totalPages }, (_, i) => `${SITE_URL}/berita?page=${i + 1}`),
        } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Berita", item: `${SITE_URL}/berita` },
        ],
      },
    ],
  };

  return (
    <>
      {prevHref && <link rel="prev" href={prevHref} />}
      {nextHref && <link rel="next" href={nextHref} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-bg-primary">
        {/* Dark terminal hero */}
        <section className="akademi-hero" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
          <div className="relative z-[1] max-w-6xl mx-auto px-4 py-16 sm:py-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Newspaper className="h-5 w-5 text-blue-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono uppercase tracking-[0.15em]">
                Berita
              </h1>
            </div>
            <p className="text-gray-300 max-w-2xl text-sm sm:text-base leading-relaxed">
              <span className="text-gray-400 font-mono text-xs mr-2">&gt;</span>
              Analisis teknikal saham IDX terkini. Data indikator real-time, sinyal trading, dan insight pasar untuk investor Indonesia.
              <span className="akademi-cursor" />
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Type filter strip */}
          <div className="flex items-center gap-2 mb-8">
            <Link
              href={currentPage > 1 ? `/berita?page=${currentPage}` : "/berita"}
              className="akademi-filter-pill"
              data-active={!activeType ? "true" : undefined}
            >
              Semua
            </Link>
            {TYPE_FILTERS.map((tf) => (
              <Link
                key={tf.value}
                href={`/berita?type=${tf.value}${currentPage > 1 ? `&page=${currentPage}` : ""}`}
                className="akademi-filter-pill"
                data-active={activeType === tf.value ? "true" : undefined}
              >
                {tf.label}
              </Link>
            ))}
          </div>

          {/* Featured article */}
          {featuredArticle && (
            <Link
              href={`/berita/${featuredArticle.slug}`}
              className="block mb-8"
            >
              <div className="akademi-featured depth-shadow-strong overflow-hidden hover:scale-[1.005] transition-transform duration-300">
                {featuredArticle.coverImageUrl && (
                  <div className="aspect-[3/1] overflow-hidden">
                    <img
                      src={featuredArticle.coverImageUrl}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 p-6 sm:p-8">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${TYPE_LABELS[featuredArticle.articleType]?.color ?? "text-blue-500 bg-blue-500/10"}`}>
                        {TYPE_LABELS[featuredArticle.articleType]?.label ?? "Artikel"}
                      </span>
                      {featuredArticle.tickerTag && (
                        <span className="text-[10px] font-mono font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                          {featuredArticle.tickerTag.replace(".JK", "")}
                        </span>
                      )}
                      <span className="text-xs text-text-tertiary font-mono">
                        {formatDate(featuredArticle.publishedAt)}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-3 leading-snug">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-sm text-text-secondary line-clamp-3 mb-4">
                      {featuredArticle.excerpt}
                    </p>
                    <div className="flex items-center gap-3">
                      {featuredArticle.author.name && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center">
                            {featuredArticle.author.name[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-text-secondary">
                            {featuredArticle.author.name}
                          </span>
                        </div>
                      )}
                      {featuredArticle.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {featuredArticle.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] bg-gray-100 text-text-secondary border-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Decorative chart stripes */}
                  <div className="hidden md:flex items-end gap-[3px] h-24 opacity-30">
                    {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 55, 85, 50, 70, 60].map(
                      (h, i) => (
                        <div
                          key={i}
                          className={`w-[3px] rounded-full ${
                            i % 3 === 0
                              ? "bg-bearish/40"
                              : i % 3 === 1
                              ? "bg-bullish/40"
                              : "bg-blue-400/30"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Grid with pagination — replaces infinite scroll */}
          <BeritaGrid
            articles={serializedGrid}
            currentPage={currentPage}
            totalPages={totalPages}
            activeType={activeType}
          />
        </div>
      </div>
    </>
  );
}
