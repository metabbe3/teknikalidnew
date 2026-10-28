import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { screenerAnalysisService } from "@/domains/stock/screener-analysis.service";
import { SITE_URL } from "@/lib/constants";
import { stripJk } from "@/lib/utils";
import Link from "next/link";
import { Landmark, PiggyBank, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar Saham Undervalued Indonesia — PE Rendah PB < 1.5",
  description:
    "Daftar saham undervalued Indonesia: PE di bawah 15 dan Price to Book di bawah 1.5. Lihat saham yang harganya masih murah dibanding nilai perusahaannya.",
  alternates: { canonical: "/saham-undervalued" },
  keywords: [
    "saham undervalued",
    "daftar saham murah",
    "saham pe rendah",
    "saham pb rendah",
    "value investing indonesia",
    "saham di bawah nilai buku",
    "cara cari saham undervalued",
  ],
  openGraph: {
    title: "Daftar Saham Undervalued Indonesia (PE<15, PB<1.5) | TeknikalID",
    description: "Saham dengan valuasi murah berdasarkan PE dan PB terbaru — update otomatis.",
    url: `${SITE_URL}/saham-undervalued`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Undervalued+Indonesia&type=berita`, width: 1200, height: 630 }],
  },
};

type FundRow = {
  ticker: string; name: string; sector: string; close: number;
  pe: number | null; pb: number | null; eps: number | null;
  dividendYield: number | null; marketCap: number | null;
};

export default async function SahamUndervaluedPage() {
  const result = await screenerAnalysisService.screenerQuery("undervalued");
  const rows = (Array.isArray(result) ? result : []) as unknown as FundRow[];
  const top = rows.slice(0, 20);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Daftar Saham Undervalued Indonesia",
        description: "Saham dengan PE di bawah 15 dan PB di bawah 1.5, update otomatis dari data pasar.",
        url: `${SITE_URL}/saham-undervalued`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham undervalued?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham undervalued adalah saham yang harganya lebih murah dibanding nilai perusahaannya. Dua ukuran umum: PE rendah (harga murah dibanding laba) dan PB di bawah 1 (harga di bawah nilai aset perusahaan setelah utang dibayar).",
            },
          },
          {
            "@type": "Question",
            name: "Apakah PE rendah selalu berarti murah?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak. PE rendah bisa berarti laba sedang di puncak siklus (misalnya saham komoditas) atau ada masalah tersembunyi. Kombinasikan dengan tren harga (analisa teknikal) dan kualitas bisnisnya.",
            },
          },
          {
            "@type": "Question",
            name: "PB di bawah 1 artinya apa?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "PB (Price to Book) di bawah 1 berarti harga saham di pasar lebih rendah dari nilai bukunya. Secara teori Anda membeli aset perusahaan dengan diskon — tapi cek juga apakah asetnya produktif dan labanya sehat.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <PageHero
        eyebrow="Saham IDX"
        title="Daftar Saham Undervalued Indonesia"
        description={`${rows.length} saham dengan PE di bawah 15 dan PB di bawah 1.5 — diurutkan dari PE terendah, update otomatis.`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong> Cara baca:</strong> PE rendah = harga murah dibanding laba per tahun. PB rendah = harga
          murah dibanding nilai perusahaan. Keduanya rendah = kandidat undervalued — tapi tetap cek tren
          harganya dan kesehatan bisnisnya.
        </div>

        <AskAiCta question="Saham murah yang lagi mulai naik ada?" />

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Saham</th>
                <th className="py-2 pr-4 font-medium">PE</th>
                <th className="py-2 pr-4 font-medium">PB</th>
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
                  <td className="py-2 pr-4">{r.pb != null ? r.pb.toFixed(2) : "-"}</td>
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
          <Link href="/saham-dividen" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><PiggyBank className="inline h-4 w-4" /> Saham Dividen Tinggi</Link>
          <Link href="/saham-blue-chip" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><Landmark className="inline h-4 w-4" /> Saham Blue Chip</Link>
        </div>
      </div>
    </>
  );
}
