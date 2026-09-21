import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Saham Pullback ke SMA20 Hari Ini — Kesempatan Beli di Tren Naik",
  description:
    "Daftar saham IDX yang sedang pullback ke SMA20 dalam tren naik — momen beli diskon pada saham bullish. Strategi buy the dip untuk swing trader.",
  alternates: { canonical: "/saham-pullback-sma20" },
  keywords: [
    "saham pullback hari ini",
    "beli saham saat pullback",
    "saham pullback ke ma20",
    "buy the dip saham",
    "strategi swing trading saham",
    "saham tren naik koreksi",
  ],
  openGraph: {
    title: "Saham Pullback ke SMA20 Hari Ini | TeknikalID",
    description: "Saham tren naik yang sedang koreksi ke SMA20 — kesempatan entry bagi swing trader.",
    url: `${SITE_URL}/saham-pullback-sma20`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Pullback+SMA20+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamPullbackSma20Page() {
  const { stocks, failed } = await fetchScreenerRows("pullback_sma20");

  // Static schema markup (no user input), rendered as a plain script child.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Pullback ke SMA20 Hari Ini",
        description: "Daftar saham IDX tren naik yang sedang pullback ke SMA20.",
        url: `${SITE_URL}/saham-pullback-sma20`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu pullback ke SMA20?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Pullback ke SMA20 terjadi ketika harga saham yang sedang tren naik turun sementara menyentuh rata-rata bergerak 20 hari. Di tren sehat, SMA20 sering jadi area support tempat buyer masuk kembali — peluang beli dengan risiko lebih kecil.",
            },
          },
          {
            "@type": "Question",
            name: "Kapan pullback gagal dan jadi pembalikan tren?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Jika harga ditutup meyakinkan di bawah SMA20 dengan volume besar, dan SMA20 mulai menurun, pullback berisiko berubah jadi pembalikan tren. Pasang stop loss di bawah SMA20 dan konfirmasi dengan RSI serta struktur tren.",
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
        title="Saham Pullback ke SMA20 Hari Ini"
        description="Saham tren naik yang sedang koreksi ke SMA20 — momen entry 'beli diskon' pada saham bullish. Update setiap 5 menit."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-4 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">🎯 Mengapa pullback SMA20 penting?</strong> Trader disiplin tidak
          mengejar harga yang sudah naik. Membeli saat pullback di tren naik memberi entry lebih baik, stop loss
          lebih ketat, dan risk-reward lebih menguntungkan.
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
                    Belum ada saham pullback SMA20 saat ini. Cek lagi nanti.
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
          <Link href="/saham-volume-spike" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-bg-hover">
            📊 Saham Volume Spike
          </Link>
        </div>
      </div>
    </>
  );
}
