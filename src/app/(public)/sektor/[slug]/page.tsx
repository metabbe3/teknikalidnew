import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SECTORS } from "@/lib/sectors";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTORS.find((s) => s.slug === slug);
  if (!sector) return {};

  return {
    title: `Daftar Harga Saham Sektor ${sector.name} BEI Hari Ini — Analisa Teknikal`,
    description: sector.description.length > 160
      ? sector.description.slice(0, 157) + "..."
      : sector.description,
    alternates: { canonical: `/sektor/${slug}` },
    openGraph: {
      title: `Sektor ${sector.name} — Daftar Saham & Harga Hari Ini | TeknikalID`,
      description: sector.description.length > 160
        ? sector.description.slice(0, 157) + "..."
        : sector.description,
      url: `${SITE_URL}/sektor/${slug}`,
    },
  };
}

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sector = SECTORS.find((s) => s.slug === slug);
  if (!sector) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Sektor ${sector.name} — Analisis Teknikal Saham BEI`,
        description: sector.description,
        url: `${SITE_URL}/sektor/${sector.slug}`,
        breadcrumb: { "@id": `${SITE_URL}/sektor/${sector.slug}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/sektor/${sector.slug}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Sektor",
            item: `${SITE_URL}/sektor`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: sector.name,
            item: `${SITE_URL}/sektor/${sector.slug}`,
          },
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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav
          className="text-xs text-text-tertiary flex items-center gap-1.5"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Home
          </Link>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <Link
            href="/sektor"
            className="hover:text-accent transition-colors"
          >
            Sektor
          </Link>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-text-secondary" aria-current="page">
            {sector.name}
          </span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Sektor {sector.name}
          </h1>
          <p className="text-text-secondary mt-3 text-sm sm:text-base leading-relaxed max-w-3xl">
            {sector.description}
          </p>
        </div>

        {/* Stock list */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary mb-4">
            Saham Representatif
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sector.stocks.map((ticker) => (
              <Link
                key={ticker}
                href={`/stocks/${ticker}`}
                className="group flex items-center gap-3 bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover border border-border transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center font-bold text-accent text-sm font-mono shrink-0">
                  {ticker.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary group-hover:text-accent transition-colors font-mono">
                    {ticker}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Lihat analisis teknikal →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Back link */}
        <Link
          href="/sektor"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Semua Sektor
        </Link>
      </div>
    </>
  );
}
