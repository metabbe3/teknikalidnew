import { type Metadata } from "next";
import Link from "next/link";
import { SECTORS, type Sector } from "@/lib/sectors";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sektor Saham BEI — Analisis Teknikal per Sektor",
  description:
    "Jelajahi analisis teknikal saham BEI berdasarkan sektor: perbankan, pertambangan, agrikultur, properti, teknologi, dan lainnya. Pantau indikator RSI, MACD, dan sinyal trading tiap sektor.",
  alternates: { canonical: "/sektor" },
  openGraph: {
    title: "Sektor Saham BEI — Analisis Teknikal per Sektor | TeknikalID",
    description:
      "Jelajahi analisis teknikal saham BEI berdasarkan sektor: perbankan, pertambangan, agrikultur, properti, teknologi, dan lainnya.",
    url: `${SITE_URL}/sektor`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Sektor Saham BEI",
      description:
        "Daftar sektor saham di Bursa Efek Indonesia dengan analisis teknikal lengkap.",
      url: `${SITE_URL}/sektor`,
      breadcrumb: { "@id": `${SITE_URL}/sektor#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/sektor#breadcrumb`,
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
      ],
    },
  ],
};

export default function SectorIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <nav className="text-xs text-text-tertiary flex items-center gap-1.5 mb-4">
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
            <span className="text-text-secondary" aria-current="page">
              Sektor
            </span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Sektor Saham BEI
          </h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base max-w-2xl">
            Jelajahi analisis teknikal saham berdasarkan sektor di Bursa Efek
            Indonesia. Pilih sektor untuk melihat saham-saham representatif
            beserta indikator teknikalnya.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTORS.map((sector) => (
            <Link
              key={sector.slug}
              href={`/sektor/${sector.slug}`}
              className="group block bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover border border-border transition-all"
            >
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                {sector.name}
              </h2>
              <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                {sector.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sector.stocks.map((ticker) => (
                  <span
                    key={ticker}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/10 text-accent"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
