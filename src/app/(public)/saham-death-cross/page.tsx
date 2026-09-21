import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Saham Death Cross Hari Ini — Sinyal Bearish MA50 < MA200",
  description:
    "Daftar saham IDX death cross hari ini — sinyal bearish ketika MA50 memotong kebawah MA200. Waspadai saham dengan momentum turun untuk menghindari jebakan bearish.",
  alternates: { canonical: "/saham-death-cross" },
  keywords: [
    "saham death cross hari ini",
    "death cross saham indonesia",
    "saham bearish hari ini",
    "ma50 ma200 death cross",
    "sinyal jual saham",
    "saham downtrend",
  ],
  openGraph: {
    title: "Saham Death Cross Hari Ini — Sinyal Bearish | TeknikalID",
    description: "Daftar saham IDX death cross (MA50 < MA200). Sinyal bearish — waspadai momentum turun.",
    url: `${SITE_URL}/saham-death-cross`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Death+Cross+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamDeathCrossPage() {
  const { stocks, failed } = await fetchScreenerRows("death_cross");

  // Static schema markup (no user input), rendered as a plain script child.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Death Cross Hari Ini — Sinyal Bearish",
        description: "Daftar saham IDX death cross (MA50 memotong kebawah MA200).",
        url: `${SITE_URL}/saham-death-cross`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu death cross pada saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Death cross terjadi ketika Moving Average 50 hari (MA50) memotong ke bawah Moving Average 200 hari (MA200). Ini sinyal bearish klasik yang menandakan momentum turun jangka menengah ke panjang.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah death cross berarti harus langsung jual?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Death cross kadang muncul saat harga sudah turun jauh (terlambat). Gunakan sebagai peringatan risiko, bukan sinyal jual mutlak — konfirmasi dengan volume, RSI, dan kondisi fundamental perusahaan.",
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
        title="Saham Death Cross Hari Ini"
        description="Saham dengan MA50 memotong kebawah MA200 — sinyal bearish, waspadai momentum turun. Update setiap 5 menit."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-4 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">⚠️ Mengapa death cross penting?</strong> Death cross menandakan
          tren turun jangka panjang terkonfirmasi. Bagi investor, ini saat meninjau ulang posisi; bagi trader,
          peluang short-term rebound biasanya lemah sampai tren berbalik.
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
                    Belum ada saham death cross saat ini. Cek lagi nanti.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null };
                  return (
                    <tr key={s.ticker} className="border-b border-border hover:bg-bg-hover">
                      <td className="py-2 pr-4">
                        <Link href={`/stocks/${s.ticker}`} className="font-semibold text-accent hover:underline">
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
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
            🔍 Screener Lengkap
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-bg-hover">
            📈 Saham Golden Cross
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-bg-hover">
            💎 Saham Oversold
          </Link>
        </div>
      </div>
    </>
  );
}
