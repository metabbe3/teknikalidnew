import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300; // 5 min ISR

export const metadata: Metadata = {
  title: "Saham Stochastic Oversold Hari Ini — %K & %D Dibawah 20",
  description:
    "Daftar saham IDX stochastic oversold hari ini (%K dan %D dibawah 20). Sinyal pantau peluang reversal beli — temukan saham yang tekanan jualnya mulai habis di Bursa Efek Indonesia.",
  alternates: { canonical: "/saham-stochastic-oversold" },
  keywords: [
    "saham stochastic oversold hari ini",
    "saham stoch dibawah 20",
    "saham %k %d rendah",
    "sinyal beli stochastic",
    "screener stochastic saham",
    "saham potensi reversal",
    "stochastic oscillator indonesia",
    "daftar saham stoch oversold",
  ],
  openGraph: {
    title: "Saham Stochastic Oversold Hari Ini — %K & %D < 20 | TeknikalID",
    description:
      "Daftar saham IDX dengan Stochastic %K dan %D dibawah 20 — potensi reversal naik. Update setiap 5 menit saat pasar buka.",
    url: `${SITE_URL}/saham-stochastic-oversold`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Stochastic+Oversold+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamStochasticOversoldPage() {
  const { stocks, failed } = await fetchScreenerRows("stoch_oversold");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Stochastic Oversold Hari Ini — %K & %D Dibawah 20",
        description:
          "Daftar saham IDX dengan Stochastic %K dan %D dibawah 20 — potensi reversal naik.",
        url: `${SITE_URL}/saham-stochastic-oversold`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham Stochastic Oversold", item: `${SITE_URL}/saham-stochastic-oversold` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham stochastic oversold?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham stochastic oversold adalah saham yang garis %K dan %D indikator Stochastic Oscillator-nya berada dibawah 20. Ini berarti harga tertutup di bagian bawah range terkininya — tekanan jual sangat kuat dan berpotensi segera rebound.",
            },
          },
          {
            "@type": "Question",
            name: "Apa beda Stochastic oversold dengan RSI oversold?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Keduanya mendeteksi tekanan jual berlebih, tapi dengan cara berbeda. RSI mengukur kecepatan perubahan harga, Stochastic mengukur posisi harga tertutup relatif terhadap range tinggi-rendah. Bila keduanya oversold sekaligus, sinyal reversal cenderung lebih kuat.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah stochastic oversold selalu berarti harga naik?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak. Di tren turun kuat, Stochastic bisa bertahan dibawah 20 lama (stik oversold). Tunggu %K memotong %D ke atas sebagai konfirmasi, dan hindari mentah-mentah membeli begitu Stochastic dibawah 20.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD from a hardcoded trusted object literal (no user input) — same pattern as /saham-oversold.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        eyebrow="Saham IDX"
        title="Saham Stochastic Oversold Hari Ini"
        description="Daftar saham IDX dengan Stochastic %K dan %D dibawah 20 — potensi reversal naik. Data update setiap 5 menit saat pasar buka."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong>🎯 Apa itu stochastic oversold?</strong> Stochastic Oscillator mengukur di mana harga tertutup
          relatif terhadap range tinggi–rendah tertentu. Bila %K dan %D dibawah 20, harga tertutup di bagian
          bawah range — tekanan jual berlebih dan potensi rebound mulai muncul.
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">Saham stochastic oversold hari ini</strong> merujuk pada saham di
            Bursa Efek Indonesia (BEI) yang garis %K maupun %D pada Stochastic Oscillator-nya berada dibawah 20.
            Berbeda dengan RSI yang mengukur kecepatan perubahan harga, Stochastic membandingkan harga penutupan
            terakhir terhadap range tertinggi–terendah dalam periode tertentu (biasanya 14 hari). Nilai dibawah 20
            berarti harga menutup sangat dekat ke titik terendah range-nya — sinyal klasik tekanan jual yang habis.
          </p>
          <p>
            Trader reversal memanfaatkan kondisi ini untuk mengidentifikasi titik beli potensial: ketika %K
            memotong %D ke atas dari zona dibawah 20, sering muncul pantulan harga jangka pendek. Kekuatan sinyal
            meningkat bila konfirmasi datang dari indikator lain — misalnya RSI yang juga oversold, candlestick
            reversal (hammer, bullish engulfing), atau harga berhenti di level support kuat.
          </p>
          <p>
            Yang harus diwaspadai: di <strong className="text-text-primary">tren turun yang kuat</strong>, Stochastic
            bisa tertahan dibawah 20 selama berhari-hari (stik oversold) — membeli terlalu cepat berisiko
            &ldquo;menangkap pisau jatuh&rdquo;. Selalu tunggu persilangan %K/%D ke atas dan padukan dengan volume
            serta struktur pasar sebelum mengambil posisi.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-text-primary">Strategi & Risiko Trading Stochastic Oversold</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Kapan masuk (entry)</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Sinyal terkuat adalah <em>%K memotong %D ke atas</em> dari zona dibawah 20, terutama bila disertai
                divergensi bullish (harga membuat low lebih rendah tapi Stochastic membuat low lebih tinggi). Tunggu
                candlestick bullish penutup sebagai konfirmasi akhir. Entry paling aman saat harga ditahan di support
                kuat dan volume mulai meningkat.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Manajemen risiko</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Pasang stop-loss ketat dibawah swing-low terdekat — reversal stochastic gagal bisa lanjut turun
                tajam di pasar trending. Posisi kecil (position sizing) karena volatilitas tinggi, target risk/reward
                minimal 1:2. Jangan averaging down tanpa rencana. Hindari membeli saham gorengan yang hanya oversold
                karena manipulasi pasar.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Pertanyaan Umum seputar Saham Stochastic Oversold</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apa itu saham stochastic oversold?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Saham yang garis %K dan %D Stochastic Oscillator-nya dibawah 20 — harga tertutup di bawah range-nya,
                tekanan jual berlebih, berpotensi rebound.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apa beda Stochastic oversold dengan RSI oversold?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                RSI mengukur kecepatan perubahan harga; Stochastic mengukur posisi penutupan vs range tinggi–rendah.
                Bila keduanya oversold sekaligus, sinyal reversal lebih kuat.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apakah stochastic oversold selalu berarti harga naik?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Tidak. Di tren turun kuat Stochastic bisa bertahan dibawah 20 lama. Tunggu %K memotong %D ke atas
                sebagai konfirmasi sebelum membeli.
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
                <th className="py-2 pr-4 font-semibold">Sinyal</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada saham stochastic oversold saat ini. Cek lagi nanti saat pasar buka.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; rsi14: number | null; signalLabel: string | null };
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
                      <td className="py-2 pr-4 text-muted-foreground">{s.signalLabel ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/screener" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            🔍 Screener Lengkap
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            🎯 Saham RSI Oversold (&lt; 30)
          </Link>
          <Link href="/saham-macd-bullish" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            📈 Saham MACD Bullish
          </Link>
          <Link href="/akademi/stochastic-oscillator-cara-membaca-dan-strategi" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            📚 Belajar Stochastic
          </Link>
        </div>
      </div>
    </>
  );
}
