import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Akademi Trading — TeknikalID",
  description:
    "Belajar analisis teknikal saham BEI: panduan RSI, MACD, Bollinger Bands, dan strategi trading untuk investor Indonesia.",
  alternates: { canonical: "/akademi" },
};

export const dynamic = "force-dynamic";

const TAG_COLORS: Record<string, string> = {
  RSI: "#d97706",
  MACD: "#8b5cf6",
  "Bollinger Bands": "#ec4899",
  Stochastic: "#06b6d4",
  SMA: "#0d9488",
  EMA: "#14b8a6",
  Support: "#2563eb",
  Resistance: "#dc2626",
  "Pivot Point": "#6366f1",
  Trading: "#f59e0b",
  Saham: "#0d9488",
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? "#2563eb";
}

export default async function AkademiPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: activeTag } = await searchParams;

  const allArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED", articleType: "EDUCATIONAL" },
    orderBy: { publishedAt: "desc" },
    include: {
      author: { select: { name: true, username: true } },
    },
  });

  const allTags = [...new Set(allArticles.flatMap((a) => a.tags))].sort();
  const articles = activeTag
    ? allArticles.filter((a) => a.tags.includes(activeTag))
    : allArticles;
  const featuredArticle = articles[0];
  const gridArticles = articles.slice(1);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Dark terminal hero */}
      <section className="akademi-hero" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="relative z-[1] max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <BookOpen className="h-5 w-5 text-teal-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono uppercase tracking-[0.15em]">
              Akademi
            </h1>
          </div>
          <p className="text-gray-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            <span className="text-gray-400 font-mono text-xs mr-2">&gt;</span>
            Panduan dan edukasi analisis teknikal untuk investor Indonesia.
            Belajar membaca chart, indikator, dan strategi trading saham BEI.
            <span className="akademi-cursor" />
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Tag filter strip */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            <Link
              href="/akademi"
              className="akademi-filter-pill"
              data-active={!activeTag ? "true" : undefined}
            >
              Semua
            </Link>
            {allTags.map((tag) => (
              <Link
                key={tag}
                href={`/akademi?tag=${encodeURIComponent(tag)}`}
                className="akademi-filter-pill"
                data-active={activeTag === tag ? "true" : undefined}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">
              {activeTag
                ? `Belum ada artikel untuk tag "${activeTag}".`
                : "Belum ada artikel yang dipublikasikan."}
            </p>
            {activeTag && (
              <Link
                href="/akademi"
                className="inline-block mt-4 text-sm text-accent hover:underline"
              >
                Lihat semua artikel
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Featured article */}
            {featuredArticle && (
              <Link
                href={`/akademi/${featuredArticle.slug}`}
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
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                          Featured
                        </span>
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
                                : "bg-accent/30"
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

            {/* Article grid */}
            {gridArticles.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 stagger-grid">
                {gridArticles.map((article, i) => (
                  <Link
                    key={article.id}
                    href={`/akademi/${article.slug}`}
                    style={
                      { "--stagger-i": i, "--card-accent": getTagColor(article.tags[0] ?? "") } as React.CSSProperties
                    }
                  >
                    <div className="akademi-card depth-shadow h-full overflow-hidden">
                      {article.coverImageUrl && (
                        <div className="aspect-[2/1] overflow-hidden">
                          <img
                            src={article.coverImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-text-tertiary font-mono">
                          {formatDate(article.publishedAt)}
                        </span>
                        {article.tags.length > 0 && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: `${getTagColor(article.tags[0])}12`,
                              color: getTagColor(article.tags[0]),
                            }}
                          >
                            {article.tags[0]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-text-primary mb-2 leading-snug group-hover:text-accent transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-2 mt-auto">
                        {article.author.name && (
                          <div className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold flex items-center justify-center">
                            {article.author.name[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-text-tertiary">
                          {article.author.name ?? article.author.username}
                        </span>
                      </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
