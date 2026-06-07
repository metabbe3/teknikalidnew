import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { faqService } from "@/domains/faq/faq.service";
import { SITE_URL } from "@/lib/constants";
import { ChevronRight, ArrowLeft, MessageCircleQuestion, Sparkles, Users } from "lucide-react";
import { VoteButtons } from "@/components/faq/vote-buttons";

const CATEGORY_COLORS: Record<string, string> = {
  saham: "#0d9488",
  indikator: "#8b5cf6",
  strategi: "#f59e0b",
  fundamental: "#2563eb",
  trading: "#ec4899",
  umum: "#6b7280",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#6b7280";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let question;
  try {
    question = await faqService.getQuestionBySlug(slug);
  } catch {
    return {};
  }

  if (!question) return {};

  const description = question.metaDescription || question.shortAnswer.slice(0, 160);
  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(question.question)}&type=faq`;

  return {
    title: `${question.question} — Tanya Jawab TeknikalID`,
    description,
    alternates: { canonical: `/akademi/tanya/${slug}` },
    openGraph: {
      title: question.question,
      description,
      url: `${SITE_URL}/akademi/tanya/${slug}`,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: question.question }],
    },
    twitter: {
      card: "summary_large_image",
      title: question.question,
      description,
    },
  };
}

export default async function FAQQuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let question;
  try {
    question = await faqService.getQuestionBySlug(slug);
  } catch {
    notFound();
  }

  if (!question) notFound();

  const categoryColor = getCategoryColor(question.category);
  const truncatedTitle =
    question.question.length > 50
      ? question.question.slice(0, 50) + "..."
      : question.question;

  // FAQPage JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: question.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: question.shortAnswer,
        },
      },
    ],
  };

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Akademi", item: `${SITE_URL}/akademi` },
      { "@type": "ListItem", position: 3, name: "Tanya Jawab", item: `${SITE_URL}/akademi?tab=faq` },
      {
        "@type": "ListItem",
        position: 4,
        name: question.question,
        item: `${SITE_URL}/akademi/tanya/${slug}`,
      },
    ],
  };

  const isAIGenerated = question.source === "AI_GENERATED";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-mono text-text-tertiary mb-8 flex-wrap">
            <Link
              href="/"
              className="hover:text-accent transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
            <Link
              href="/akademi"
              className="hover:text-accent transition-colors"
            >
              Akademi
            </Link>
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
            <Link
              href="/akademi?tab=faq"
              className="hover:text-accent transition-colors"
            >
              Tanya Jawab
            </Link>
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
            <span className="text-text-secondary truncate max-w-[200px] sm:max-w-[300px]">
              {truncatedTitle}
            </span>
          </nav>

          {/* Back link */}
          <Link
            href="/akademi?tab=faq"
            className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Tanya Jawab
          </Link>

          {/* Question header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <MessageCircleQuestion className="h-4 w-4 text-accent" />
              </div>
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: `${categoryColor}15`,
                  color: categoryColor,
                }}
              >
                {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary leading-snug">
              {question.question}
            </h1>
          </header>

          {/* Short answer */}
          <div className="bg-bg-card rounded-xl depth-shadow p-6 sm:p-8 mb-6">
            <p className="text-base text-text-primary leading-relaxed">
              {question.shortAnswer}
            </p>
          </div>

          {/* Long answer (for MINI_ARTICLE format) */}
          {question.format === "MINI_ARTICLE" && question.longAnswer && (
            <div className="bg-bg-card rounded-xl depth-shadow p-6 sm:p-8 mb-6">
              <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {question.longAnswer}
              </div>
            </div>
          )}

          {/* Related tickers */}
          {question.relatedTickers.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-mono text-text-tertiary mb-2 uppercase tracking-wider">
                Saham Terkait
              </p>
              <div className="flex flex-wrap gap-2">
                {question.relatedTickers.map((ticker: string) => (
                  <Link
                    key={ticker}
                    href={`/stocks/${ticker}`}
                    className="text-xs font-mono font-medium px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-secondary hover:text-accent hover:border-accent/30 transition-all"
                  >
                    {ticker.replace(".JK", "")}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {question.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-1.5">
                {question.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-card text-text-tertiary border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vote section */}
          <div className="border-t border-b border-border py-6 mb-6">
            <VoteButtons
              questionId={question.id}
              helpfulVotes={question.helpfulVotes}
              unhelpfulVotes={question.unhelpfulVotes}
            />
          </div>

          {/* Source badge */}
          <div className="flex items-center gap-2 mb-8 text-sm flex-wrap">
            {isAIGenerated ? (
              <>
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span className="text-text-tertiary">Dijawab oleh AI</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 text-accent" />
                <span className="text-text-tertiary">Dijawab oleh tim</span>
              </>
            )}
            <span className="text-text-tertiary/50 mx-1">|</span>
            <span className="text-text-tertiary text-xs font-mono">
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(question.publishedAt))}
            </span>
            <span className="text-text-tertiary/50 mx-1">|</span>
            <span className="text-text-tertiary text-xs font-mono">
              {question.views}x dilihat
            </span>
          </div>

          {/* CTA */}
          <div className="bg-bg-card rounded-xl depth-shadow p-6 text-center">
            <p className="text-base font-semibold text-text-primary mb-2">
              Ada pertanyaan lain?
            </p>
            <p className="text-sm text-text-secondary mb-4">
              Temukan jawaban untuk pertanyaan seputar investasi dan analisis teknikal.
            </p>
            <Link
              href="/akademi?tab=faq"
              className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
            >
              <MessageCircleQuestion className="h-4 w-4" />
              Lihat Semua Pertanyaan
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
