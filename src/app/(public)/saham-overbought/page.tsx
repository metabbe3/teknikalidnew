import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import { Gem, Search, TrendingUp } from "lucide-react";

 // 12 Okt: failed-bake 5mnt bikin 'tidak ada data' pasca-deploy; 30s self-heal

// force-dynamic (RCA 18 Okt): prerender build-time tanpa DB membekukan empty state
// ("Data sedang diperbarui") — ISR revalidate tidak pernah mengisi (pola /berita).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saham Overbought Hari Ini — RSI Diatas 70",
  description:
    "Daftar saham IDX overbought hari ini (RSI diatas 70). Saham overbought berpotensi koreksi — pertimbangkan take profit atau hindari beli di harga tinggi.",
  alternates: { canonical: "/saham-overbought" },
  keywords: [
    "saham overbought hari ini",
    "saham rsi diatas 70",
    "saham jual hari ini",
    "sinyal jual saham",
    "take profit saham",
    "saham naik terlalu tinggi",
    "koreksi saham idx",
  ],
  openGraph: {
    title: "Saham Overbought Hari Ini — RSI > 70 | TeknikalID",
    description: "Daftar saham IDX overbought (RSI > 70). Waspadai koreksi harga.",
    url: `${SITE_URL}/saham-overbought`,
  },
};

export default async function SahamOverboughtPage() {
  const { stocks, failed } = await fetchScreenerRows("rsi_overbought");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Overbought Hari Ini — RSI Diatas 70",
        description: "Daftar saham IDX overbought yang berpotensi koreksi.",
        url: `${SITE_URL}/saham-overbought`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham overbought?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham overbought adalah kondisi dimana harga naik terlalu cepat, ditandai dengan RSI diatas 70. Harga berpotensi koreksi turun karena sudah terlalu mahal.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah overbought berarti harus jual?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Dalam tren kuat, RSI bisa tetap diatas 70 untuk waktu lama. Tapi overbought adalah sinyal untuk berhati-hati, pertimbangkan take profit bertahap.",
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
        title="Saham Overbought Hari Ini"
        description="Saham dengan RSI diatas 70 — berpotensi koreksi. Pertimbangkan take profit."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950">
          <strong> Perhatian:</strong> Saham overbought bukan sinyal jual pasti. Dalam tren kuat, RSI bisa bertahan
          diatas 70. Gunakan bersama indikator lain.
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold">Ticker</th>
                <th className="py-2 pr-4 font-semibold">Nama</th>
                <th className="py-2 pr-4 font-semibold">Harga</th>
                <th className="py-2 pr-4 font-semibold">Perubahan</th>
                <th className="py-2 pr-4 font-semibold">RSI</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada saham overbought saat ini.</td></tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; rsi14: number | null };
                  return (
                    <tr key={s.ticker} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-4"><Link href={`/stocks/${s.ticker}`} className="font-semibold text-blue-600 hover:underline inline-block py-1.5">{stripJk(s.ticker)}</Link></td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.name}</td>
                      <td className="py-2 pr-4"><span data-live-price={(s ?? stock).ticker}>{s.close !== null ? formatPrice(s.close) : "—"}</span></td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>{s.changePercent !== null ? formatPercent(s.changePercent) : "—"}</td>
                      <td className={`py-2 pr-4 font-semibold ${s.rsi14 !== null ? rsiColor(s.rsi14) : ""}`}>{s.rsi14 !== null ? s.rsi14.toFixed(1) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <AskAiCta question="Saham overbought ada?" />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><Gem className="inline h-4 w-4" /> Saham Oversold</Link>
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted"><TrendingUp className="inline h-4 w-4" /> Saham Golden Cross</Link>
          <Link href="/screener" className="rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"><Search className="inline h-4 w-4" /> Screener Lengkap</Link>
        </div>
      </div>
    </>
  );
}
