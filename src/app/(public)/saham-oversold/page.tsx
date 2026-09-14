import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { RegisterCta } from "@/components/signal/register-cta";
import Link from "next/link";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300; // 5 min ISR

export const metadata: Metadata = {
  title: "Saham Oversold Hari Ini — RSI Dibawah 30",
  description:
    "Daftar saham IDX oversold hari ini berdasarkan indikator RSI dibawah 30. Saham oversold berpotensi rebound — temukan peluang beli saham murah di Bursa Efek Indonesia.",
  alternates: { canonical: "/saham-oversold" },
  keywords: [
    "saham oversold hari ini",
    "saham rsi dibawah 30",
    "saham murah hari ini",
    "saham potensi rebound",
    "saham undervalued idx",
    "beli saham oversold",
    "rsi oversold saham indonesia",
    "saham diskon bursa efek",
  ],
  openGraph: {
    title: "Saham Oversold Hari Ini — RSI < 30 | TeknikalID",
    description:
      "Daftar saham IDX oversold (RSI < 30) yang berpotensi rebound. Temukan peluang beli saham murah.",
    url: `${SITE_URL}/saham-oversold`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Oversold+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamOversoldPage() {
  let stocks: Record<string, unknown>[] = [];
  try {
    const result = await technicalAnalysisService.screenerQuery("rsi_oversold");
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
        name: "Saham Oversold Hari Ini — RSI Dibawah 30",
        description:
          "Daftar saham IDX oversold (RSI < 30) yang berpotensi rebound.",
        url: `${SITE_URL}/saham-oversold`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham Oversold", item: `${SITE_URL}/saham-oversold` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham oversold?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham oversold adalah kondisi dimana harga saham turun terlalu jauh terhadap nilai fundamentalnya, biasanya ditandai dengan RSI dibawah 30. Kondisi ini berpotensi rebound atau koreksi naik.",
            },
          },
          {
            "@type": "Question",
            name: "Bagaimana cara menemukan saham oversold?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Gunakan indikator RSI (Relative Strength Index). Jika RSI dibawah 30, saham dianggap oversold. TeknikalID menyediakan screener gratis untuk menemukan saham oversold secara otomatis.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah saham oversold selalu naik?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Saham oversold berpotensi rebound, tapi bisa juga terus turun jika fundamental perusahaan buruk. Selalu lakukan analisa mendalam sebelum membeli.",
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
        title="Saham Oversold Hari Ini"
        description="Daftar saham IDX dengan RSI dibawah 30 — berpotensi rebound. Data update setiap 5 menit saat pasar buka."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong>💡 Apa itu saham oversold?</strong> Saham dikatakan oversold ketika RSI (Relative Strength Index)
          dibawah 30. Ini berarti harga turun terlalu cepat dan berpotensi naik kembali (rebound).
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">Saham oversold hari ini</strong> merujuk pada saham di Bursa Efek
            Indonesia (BEI) yang Relative Strength Index (RSI)-nya berada dibawah 30. RSI adalah indikator momentum
            berskala 0–100; nilai dibawah 30 menandakan tekanan jual yang berlebihan sehingga harga terkoreksi jauh
            dari nilai wajar. Secara historis, kondisi ini kering mendahului <em>rebound</em> atau pantulan harga
            jangka pendek karena tekanan jual mulai habis.
          </p>
          <p>
            Daftar di atas menampilkan saham IDX dengan RSI terendah secara real-time, diurutkan dari paling
            oversold. Setiap baris bisa diklik untuk membuka analisa teknikal lengkap — chart, sinyal MACD,
            Bollinger Bands, hingga rekomendasi level entry dan stop-loss otomatis. Gunakan daftar ini sebagai
            <em> watchlist</em> kandidat beli, bukan rekomendasi beli langsung.
          </p>
          <p>
            Penting untuk membedakan <strong className="text-text-primary">oversold teknikal</strong> dari
            <strong className="text-text-primary"> penurunan fundamental</strong>. Saham yang RSI-nya jatuh karena
            gorjetan pasar bisa jadi peluang rebound, sementara saham yang turun karena laporan keuangan buruk atau
            sanksi regulator berisiko terus melemah. Selalu konfirmasi dengan struktur pasar, volume, dan konteks
            berita sebelum mengambil posisi.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-text-primary">Strategi & Risiko Trading Saham Oversold</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Kapan masuk (entry)</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tunggu konfirmasi reversal — candlestick bullish (hammer, engulfing), RSI mulai naik dari titik
                terendahnya, atau harga ditahan di support kuat. Hindari <em>catching a falling knife</em>: beli
                begitu RSI dibawah 30 tanpa konfirmasi sering kali terjebak karena oversold bisa bertahan lama.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Manajemen risiko</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Pasang stop-loss ketat dibawah support terdekat — rebound oversold gagal bisa lanjut turun tajam.
                Batasi ukuran posisi (position sizing kecil) karena volatilitas tinggi. Target rasio risk/reward
                minimal 1:2. Jangan averaging down tanpa rencana yang jelas.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Pertanyaan Umum seputar Saham Oversold</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apa itu saham oversold?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Saham oversold adalah kondisi dimana harga saham turun terlalu jauh terhadap nilai fundamentalnya,
                biasanya ditandai dengan RSI dibawah 30. Kondisi ini berpotensi rebound atau koreksi naik.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Bagaimana cara menemukan saham oversold?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Gunakan indikator RSI (Relative Strength Index). Jika RSI dibawah 30, saham dianggap oversold.
                TeknikalID menyediakan screener gratis yang memperbarui daftar saham oversold IDX secara otomatis
                setiap 5 menit saat pasar buka.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apakah saham oversold selalu naik?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Tidak selalu. Saham oversold berpotensi rebound, tapi bisa juga terus turun jika fundamental
                perusahaan buruk atau ada sentimen negatif. Selalu lakukan analisa mendalam sebelum membeli.
              </p>
            </div>
          </div>
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
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada saham oversold saat ini. Cek lagi nanti saat pasar buka.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; rsi14: number | null };
                  return (
                    <tr key={s.ticker} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-4">
                        <Link href={`/stocks/${s.ticker}`} className="font-semibold text-blue-600 hover:underline">
                          {stripJk(s.ticker)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.name}</td>
                      <td className="py-2 pr-4">{s.close !== null ? formatPrice(s.close) : "—"}</td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>
                        {s.changePercent !== null ? formatPercent(s.changePercent) : "—"}
                      </td>
                      <td className={`py-2 pr-4 font-semibold ${s.rsi14 !== null ? rsiColor(s.rsi14) : ""}`}>
                        {s.rsi14 !== null ? s.rsi14.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <RegisterCta slug="saham-oversold" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/screener" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            🔍 Screener Lengkap
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            📈 Saham Golden Cross
          </Link>
          <Link href="/saham-macd-bullish" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            📈 Saham MACD Bullish
          </Link>
          <Link href="/saham-stochastic-oversold" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            🎯 Saham Stochastic Oversold
          </Link>
          <Link href="/saham-overbought" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            ⚠️ Saham Overbought
          </Link>
        </div>
      </div>
    </>
  );
}
