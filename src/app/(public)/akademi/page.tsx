import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, MessageCircleQuestion } from "lucide-react";
import { SITE_URL } from "@/lib/constants";
import { PageHero } from "@/components/layout/page-hero";
import { FAQTabSection } from "@/components/faq/faq-tab-section";
import { QuestionStatus } from "@/generated/prisma/client";
import { AkademiGrid } from "./akademi-grid";

export const metadata: Metadata = {
  title: "Belajar Analisis Teknikal Saham — Panduan RSI, MACD & Strategi Trading",
  description:
    "Belajar analisis teknikal saham BEI dari dasar: panduan lengkap RSI, MACD, Bollinger Bands, support/resistance, dan strategi trading untuk pemula dan investor Indonesia.",
  alternates: { canonical: "/akademi" },
  keywords: [
    "belajar analisis teknikal saham", "belajar saham pemula", "belajar trading saham",
    "panduan RSI saham", "cara baca chart saham", "belajar MACD saham",
    "strategi trading saham", "tutorial analisa teknikal",
  ],
  openGraph: {
    title: "Belajar Analisis Teknikal Saham — Panduan Lengkap",
    description:
      "Belajar analisis teknikal saham BEI dari dasar: panduan RSI, MACD, Bollinger Bands, dan strategi trading.",
    url: `${SITE_URL}/akademi`,
    images: [
      { url: `${SITE_URL}/api/og?title=Belajar+Analisis+Teknikal+Saham&type=akademi`, width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Belajar Analisis Teknikal Saham — Panduan Lengkap",
    description:
      "Belajar analisis teknikal saham BEI: panduan RSI, MACD, Bollinger Bands, dan strategi trading.",
  },
};

// ISR (was force-dynamic): the unbounded per-request article query here OOM-crashed
// the container (2026-09-07 heap FATAL on this exact URL → GSC 5xx). Educational
// content is slow-moving; hourly revalidation removes the per-request DB load.
export const revalidate = 3600;

export default async function AkademiPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; tab?: string }>;
}) {
  const { tag: activeTag, tab } = await searchParams;
  const activeTab = tab === "faq" ? "faq" : "artikel";

  // Fetch initial FAQ data for the FAQ tab
  const initialFAQs =
    activeTab === "faq"
      ? await prisma.question.findMany({
          where: { status: QuestionStatus.ANSWERED },
          orderBy: { publishedAt: "desc" },
          take: 20,
          select: {
            id: true,
            question: true,
            shortAnswer: true,
            slug: true,
            category: true,
            helpfulVotes: true,
          },
        })
      : [];

  const allArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED", articleType: "EDUCATIONAL" },
    orderBy: { publishedAt: "desc" },
    take: 200, // hard ceiling — unbounded growth was the OOM trigger
    include: {
      author: { select: { name: true, username: true } },
    },
  });

  const allTags = [...new Set(allArticles.flatMap((a) => a.tags))].sort();
  const articles = activeTag
    ? allArticles.filter((a) => a.tags.includes(activeTag))
    : allArticles;

  // Serialize for client component
  const serialized = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    tags: a.tags,
    publishedAt: a.publishedAt.toISOString(),
    author: { name: a.author.name, username: a.author.username },
  }));

  const featured = serialized[0];
  const grid = serialized.slice(1);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Akademi Trading",
        url: `${SITE_URL}/akademi`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Akademi",
            item: `${SITE_URL}/akademi`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-bg-primary">
        <PageHero
          eyebrow="Edukasi"
          title="Akademi"
          description="Panduan dan edukasi analisis teknikal untuk investor Indonesia. Belajar membaca chart, indikator, dan strategi trading saham BEI."
        />

        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Tab navigation */}
          <div className="flex items-center gap-1 mb-8 border-b border-border">
            <Link
              href="/akademi"
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === "artikel"
                  ? "border-accent text-accent"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Artikel
            </Link>
            <Link
              href="/akademi?tab=faq"
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === "faq"
                  ? "border-accent text-accent"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <MessageCircleQuestion className="h-4 w-4" />
              Tanya Jawab
            </Link>
          </div>

          {activeTab === "faq" ? (
            <FAQTabSection
              initialFAQs={initialFAQs.map((q) => ({
                id: q.id,
                question: q.question,
                shortAnswer: q.shortAnswer,
                slug: q.slug,
                category: q.category,
                helpfulVotes: q.helpfulVotes,
              }))}
            />
          ) : (
            <>
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
                <AkademiGrid
                  featured={featured}
                  articles={grid}
                  activeTag={activeTag}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
