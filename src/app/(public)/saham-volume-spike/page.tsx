import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { RegisterCta } from "@/components/signal/register-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Saham Volume Spike Hari Ini — Volume Melonjak di IDX",
  description:
    "Daftar saham IDX dengan volume spike hari ini — volume perdagangan melonjak jauh diatas rata-rata. Temukan saham yang mulai masuk radar institusi dan trader besar.",
  alternates: { canonical: "/saham-volume-spike" },
  keywords: [
    "saham volume spike hari ini",
    "saham volume naik hari ini",
    "volume perdagangan saham melonjak",
    "saham akumulasi institusi",
    "saham aktif hari ini",
    "volume saham idx",
  ],
  openGraph: {
    title: "Saham Volume Spike Hari Ini — Volume Melonjak | TeknikalID",
    description: "Daftar saham IDX dengan volume perdagangan melonjak diatas rata-rata.",
    url: `${SITE_URL}/saham-volume-spike`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Volume+Spike+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

// JSON-LD is static schema markup (no user input) — same pattern as the other preset pages.
export default async function SahamVolumeSpikePage() {
  const { stocks, failed } = await fetchScreenerRows("volume_spike");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Volume Spike Hari Ini",
        description: "Daftar saham IDX dengan volume perdagangan melonjak diatas rata-rata.",
        url: `${SITE_URL}/saham-volume-spike`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu volume spike pada saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Volume spike terjadi ketika volume perdagangan saham melonjak jauh diatas rata-rata harian. Ini menandakan minat beli atau jual yang mendadak — sering kali dari institusi atau investor besar yang mulai mengakumulasi atau mendistribusikan.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah volume spike selalu berarti harga naik?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak. Volume spike hanya menandakan aktivitas meningkat. Volume naik + harga naik = akumulasi (bullish). Volume naik + harga turun = distribusi (bearish). Selalu cek arah harga dan konfirmasi indikator lain sebelum mengambil posisi.",
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
        title="Saham Volume Spike Hari Ini"
        description="Saham dengan volume perdagangan melonjak jauh diatas rata-rata — sinyal aktivitas institusi dan perubahan momentum. Update setiap 5 menit."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-4 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">📊 Mengapa volume spike penting?</strong> Pergerakan harga tanpa
          volume mudah berbalik. Volume spike menandakan uang besar masuk — konfirmasi terkuat untuk breakout,
          akumulasi, atau perubahan tren.
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
                    Belum ada saham volume spike saat ini. Cek lagi nanti.
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

          <RegisterCta slug="saham-volume-spike" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            🔍 Screener Lengkap
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            📈 Saham Golden Cross
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            💎 Saham Oversold
          </Link>
        </div>
      </div>
    </>
  );
}
