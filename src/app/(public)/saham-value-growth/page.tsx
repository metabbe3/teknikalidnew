import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { screenerAnalysisService } from "@/domains/stock/screener-analysis.service";
import { SITE_URL } from "@/lib/constants";
import { stripJk } from "@/lib/utils";
import Link from "next/link";
import { Gem, PiggyBank, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar Saham Value Growth Indonesia — Murah & Bertumbuh",
  description:
    "Daftar saham value growth Indonesia: valuasi masih wajar (PE < 20) dengan pertumbuhan laba. Kombinasi saham murah yang bisnisnya sedang bertumbuh.",
  alternates: { canonical: "/saham-value-growth" },
  keywords: [
    "saham value growth",
    "saham growth indonesia",
    "saham pertumbuhan laba",
    "value growth investing",
    "saham murah bertumbuh",
    "growth stock idx",
  ],
  openGraph: {
    title: "Daftar Saham Value Growth Indonesia | TeknikalID",
    description: "Saham dengan valuasi wajar dan pertumbuhan laba — update otomatis dari data pasar.",
    url: `${SITE_URL}/saham-value-growth`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Value+Growth+Indonesia&type=berita`, width: 1200, height: 630 }],
  },
};

type FundRow = {
  ticker: string; name: string; sector: string; close: number;
  pe: number | null; pb: number | null; eps: number | null;
  dividendYield: number | null; marketCap: number | null;
};

export default async function SahamValueGrowthPage() {
  const result = await screenerAnalysisService.screenerQuery("value_growth");
  const rows = (Array.isArray(result) ? result : []) as unknown as FundRow[];
  const top = rows.slice(0, 20);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Daftar Saham Value Growth Indonesia",
        description: "Saham Indonesia dengan valuasi wajar dan momentum pertumbuhan, update otomatis.",
        url: `${SITE_URL}/saham-value-growth`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham value growth?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Value growth = strategi gabungan: cari saham yang valuasinya masih wajar (tidak kemahalan, misalnya PE di bawah 20) tapi bisnisnya sedang bertumbuh. Tujuannya membeli pertumbuhan sebelum harganya terlalu mahal.",
            },
          },
          {
            "@type": "Question",
            name: "Bedanya value investing dan growth investing?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Value investing fokus pada saham murah hari ini (PE/PB rendah, kadang perusahaan lambat tumbuh). Growth investing fokus pada pertumbuhan cepat meski harganya premium. Value growth mengambil keduanya: murah DAN bertumbuh.",
            },
          },
          {
            "@type": "Question",
            name: "Risiko utama saham growth apa?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Jika pertumbuhan laba melambat, harganya bisa turun tajam karena pasar sudah membayar ekspektasi tinggi. Karena itu disiplin pada valuasi awal (PE wajar) penting, dan pantau tren harganya secara teknikal.",
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
        title="Daftar Saham Value Growth Indonesia"
        description={`${rows.length} saham dengan valuasi wajar dan pertumbuhan laba — update otomatis dari data pasar.`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong> Kenapa value growth?</strong> Saham murah saja bisa lama bergerak; saham bertumbuh saja
          bisa kemahalan. Gabungan keduanya — valuasi wajar + laba naik — adalah pola yang dicari banyak
          investor jangka menengah.
        </div>

        <AskAiCta question="Saham yang lagi murah tapi mulai naik?" />

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Saham</th>
                <th className="py-2 pr-4 font-medium">PE</th>
                <th className="py-2 pr-4 font-medium">EPS</th>
                <th className="py-2 pr-4 font-medium">Harga</th>
                <th className="py-2 font-medium">Sektor</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.ticker} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/stocks/${r.ticker}`} className="font-bold hover:underline">
                      {stripJk(r.ticker)}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{r.name}</span>
                  </td>
                  <td className="py-2 pr-4 font-semibold">{r.pe != null ? r.pe.toFixed(1) : "-"}</td>
                  <td className="py-2 pr-4">{r.eps != null ? r.eps.toFixed(0) : "-"}</td>
                  <td className="py-2 pr-4">{r.close != null ? r.close.toLocaleString("id-ID") : "-"}</td>
                  <td className="py-2 text-xs">{r.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Menampilkan 20 teratas dari {rows.length} saham. Data fundamental update berkala; harga indikatif.
          Bukan rekomendasi beli.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/screener" className="rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"><Search className="inline h-4 w-4" /> Screener Lengkap</Link>
          <Link href="/saham-undervalued" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><Gem className="inline h-4 w-4" /> Saham Undervalued</Link>
          <Link href="/saham-dividen" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><PiggyBank className="inline h-4 w-4" /> Saham Dividen Tinggi</Link>
        </div>
      </div>
    </>
  );
}
