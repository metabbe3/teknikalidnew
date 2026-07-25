import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { ComparePageClient } from "@/components/compare/compare-page-client";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Bandingkan Saham IDX — Perbandingan Harga, RSI, MACD & Indikator Teknikal",
  description: "Bandingkan performa hingga 4 saham IDX sekaligus. Grafik overlay perbandingan harga, RSI, MACD, dan tabel indikator teknikal side-by-side gratis.",
  alternates: { canonical: "/compare" },
  keywords: [
    "bandingkan saham", "perbandingan saham", "compare saham idx",
    "perbandingan indikator teknikal", "saham vs saham",
  ],
  openGraph: {
    title: "Bandingkan Saham IDX — Perbandingan Indikator Teknikal",
    description: "Bandingkan performa hingga 4 saham IDX sekaligus. Grafik overlay dan tabel indikator teknikal.",
    url: `${SITE_URL}/compare`,
    images: [{ url: `${SITE_URL}/api/og?title=Bandingkan+Saham+IDX&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bandingkan Saham IDX — Perbandingan Indikator Teknikal",
    description: "Bandingkan performa hingga 4 saham IDX dengan grafik overlay dan tabel indikator teknikal.",
  },
};

export default function ComparePage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Bandingkan Saham IDX", url: `${SITE_URL}/compare` },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Bandingkan", item: `${SITE_URL}/compare` },
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
      <PageHero
        eyebrow="Bandingkan"
        title="Bandingkan Saham IDX"
        description="Bandingkan pergerakan harga, indikator teknikal, fundamental, dan trading plan beberapa saham sekaligus."
      />
      <ComparePageClient />
    </>
  );
}
