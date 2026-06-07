import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ArticleContent, extractHeadings, estimateReadingTime } from "@/components/article/article-renderer";
import { ArrowLeft, BookOpen, Clock, User, ChevronRight, ArrowRight } from "lucide-react";
import { ShareButtons } from "@/components/ui/share-buttons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { title: true, excerpt: true },
  });
  if (!article) return {};

  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}&type=akademi`;

  return {
    title: `${article.title} — Akademi TeknikalID`,
    description: article.excerpt,
    alternates: { canonical: `/akademi/${slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      url: `${SITE_URL}/akademi/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt ?? undefined,
    },
  };
}

export default async function ArticlePage({
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

  if (!article || article.status !== "PUBLISHED" || article.articleType !== "EDUCATIONAL") notFound();

  const headings = extractHeadings(article.content);
  const readingTime = estimateReadingTime(article.content);

  const [prevArticle, nextArticle] = await Promise.all([
    prisma.article.findFirst({
      where: { status: "PUBLISHED", articleType: "EDUCATIONAL", publishedAt: { lt: article.publishedAt } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.article.findFirst({
      where: { status: "PUBLISHED", articleType: "EDUCATIONAL", publishedAt: { gt: article.publishedAt } },
      orderBy: { publishedAt: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        image: `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}&type=akademi`,
        datePublished: article.publishedAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        author: {
          "@type": "Person",
          name: article.author.name ?? article.author.username,
        },
        publisher: {
          "@type": "Organization",
          name: "TeknikalID",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${SITE_URL}/akademi/${slug}`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Akademi", item: `${SITE_URL}/akademi` },
          { "@type": "ListItem", position: 3, name: article.title, item: `${SITE_URL}/akademi/${slug}` },
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
            <Link
              href="/akademi"
              className="hover:text-accent transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Akademi
            </Link>
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
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-5">
                  {article.title}
                </h1>

                {article.coverImageUrl && (
                  <div className="rounded-xl overflow-hidden mb-6">
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="w-full object-cover max-h-[400px]"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                      {(article.author.name ?? article.author.username)[0].toUpperCase()}
                    </div>
                    <span className="text-text-secondary font-medium">
                      {article.author.name ?? article.author.username}
                    </span>
                  </div>
                  <span className="font-mono text-xs">
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date(article.publishedAt))}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs">
                    <Clock className="h-3 w-3" />
                    {readingTime} menit baca
                  </span>
                </div>

                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {article.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs bg-accent-muted text-accent border-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </header>

              {/* Share bar */}
              <div className="flex items-center gap-3 py-3 mb-6 border-y border-border">
                <ShareButtons
                  url={`${SITE_URL}/akademi/${slug}`}
                  title={article.title}
                  text={article.excerpt ?? undefined}
                />
              </div>

              {/* Article body */}
              <ArticleContent content={article.content} />

              {/* Bottom CTA banner */}
              <div className="akademi-cta-banner mt-12 p-8">
                <div className="relative z-10 space-y-4">
                  <p className="text-lg font-semibold text-white">
                    Terapkan yang Anda pelajari
                  </p>
                  <p className="text-gray-400 text-sm max-w-lg">
                    Gunakan Screener TeknikalID untuk menemukan saham berdasarkan
                    indikator yang dibahas di artikel ini.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/screener"
                      className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors press-scale"
                    >
                      Buka Screener
                    </Link>
                    <Link
                      href="/stocks"
                      className="bg-white/10 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors press-scale"
                    >
                      Lihat Saham
                    </Link>
                  </div>
                </div>
              </div>

              {/* Prev / Next navigation */}
              {(prevArticle || nextArticle) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {prevArticle ? (
                    <Link
                      href={`/akademi/${prevArticle.slug}`}
                      className="group bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover transition-all"
                    >
                      <p className="text-xs text-text-tertiary font-medium mb-1">
                        Artikel Sebelumnya
                      </p>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {prevArticle.title}
                      </p>
                    </Link>
                  ) : (
                    <div />
                  )}
                  {nextArticle && (
                    <Link
                      href={`/akademi/${nextArticle.slug}`}
                      className="group bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover transition-all text-right"
                    >
                      <p className="text-xs text-text-tertiary font-medium mb-1">
                        Artikel Selanjutnya
                      </p>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {nextArticle.title}
                      </p>
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
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                      Daftar Isi
                    </p>
                    <nav className="space-y-0.5">
                      {headings.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className="toc-link"
                        >
                          {h.text}
                        </a>
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
