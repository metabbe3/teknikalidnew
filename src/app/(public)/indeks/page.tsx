import { type Metadata } from "next";
import Link from "next/link";
import { IDX_INDICES } from "@/lib/idx-indices";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Daftar Indeks Saham BEI — IDX SMC Liquid, IDX30, LQ45",
  description:
    "Jelajahi indeks saham utama Bursa Efek Indonesia: IDX SMC Liquid, IDX30, IDX Quality30, dan lainnya. Pantau harga, perubahan, dan indikator teknikal saham indeks BEI.",
  alternates: { canonical: "/indeks" },
  openGraph: {
    title: "Daftar Indeks Saham BEI — IDX SMC Liquid, IDX30, LQ45",
    description:
      "Jelajahi indeks saham utama Bursa Efek Indonesia: IDX SMC Liquid, IDX30, IDX Quality30, dan lainnya.",
    url: `${SITE_URL}/indeks`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Indeks Saham BEI",
      description:
        "Daftar indeks saham di Bursa Efek Indonesia dengan analisis teknikal lengkap.",
      url: `${SITE_URL}/indeks`,
      breadcrumb: { "@id": `${SITE_URL}/indeks#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/indeks#breadcrumb`,
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
          name: "Indeks",
          item: `${SITE_URL}/indeks`,
        },
      ],
    },
  ],
};

export default function IndexListingPage() {
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
              Indeks
            </span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-text-primary">
            Indeks Saham BEI
          </h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base max-w-2xl">
            Jelajahi indeks saham utama di Bursa Efek Indonesia. Pilih indeks
            untuk melihat daftar saham konstituen beserta analisis teknikalnya.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {IDX_INDICES.map((idx) => (
            <Link
              key={idx.slug}
              href={`/indeks/${idx.slug}`}
              className="group block bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover border border-border transition-all"
            >
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                {idx.fullName}
              </h2>
              <p className="text-xs text-text-tertiary mt-1 line-clamp-3">
                {idx.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {idx.stocks.slice(0, 10).map((ticker) => (
                  <span
                    key={ticker}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/10 text-accent"
                  >
                    {ticker}
                  </span>
                ))}
                {idx.stocks.length > 10 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/10 text-accent">
                    +{idx.stocks.length - 10}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
