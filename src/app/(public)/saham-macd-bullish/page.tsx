import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300; // 5 min ISR

export const metadata: Metadata = {
  title: "Saham MACD Bullish Hari Ini — Histogram MACD Positif",
  description:
    "Daftar saham IDX dengan MACD bullish hari ini (histogram MACD di atas nol). Sinyal momentum beli — temukan saham yang momentum naiknya menguat di Bursa Efek Indonesia.",
  alternates: { canonical: "/saham-macd-bullish" },
  keywords: [
    "saham macd bullish hari ini",
    "saham histogram macd positif",
    "saham momentum naik",
    "sinyal beli macd",
    "screener macd saham",
    "saham bullish idx",
    "macd crossover saham indonesia",
    "daftar saham macd positif",
  ],
  openGraph: {
    title: "Saham MACD Bullish Hari Ini — Histogram MACD > 0 | TeknikalID",
    description:
      "Daftar saham IDX dengan histogram MACD positif — momentum beli sedang menguat. Update setiap 5 menit saat pasar buka.",
    url: `${SITE_URL}/saham-macd-bullish`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+MACD+Bullish+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamMacdBullishPage() {
  const { stocks, failed } = await fetchScreenerRows("macd_bullish");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham MACD Bullish Hari Ini — Histogram MACD Positif",
        description:
          "Daftar saham IDX dengan histogram MACD di atas nol — momentum beli menguat.",
        url: `${SITE_URL}/saham-macd-bullish`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham MACD Bullish", item: `${SITE_URL}/saham-macd-bullish` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham MACD bullish?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham MACD bullish adalah saham yang histogram MACD-nya berada di atas nol (positif). Histogram positif berarti garis MACD berada di atas garis sinyal, menandakan momentum beli sedang menguat dan biasanya mendahului pergerakan harga naik.",
            },
          },
          {
            "@type": "Question",
            name: "Bagaimana cara membaca histogram MACD?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Histogram MACD adalah jarak antara garis MACD dan garis sinyal. Jika histogram di atas nol dan membesar, momentum naik semakin kuat. Jika histogram di atas nol tapi mengecil, momentum mulai melemah meski tren masih bullish.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah MACD bullish selalu berarti harga akan naik?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. MACD bullish menunjukkan momentum beli menguat, tapi bisa terjadi divergensi (harga naik tapi momentum melemah) atau sinyal palsu di pasar sideways. Konfirmasi dengan volume, struktur tren, dan indikator lain sebelum mengambil posisi.",
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
        // JSON-LD from a hardcoded trusted object literal (no user input) — same pattern as /saham-oversold, /akademi, stocks pages.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        eyebrow="Saham IDX"
        title="Saham MACD Bullish Hari Ini"
        description="Daftar saham IDX dengan histogram MACD di atas nol — momentum beli sedang menguat. Data update setiap 5 menit saat pasar buka."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <strong>📈 Apa itu MACD bullish?</strong> MACD (Moving Average Convergence Divergence) bullish terjadi
          ketika histogram MACD berada di atas nol — artinya garis MACD berada di atas garis sinyal dan momentum
          beli sedang menguat.
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">Saham MACD bullish hari ini</strong> merujuk pada saham di Bursa
            Efek Indonesia (BEI) yang histogram MACD-nya bernilai positif. MACD mengukur jarak antara dua moving
            average (biasanya EMA 12 dan EMA 26); ketika histogram berada di atas nol, momentum jangka pendek
            bergerak lebih cepat ke atas daripada momentum jangka menengah — sinyal klasik bahwa tekanan beli
            sedang dominan. Daftar ini menampilkan saham dengan histogram MACD positif secara real-time, sebagai
            kandidat <em>watchlist</em> untuk tren naik.
          </p>
          <p>
            Yang membedakan MACD dari RSI: MACD adalah indikator <em>trend-following/momentum</em>, bukan oscillator
            berskala 0–100. Histogram positif tidak otomatis berarti &ldquo;murah&rdquo; atau &ldquo;akan rebound&rdquo; —
            justru sebaliknya, ia mengonfirmasi bahwa tren naik sedang aktif. Trader tren menggunakannya untuk
            tetap berada di sisi arah pasar, sementara trader kontrarian justru mungkin menunggu sinyal
            <em> overbought</em> (RSI &gt; 70) sebelum take-profit.
          </p>
          <p>
            Perhatikan juga <strong className="text-text-primary">bentuk histogram</strong>: histogram yang positif
            tapi mengecil merupakan peringatan awal melemahnya momentum (divergensi), meski tren teknikal masih
            terlihat bullish. Selalu padukan dengan volume — momentum yang didukung volume tinggi lebih
            terpercaya daripada momentum di pasar tipis.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-text-primary">Strategi & Risiko Trading MACD Bullish</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Kapan masuk (entry)</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Sinyal paling kuat adalah <em>crossover</em>: garis MACD memotong garis sinyal ke atas sehingga
                histogram berubah dari negatif ke positif. Tunggu konfirmasi candlestick bullish di atas support
                atau SMA50. Entry setelah histogram baru saja berputar positif (bukan saat sudah positif berhari-hari
                dan mulai mengecil) memberikan rasio risk/reward lebih baik.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Manajemen risiko</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                MACD adalah indikator lagging — sinyal terlambat dari pembalikan harga, sehingga stop-loss wajib.
                Pasang stop di bawah swing-low terdekat atau SMA20. Waspadai divergensi bearish (harga baru tinggi
                tapi histogram lebih rendah dari puncak sebelumnya) — itu sinyal momentum mulai melemah meski harga
                masih naik. Hindari mengejar saham yang sudah jauh naik saat histogram mulai menipis.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Pertanyaan Umum seputar Saham MACD Bullish</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apa itu saham MACD bullish?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Saham MACD bullish adalah saham yang histogram MACD-nya di atas nol (positif), menandakan garis
                MACD di atas garis sinyal dan momentum beli sedang menguat.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Bagaimana cara membaca histogram MACD?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Histogram di atas nol dan membesar = momentum naik menguat. Histogram di atas nol tapi mengecil =
                momentum mulai melemah meski tren masih bullish.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Apakah MACD bullish selalu berarti harga naik?</h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Tidak. MACD bullish menunjukkan momentum beli menguat, tapi bisa terjadi divergensi atau sinyal
                palsu di pasar sideways. Konfirmasi dengan volume dan indikator lain sebelum mengambil posisi.
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
                    Belum ada saham MACD bullish saat ini. Cek lagi nanti saat pasar buka.
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
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            📈 Saham Golden Cross
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            🎯 Saham Oversold (RSI &lt; 30)
          </Link>
          <Link href="/akademi/cara-membaca-macd-saham-panduan-trader-pemula" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            📚 Belajar MACD
          </Link>
        </div>
      </div>
    </>
  );
}
