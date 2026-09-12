import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { IDX_STOCKS, IDX40_TICKERS } from "@/lib/constants";
import { SITE_URL } from "@/lib/constants";
import { stripJk } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Daftar Saham Blue Chip Indonesia — IDX40 & LQ45 Terlengkap",
  description:
    "Daftar lengkap saham blue chip Indonesia (IDX40 & LQ45) dengan analisa teknikal. Saham blue chip adalah saham perusahaan besar dengan likuiditas tinggi seperti BBCA, BBRI, TLKM, ASII.",
  alternates: { canonical: "/saham-blue-chip" },
  keywords: [
    "saham blue chip indonesia",
    "daftar saham blue chip",
    "saham idx40",
    "saham lq45",
    "saham perusahaan besar",
    "saham likuid idx",
    "investasi saham blue chip",
    "saham fundamental kuat",
  ],
  openGraph: {
    title: "Daftar Saham Blue Chip Indonesia — IDX40 & LQ45 | TeknikalID",
    description: "Daftar lengkap 40+ saham blue chip Indonesia dengan analisa teknikal gratis.",
    url: `${SITE_URL}/saham-blue-chip`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Blue+Chip+Indonesia&type=berita`, width: 1200, height: 630 }],
  },
};

export default function SahamBlueChipPage() {
  const blueChips = IDX_STOCKS.filter((s) => IDX40_TICKERS.includes(s.ticker));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Daftar Saham Blue Chip Indonesia — IDX40 & LQ45",
        description: "Daftar lengkap saham blue chip Indonesia dengan analisa teknikal.",
        url: `${SITE_URL}/saham-blue-chip`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham blue chip?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham blue chip adalah saham perusahaan besar, terkenal, dan stabil seperti BBCA, BBRI, TLKM. Blue chip memiliki likuiditas tinggi, fundamental kuat, dan rutin membagikan dividen.",
            },
          },
          {
            "@type": "Question",
            name: "Apa perbedaan IDX40 dan LQ45?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "IDX40 adalah indeks 40 saham paling likuid di Bursa Efek Indonesia. LQ45 adalah indeks 45 saham dengan likuiditas tinggi dan fundamental baik. Keduanya hampir sama — mayoritas saham tumpang tindih.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah saham blue chip selalu untung?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak ada saham yang selalu untung. Tapi saham blue chip cenderung lebih stabil dan tahan terhadap krisis dibanding saham kecil. Tetap lakukan analisa teknikal sebelum membeli.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        eyebrow="Saham IDX"
        title="Daftar Saham Blue Chip Indonesia"
        description="40 saham paling likuid di IDX (IDX40) — perusahaan terbesar dan terkuat di Indonesia."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong>💡 Apa itu blue chip?</strong> Saham blue chip adalah saham perusahaan raksasa dengan likuiditas tinggi,
          fundamental kuat, dan historis pembagian dividen rutin. Contoh: BBCA, BBRI, TLKM.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blueChips.map((stock) => (
            <Link
              key={stock.ticker}
              href={`/stocks/${stock.ticker}`}
              className="block rounded-lg border p-4 transition hover:border-blue-400 hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{stripJk(stock.ticker)}</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {stock.sector}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stock.name}</p>
              <p className="mt-2 text-xs font-semibold text-blue-600">Analisa Teknikal →</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/screener" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">🔍 Screener Lengkap</Link>
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">💎 Saham Oversold</Link>
          <Link href="/broker-saham-terbaik" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">🏦 Broker Saham Terbaik</Link>
        </div>
      </div>
    </>
  );
}
