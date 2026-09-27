import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { RegisterCta } from "@/components/signal/register-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Saham Golden Cross Hari Ini — Sinyal Bullish MA50 > MA200",
  description:
    "Daftar saham IDX golden cross hari ini — sinyal bullish ketika MA50 crossing diatas MA200. Temukan saham dengan momentum naik untuk swing trading dan investasi jangka menengah.",
  alternates: { canonical: "/saham-golden-cross" },
  keywords: [
    "saham golden cross hari ini",
    "golden cross saham indonesia",
    "saham bullish hari ini",
    "ma50 ma200 crossover saham",
    "sinyal beli saham hari ini",
    "saham momentum naik",
    "swing trading saham idx",
    "saham uptrend hari ini",
  ],
  openGraph: {
    title: "Saham Golden Cross Hari Ini — Sinyal Bullish | TeknikalID",
    description: "Daftar saham IDX golden cross (MA50 > MA200). Sinyal bullish untuk swing trading.",
    url: `${SITE_URL}/saham-golden-cross`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Golden+Cross+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamGoldenCrossPage() {
  const { stocks, failed } = await fetchScreenerRows("golden_cross");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Golden Cross Hari Ini — Sinyal Bullish",
        description: "Daftar saham IDX golden cross (MA50 crossing above MA200).",
        url: `${SITE_URL}/saham-golden-cross`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu golden cross saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Golden cross terjadi ketika Moving Average 50 hari (MA50) memotong ke atas Moving Average 200 hari (MA200). Ini adalah sinyal bullish kuat yang menandakan momentum naik jangka menengah ke panjang.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah golden cross selalu akurat?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Golden cross adalah sinyal kuat tapi tidak 100% akurat. Selalu konfirmasi dengan volume, indikator lain seperti MACD dan RSI, serta analisa fundamental sebelum membeli.",
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
        title="Saham Golden Cross Hari Ini"
        description="Saham dengan MA50 crossing diatas MA200 — sinyal bullish kuat untuk swing trading. Update setiap 5 menit."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <strong>📈 Mengapa golden cross penting?</strong> Golden cross adalah salah satu sinyal bullish paling
          diandalkan. Statistik menunjukkan saham setelah golden cross cenderung naik dalam 2-4 minggu berikutnya.
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold">Ticker</th>
                <th className="py-2 pr-4 font-semibold">Nama</th>
                <th className="py-2 pr-4 font-semibold">Harga</th>
                <th className="py-2 pr-4 font-semibold">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada saham golden cross saat ini. Cek lagi nanti.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null };
                  return (
                    <tr key={s.ticker} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-4">
                        <Link href={`/stocks/${s.ticker}`} className="font-semibold text-blue-600 hover:underline inline-block py-1.5">
                          {stripJk(s.ticker)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.name}</td>
                      <td className="py-2 pr-4">{s.close !== null ? formatPrice(s.close) : "—"}</td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>
                        {s.changePercent !== null ? formatPercent(s.changePercent) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <RegisterCta slug="saham-golden-cross" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/screener" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            🔍 Screener Lengkap
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted">
            💎 Saham Oversold
          </Link>
          <Link href="/saham-overbought" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted">
            ⚠️ Saham Overbought
          </Link>
        </div>
      </div>
    </>
  );
}
