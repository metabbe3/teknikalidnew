import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { screenerAnalysisService } from "@/domains/stock/screener-analysis.service";
import { SITE_URL } from "@/lib/constants";
import { stripJk } from "@/lib/utils";
import Link from "next/link";
import { Gem, Landmark, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar Saham Dividen Tinggi Indonesia — Yield Terbaru",
  description:
    "Daftar 198+ saham dividen tinggi Indonesia dengan yield terbaru dari data pasar. Lihat BMRI, BBRI, TLKM dan saham dividen 8%+ sebelum membeli.",
  alternates: { canonical: "/saham-dividen" },
  keywords: [
    "saham dividen tinggi",
    "daftar saham dividen",
    "saham dividend yield tinggi",
    "dividen saham terbaru",
    "saham passive income",
    "investasi dividen",
    "saham bagi hasil",
  ],
  openGraph: {
    title: "Daftar Saham Dividen Tinggi Indonesia | TeknikalID",
    description: "198+ saham dividen tinggi dengan yield live dari data pasar terbaru.",
    url: `${SITE_URL}/saham-dividen`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Dividen+Tinggi+Indonesia&type=berita`, width: 1200, height: 630 }],
  },
};

type FundRow = {
  ticker: string; name: string; sector: string; close: number;
  pe: number | null; pb: number | null; eps: number | null;
  dividendYield: number | null; marketCap: number | null;
};

export default async function SahamDividenPage() {
  const result = await screenerAnalysisService.screenerQuery("high_dividend");
  const rows = (Array.isArray(result) ? result : []) as unknown as FundRow[];
  const top = rows
    .filter((r) => r.dividendYield != null)
    .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0))
    .slice(0, 20);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Daftar Saham Dividen Tinggi Indonesia",
        description: "Daftar saham Indonesia dengan dividen yield tertinggi, update harian.",
        url: `${SITE_URL}/saham-dividen`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Berapa dividen yield yang disebut tinggi?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Umumnya yield di atas 5-6% sudah dianggap tinggi untuk saham Indonesia. Beberapa saham bank BUMN seperti BBRI dan BMRI rutin memberi yield di atas 8-11%. Yang lebih penting: pastikan dividen konsisten, bukan sekali bayar besar lalu berhenti.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah saham dividen tinggi selalu bagus?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Yield tinggi bisa terjadi karena harganya anjlok (value trap). Cek juga kesehatan fundamental (laba stabil, utang wajar) dan tren harganya lewat analisa teknikal sebelum membeli.",
            },
          },
          {
            "@type": "Question",
            name: "Kapan saya menerima dividen saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Anda menerima dividen jika memegang saham sampai tanggal cum date (tanggal terakhir kepemilikan untuk berhak dividen). Pembayaran biasanya 1-2 bulan setelah RUPS tahunan perusahaan.",
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
        title="Daftar Saham Dividen Tinggi Indonesia"
        description={`${rows.length} saham dengan dividen yield di atas 3% — diurutkan dari yield tertinggi, update otomatis dari data pasar.`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong> Apa itu dividend yield?</strong> Yield = besarnya dividen setahun dibagi harga saham.
          Yield 8% artinya setiap Rp100 yang Anda investasikan memberi sekitar Rp8 dividen per tahun —
          asalkan dividen dan harga bertahan.
        </div>

        <AskAiCta question="Dividen di atas 8% ada yang aman?" />

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Saham</th>
                <th className="py-2 pr-4 font-medium">Yield</th>
                <th className="py-2 pr-4 font-medium">Harga</th>
                <th className="py-2 pr-4 font-medium">PE</th>
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
                  <td className="py-2 pr-4">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                      {r.dividendYield != null ? `${r.dividendYield.toFixed(2)}%` : "-"}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{r.close != null ? r.close.toLocaleString("id-ID") : "-"}</td>
                  <td className="py-2 pr-4">{r.pe != null ? r.pe.toFixed(1) : "-"}</td>
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
          <Link href="/saham-blue-chip" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><Landmark className="inline h-4 w-4" /> Saham Blue Chip</Link>
          <Link href="/saham-undervalued" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><Gem className="inline h-4 w-4" /> Saham Undervalued</Link>
        </div>
      </div>
    </>
  );
}
