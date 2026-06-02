import type { Metadata } from "next";
import Link from "next/link";
import { articleRepository } from "@/domains/article/article.repository";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";
import { ArticleFeed } from "@/components/article/article-feed";

export const metadata: Metadata = {
  title: "Berita & Analisis Saham — TeknikalID",
  description:
    "Analisis teknikal saham IDX terkini: insight harga, indikator, dan sinyal trading untuk investor Indonesia.",
  alternates: { canonical: "/berita" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "STOCK_ANALYSIS", label: "Analisis Saham" },
  { value: "NEWS", label: "Berita Pasar" },
  { value: "GENERAL", label: "Opini & Insight" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
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

export default async function BeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: activeType } = await searchParams;

  const rows = await articleRepository.findPublishedPaginated({
    limit: PAGE_SIZE + 1,
    articleType: activeType,
  });

  const hasMoreThanFirstPage = rows.length > PAGE_SIZE + 1;
  const pageRows = hasMoreThanFirstPage ? rows.slice(0, PAGE_SIZE + 1) : rows;

  const featuredArticle = pageRows[0];
  const gridArticles = pageRows.slice(1);
  const nextCursor = hasMoreThanFirstPage && gridArticles.length > 0
    ? gridArticles[gridArticles.length - 1].id
    : null;

  return (
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
            href="/berita"
            className="akademi-filter-pill"
            data-active={!activeType ? "true" : undefined}
          >
            Semua
          </Link>
          {TYPE_FILTERS.map((tf) => (
            <Link
              key={tf.value}
              href={`/berita?type=${tf.value}`}
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
                    alt=""
                    className="w-full h-full object-cover"
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
                {/* Decorative chart stripes visible on md+ */}
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

        {/* Article grid with Load More */}
        <ArticleFeed
          initialArticles={gridArticles.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
            articleType: a.articleType,
            tickerTag: a.tickerTag,
            tags: a.tags,
            publishedAt: a.publishedAt.toISOString(),
            coverImageUrl: a.coverImageUrl ?? null,
            author: a.author,
          }))}
          initialCursor={nextCursor}
          activeType={activeType}
        />
      </div>
    </div>
  );
}
