import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { SITE_URL } from "@/lib/constants";
import { ChevronRight, ArrowLeft, BookOpen } from "lucide-react";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
  teknikal: "Teknikal",
  fundamental: "Fundamental",
  pasar: "Pasar",
  strategi: "Strategi",
};

const CATEGORY_COLORS: Record<string, string> = {
  teknikal: "#8b5cf6",
  fundamental: "#2563eb",
  pasar: "#0d9488",
  strategi: "#f59e0b",
};

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ term: string }>;
}): Promise<Metadata> {
  const { term: slug } = await params;
  const entry = GLOSSARY_TERMS.find((t) => t.slug === slug);

  if (!entry) return {};

  const title = `Pengertian ${entry.term} — Glosarium Saham & Cara Menggunakannya`;
  const description = entry.definition.length > 160
    ? entry.definition.slice(0, 157) + "..."
    : entry.definition;

  return {
    title,
    description,
    alternates: { canonical: `/akademi/glosarium/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/akademi/glosarium/${slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ term: string }>;
}) {
  const { term: slug } = await params;
  const entry = GLOSSARY_TERMS.find((t) => t.slug === slug);

  if (!entry) notFound();

  const categoryColor = CATEGORY_COLORS[entry.category] ?? "#6b7280";

  // Related terms lookup
  const relatedTerms = (entry.related ?? [])
    .map((r) => GLOSSARY_TERMS.find((t) => t.slug === r))
    .filter(Boolean);

  // FAQPage JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Apa itu ${entry.term}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.definition,
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
      {
        "@type": "ListItem",
        position: 2,
        name: "Akademi",
        item: `${SITE_URL}/akademi`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Glosarium",
        item: `${SITE_URL}/akademi/glosarium`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: entry.term,
        item: `${SITE_URL}/akademi/glosarium/${slug}`,
      },
    ],
  };

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
              href="/akademi/glosarium"
              className="hover:text-accent transition-colors"
            >
              Glosarium
            </Link>
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
            <span className="text-text-secondary truncate max-w-[200px] sm:max-w-[300px]">
              {entry.term}
            </span>
          </nav>

          {/* Back link */}
          <Link
            href="/akademi/glosarium"
            className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Glosarium
          </Link>

          {/* Term header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <BookOpen className="h-4 w-4 text-accent" />
              </div>
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: `${categoryColor}15`,
                  color: categoryColor,
                }}
              >
                {CATEGORY_LABELS[entry.category] ?? entry.category}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary leading-snug">
              Apa itu {entry.term}?
            </h1>
          </header>

          {/* Definition */}
          <div className="bg-bg-card rounded-xl depth-shadow p-6 sm:p-8 mb-6">
            <p className="text-base text-text-primary leading-relaxed">
              {entry.definition}
            </p>
          </div>

          {/* Related terms */}
          {relatedTerms.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-mono text-text-tertiary mb-3 uppercase tracking-wider">
                Istilah Terkait
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedTerms.map(
                  (related) =>
                    related && (
                      <Link
                        key={related.slug}
                        href={`/akademi/glosarium/${related.slug}`}
                        className="text-xs font-mono font-medium px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-secondary hover:text-accent hover:border-accent/30 transition-all"
                      >
                        {related.term}
                      </Link>
                    )
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-bg-card rounded-xl depth-shadow p-6 text-center">
            <p className="text-base font-semibold text-text-primary mb-2">
              Jelajahi istilah lainnya
            </p>
            <p className="text-sm text-text-secondary mb-4">
              Temukan penjelasan lengkap untuk istilah-istilah penting di dunia saham.
            </p>
            <Link
              href="/akademi/glosarium"
              className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Lihat Semua Istilah
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
