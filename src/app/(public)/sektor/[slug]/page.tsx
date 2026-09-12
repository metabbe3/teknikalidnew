import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SECTORS } from "@/lib/sectors";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockCard } from "@/components/stock/stock-card";

export const dynamic = "force-dynamic";

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

  // Live data for representative tickers. SECTORS stores bare tickers; DB uses .JK.
  // Fail-soft so a DB hiccup degrades to an empty list, not a 500.
  const tickers = sector.stocks.map((t) => (t.endsWith(".JK") ? t : `${t}.JK`));
  let stocks: Awaited<ReturnType<typeof stockMarketService.getStockBatchWithIndicators>> = [];
  try {
    stocks = await stockMarketService.getStockBatchWithIndicators(tickers);
  } catch {
    stocks = [];
  }
  const breath = stocks.reduce(
    (acc, s) => {
      const l = s.signalLabel ?? "";
      if (l.includes("Bullish")) acc.bullish++;
      else if (l.includes("Bearish")) acc.bearish++;
      else acc.neutral++;
      return acc;
    },
    { bullish: 0, bearish: 0, neutral: 0 },
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-text-primary">
            Sektor {sector.name}
          </h1>
          <p className="text-text-secondary mt-3 text-sm sm:text-base leading-relaxed max-w-3xl">
            {sector.description}
          </p>
        </div>

        {/* Stock list — live verdicts + %change */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Saham Sektor {sector.name} Hari Ini
            </h2>
            {stocks.length > 0 && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-bullish">▲ {breath.bullish}</span>
                <span className="text-gray-400">◆ {breath.neutral}</span>
                <span className="text-bearish">▼ {breath.bearish}</span>
              </div>
            )}
          </div>
          {stocks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stocks.map((s) => (
                <StockCard key={s.ticker} {...s} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">Belum ada data harga untuk saham di sektor ini.</p>
          )}
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
