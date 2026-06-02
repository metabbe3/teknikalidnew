"use client";

import Link from "next/link";
import { useArticles, type ArticleItem } from "@/hooks/use-articles";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  STOCK_ANALYSIS: { label: "Analisis Saham", color: "text-blue-500 bg-blue-500/10" },
  NEWS: { label: "Berita Pasar", color: "text-amber-500 bg-amber-500/10" },
  GENERAL: { label: "Opini & Insight", color: "text-purple-500 bg-purple-500/10" },
};

const TAG_COLORS: Record<string, string> = {
  RSI: "#d97706",
  MACD: "#8b5cf6",
  "Bollinger Bands": "#ec4899",
  Stochastic: "#06b6d4",
  SMA: "#0d9486",
  EMA: "#14b8a6",
  Support: "#2563eb",
  Resistance: "#dc2626",
  "Pivot Point": "#6366f1",
  Trading: "#f59e0b",
  Saham: "#0d9486",
  Bullish: "#16a34a",
  Bearish: "#dc2626",
  Sideways: "#8b5cf6",
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? "#2563eb";
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

interface ArticleFeedProps {
  initialArticles: ArticleItem[];
  initialCursor: string | null;
  activeTag?: string;
  activeType?: string;
}

export function ArticleFeed({ initialArticles, initialCursor, activeTag, activeType }: ArticleFeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useArticles(
    activeTag,
    activeType,
    { articles: initialArticles, nextCursor: initialCursor }
  );

  const allArticles = data
    ? data.pages.flatMap((p) => p.data)
    : initialArticles;

  if (allArticles.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">
          {activeTag
            ? `Belum ada analisis untuk tag "${activeTag}".`
            : "Belum ada analisis saham yang dipublikasikan."}
        </p>
        {activeTag && (
          <Link
            href="/berita"
            className="inline-block mt-4 text-sm text-accent hover:underline"
          >
            Lihat semua analisis
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 stagger-grid">
        {allArticles.map((article, i) => (
          <Link
            key={article.id}
            href={`/berita/${article.slug}`}
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
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${TYPE_LABELS[article.articleType]?.color ?? "text-blue-500 bg-blue-500/10"}`}>
                      {TYPE_LABELS[article.articleType]?.label ?? "Artikel"}
                    </span>
                    <span className="text-[11px] text-text-tertiary font-mono">
                      {formatDate(article.publishedAt)}
                    </span>
                    {article.tickerTag && (
                      <span className="text-[10px] font-mono font-semibold text-accent">
                        {article.tickerTag.replace(".JK", "")}
                      </span>
                    )}
                  </div>
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

      {hasNextPage && (
        <div className="text-center pt-6">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-bg-card depth-shadow rounded-full px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:depth-shadow-hover transition-all press-scale disabled:opacity-50"
          >
            {isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </>
  );
}
