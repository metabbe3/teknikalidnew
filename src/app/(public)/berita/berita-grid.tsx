"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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

export type BeritaArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  articleType: string;
  tickerTag: string | null;
  tags: string[];
  publishedAt: string;
  coverImageUrl: string | null;
  author: { name: string | null; username: string };
};

export function BeritaGrid({
  articles,
  currentPage,
  totalPages,
  activeType,
}: {
  articles: BeritaArticle[];
  currentPage: number;
  totalPages: number;
  activeType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safePage = Math.min(currentPage, totalPages);

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    if (activeType) params.set("type", activeType);
    else params.delete("type");
    if (page === 1) params.delete("page");
    router.push(`/berita${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <>
      {articles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400">
            {activeType
              ? `Belum ada analisis untuk filter ini.`
              : "Belum ada analisis saham yang dipublikasikan."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 stagger-grid">
          {articles.map((article, i) => (
            <Link
              key={article.id}
              href={`/berita/${article.slug}`}
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
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                          TYPE_LABELS[article.articleType]?.color ??
                          "text-blue-500 bg-blue-500/10"
                        }`}
                      >
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1 mt-10 select-none">
          <button
            onClick={() => goTo(1)}
            disabled={safePage === 1}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Halaman pertama"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goTo(safePage - 1)}
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
                onClick={() => goTo(p as number)}
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
            onClick={() => goTo(safePage + 1)}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Halaman selanjutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => goTo(totalPages)}
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
