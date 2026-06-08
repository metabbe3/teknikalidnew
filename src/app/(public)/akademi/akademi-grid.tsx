"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
} from "lucide-react";

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

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  tags: string[];
  publishedAt: string;
  author: { name: string | null; username: string };
};

const PER_PAGE = 6;

export function AkademiGrid({
  featured,
  articles,
  activeTag,
}: {
  featured: Article;
  articles: Article[];
  activeTag?: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = articles.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <>
      {/* Featured */}
      <Link href={`/akademi/${featured.slug}`} className="block mb-8">
        <div className="akademi-featured depth-shadow-strong overflow-hidden hover:scale-[1.005] transition-transform duration-300">
          {featured.coverImageUrl && (
            <div className="aspect-[3/1] overflow-hidden">
              <img
                src={featured.coverImageUrl}
                alt={featured.title}
                className="w-full h-full object-cover"
                loading="lazy"
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
                  {formatDate(featured.publishedAt)}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-3 leading-snug">
                {featured.title}
              </h2>
              <p className="text-sm text-text-secondary line-clamp-3 mb-4">
                {featured.excerpt}
              </p>
              <div className="flex items-center gap-3">
                {featured.author.name && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center">
                      {featured.author.name[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {featured.author.name}
                    </span>
                  </div>
                )}
                {featured.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {featured.tags.slice(0, 3).map((tag) => (
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

      {/* Grid */}
      {paged.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 stagger-grid">
          {paged.map((article, i) => (
            <Link
              key={article.id}
              href={`/akademi/${article.slug}`}
              style={
                {
                  "--stagger-i": i,
                  "--card-accent": getTagColor(article.tags[0] ?? ""),
                } as React.CSSProperties
              }
            >
              <div className="akademi-card depth-shadow h-full overflow-hidden">
                {article.coverImageUrl && (
                  <div className="aspect-[2/1] overflow-hidden">
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1 mt-10 select-none">
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Halaman pertama"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 1}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers(safePage, totalPages).map((p, idx) =>
            p === "..." ? (
              <span
                key={`dots-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-xs text-text-tertiary"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  safePage === p
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setPage(safePage + 1)}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Halaman selanjutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Halaman terakhir"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </>
  );
}

/** Generate page number array with ellipsis */
function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
