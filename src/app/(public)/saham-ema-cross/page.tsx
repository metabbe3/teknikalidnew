import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Saham EMA Cross Hari Ini — Sinyal EMA12/EMA26",
  description:
    "Daftar saham IDX dengan EMA cross hari ini — EMA12 memotong EMA26, sinyal momentum jangka pendek untuk trader aktif. Lihat saham bullish dan bearish EMA crossover.",
  alternates: { canonical: "/saham-ema-cross" },
  keywords: [
    "saham ema cross hari ini",
    "ema 12 26 crossover saham",
    "sinyal ema saham indonesia",
    "saham crossover moving average",
    "trading ema saham idx",
    "ema cross bullish",
  ],
  openGraph: {
    title: "Saham EMA Cross Hari Ini — EMA12/EMA26 | TeknikalID",
    description: "Daftar saham IDX dengan sinyal EMA12/EMA26 crossover.",
    url: `${SITE_URL}/saham-ema-cross`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+EMA+Cross+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamEmaCrossPage() {
  const { stocks, failed } = await fetchScreenerRows("ema_cross");

  // Static schema markup (no user input), rendered as a plain script child.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham EMA Cross Hari Ini",
        description: "Daftar saham IDX dengan sinyal EMA12/EMA26 crossover.",
        url: `${SITE_URL}/saham-ema-cross`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu EMA cross pada saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "EMA cross terjadi ketika Exponential Moving Average jangka pendek (EMA12) memotong EMA jangka panjang (EMA26). EMA cross ke atas = sinyal bullish momentum; ke bawah = bearish. Lebih responsif daripada SMA cross karena memberi bobot lebih pada harga terbaru.",
            },
          },
          {
            "@type": "Question",
            name: "Apa beda EMA cross dengan golden cross?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Golden cross memakai SMA50/SMA200 — sinyal jangka panjang yang lambat tapi kuat. EMA12/EMA26 bereaksi jauh lebih cepat, cocok untuk swing trading jangka pendek, tapi juga lebih sering memberi sinyal palsu. Konfirmasi dengan volume dan RSI.",
            },
          },
        ],
      },
    ],
  });

  return (
    <>
      <script type="application/ld+json">{jsonLd}</script>
      <PageHero
        eyebrow="Saham IDX"
        title="Saham EMA Cross Hari Ini"
        description="Saham dengan sinyal EMA12/EMA26 crossover — momentum jangka pendek untuk trader aktif. Update setiap 5 menit."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-4 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">⚡ Mengapa EMA cross penting?</strong> EMA cross adalah detektor
          perubahan momentum paling awal di antara moving average. Trader aktif memakainya untuk menangkap awal
          pergerakan sebelum tren besar terbentuk.
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold text-text-primary">Ticker</th>
                <th className="py-2 pr-4 font-semibold text-text-primary">Nama</th>
                <th className="py-2 pr-4 font-semibold text-text-primary">Harga</th>
                <th className="py-2 pr-4 font-semibold text-text-primary">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-tertiary">
                    Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-tertiary">
                    Belum ada saham EMA cross saat ini. Cek lagi nanti.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null };
                  return (
                    <tr key={s.ticker} className="border-b border-border hover:bg-bg-hover">
                      <td className="py-2 pr-4">
                        <Link href={`/stocks/${s.ticker}`} className="font-semibold text-accent hover:underline inline-block py-1.5">
                          {stripJk(s.ticker)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{s.name}</td>
                      <td className="py-2 pr-4 text-text-primary">{s.close !== null ? formatPrice(s.close) : "—"}</td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>
                        {s.changePercent !== null ? formatPercent(s.changePercent) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            🔍 Screener Lengkap
          </Link>
          <Link href="/saham-macd-bullish" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            📈 Saham MACD Bullish
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            🌟 Saham Golden Cross
          </Link>
        </div>
      </div>
    </>
  );
}
