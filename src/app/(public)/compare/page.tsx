import type { Metadata } from "next";
import { ComparePageClient } from "@/components/compare/compare-page-client";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Bandingkan Saham IDX | TeknikalID",
  description: "Bandingkan performa hingga 4 saham IDX dengan grafik overlay dan tabel perbandingan indikator teknikal.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Bandingkan Saham IDX | TeknikalID",
    description: "Bandingkan performa hingga 4 saham IDX dengan grafik overlay dan tabel perbandingan indikator teknikal.",
    url: `${SITE_URL}/compare`,
    images: [{ url: `${SITE_URL}/api/og?title=Bandingkan+Saham+IDX&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bandingkan Saham IDX | TeknikalID",
    description: "Bandingkan performa hingga 4 saham IDX dengan grafik overlay dan tabel perbandingan indikator teknikal.",
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
      <h1 className="sr-only">Bandingkan Saham IDX</h1>
      <ComparePageClient />
    </>
  );
}
