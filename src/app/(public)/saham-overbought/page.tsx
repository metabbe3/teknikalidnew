import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

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
  let stocks: Record<string, unknown>[] = [];
  try {
    const result = await technicalAnalysisService.screenerQuery("rsi_overbought");
    if (result && !("error" in result)) {
      stocks = Array.isArray(result) ? result.slice(0, 30) : [];
    }
  } catch {
    // Non-critical
  }

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
          <strong>⚠️ Perhatian:</strong> Saham overbought bukan sinyal jual pasti. Dalam tren kuat, RSI bisa bertahan
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
              {stocks.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada saham overbought saat ini.</td></tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; rsi14: number | null };
                  return (
                    <tr key={s.ticker} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-4"><Link href={`/stocks/${s.ticker}`} className="font-semibold text-blue-600 hover:underline">{stripJk(s.ticker)}</Link></td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.name}</td>
                      <td className="py-2 pr-4">{s.close !== null ? formatPrice(s.close) : "—"}</td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>{s.changePercent !== null ? formatPercent(s.changePercent) : "—"}</td>
                      <td className={`py-2 pr-4 font-semibold ${s.rsi14 !== null ? rsiColor(s.rsi14) : ""}`}>{s.rsi14 !== null ? s.rsi14.toFixed(1) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">💎 Saham Oversold</Link>
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">📈 Saham Golden Cross</Link>
          <Link href="/screener" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">🔍 Screener Lengkap</Link>
        </div>
      </div>
    </>
  );
}
