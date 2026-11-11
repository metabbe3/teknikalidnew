import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { formatDecimalId } from "@/lib/format-number";
import { getRadarScanData, type RadarItem } from "@/domains/stock/radar-scanner.service";
import { SITE_URL } from "@/lib/constants";
import { Radar, ArrowUpRight, TrendingUp, ShieldCheck, Activity, HelpCircle } from "lucide-react";
import { TelegramSubscribeCta } from "@/components/telegram/subscribe-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IDX Radar — Sinyal & Skor Saham Hari Ini | TeknikalID",
  description:
    "Pantau radar saham IDX hari ini: filter value, EMA cross, dan akumulasi asing otomatis untuk emiten BEI. Skor sinyal kuantitatif & update tiap sesi bursa.",
  alternates: { canonical: `${SITE_URL}/radar` },
  keywords: [
    "idx radar",
    "radar saham idx",
    "sinyal saham hari ini",
    "screener radar saham",
    "ema cross saham",
    "akumulasi asing saham",
    "value saham idx",
    "skor teknikal saham",
    "radar bursa efek indonesia",
  ],
  openGraph: {
    title: "IDX Radar — Sinyal & Skor Saham Hari Ini | TeknikalID",
    description:
      "Pantau radar saham IDX hari ini: filter value, EMA cross, dan akumulasi asing otomatis untuk emiten BEI. Skor sinyal kuantitatif & update tiap sesi bursa.",
    url: `${SITE_URL}/radar`,
    images: [{ url: `${SITE_URL}/api/og?title=IDX+Radar+Sinyal+Saham+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IDX Radar — Sinyal & Skor Saham Hari Ini | TeknikalID",
    description:
      "Pantau radar saham IDX hari ini: filter value, EMA cross, dan akumulasi asing otomatis untuk emiten BEI. Skor sinyal kuantitatif & update tiap sesi bursa.",
  },
};

const CATEGORY_CONFIG: Record<
  RadarItem["cat"],
  { label: string; badgeClass: string; desc: string }
> = {
  value: {
    label: "Value",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    desc: "Valuasi murah didukung konfirmasi teknikal positif",
  },
  cross: {
    label: "EMA Cross",
    badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    desc: "Perubahan arah tren jangka pendek (EMA12/EMA26)",
  },
  foreign: {
    label: "Akumulasi Asing",
    badgeClass: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    desc: "Aliran dana net foreign buy konsisten beberapa sesi",
  },
};

export default async function RadarPage() {
  const { radar, generatedWib, session } = await getRadarScanData();
  const top20 = radar.slice(0, 20);

  const valueCount = radar.filter((r) => r.cat === "value").length;
  const crossCount = radar.filter((r) => r.cat === "cross").length;
  const foreignCount = radar.filter((r) => r.cat === "foreign").length;

  const sessionLabel =
    session === "pagi"
      ? "Sesi Pagi (Pra-Pembukaan)"
      : session === "sore"
        ? "Sesi Sore (Pasca-Penutupan)"
        : "Sesi Terakhir";

  const faqData = [
    {
      q: "Apa itu IDX Radar teknikal.id?",
      a: "IDX Radar teknikal.id adalah sistem pemindai algoritmik independen yang memfilter seluruh emiten aktif di Bursa Efek Indonesia (BEI) secara otomatis. Radar ini mengelompokkan kandidat saham ke dalam tiga pilar analitis utama: saham value dengan valuasi murah dan momentum sehat, saham yang baru saja membentuk konfirmasi tren baru melalui EMA cross, serta saham yang mencatatkan akumulasi dana investor asing secara signifikan. Sistem ini telah menyaring saham tidak likuid dan saham tidur agar investor dapat fokus pada emiten berbobot.",
    },
    {
      q: "Seberapa sering radar diperbarui?",
      a: "IDX Radar diperbarui dua kali setiap hari bursa: sesi pagi sebelum pasar dibuka (sekitar pukul 06:45 WIB) untuk memetakan peluang pra-pembukaan, dan sesi sore setelah penutupan perdagangan bursa (sekitar pukul 18:30 WIB) guna merekam data resmi penutupan (EOD), perubahan indikator teknikal harian, serta rekapitulasi aliran dana investor asing secara menyeluruh.",
    },
    {
      q: "Apakah sinyal radar rekomendasi beli?",
      a: "Bukan. Seluruh informasi yang ditampilkan di IDX Radar bersifat edukatif dan merupakan hasil pemindaian kuantitatif murni berbasis algoritma statistik, bukan merupakan anjuran, rekomendasi beli, ataupun ajakan transaksi efek tertentu. Setiap keputusan investasi sepenuhnya menjadi tanggung jawab masing-masing pelaku pasar. Anda disarankan melakukan riset mandiri, memadukan analisis teknikal dan fundamental, serta menerapkan manajemen risiko yang disiplin seperti rasio risiko terhadap keuntungan (risk-to-reward ratio) dan batas stop loss.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/radar#webpage`,
        url: `${SITE_URL}/radar`,
        name: "IDX Radar — Sinyal & Skor Saham Hari Ini | TeknikalID",
        description:
          "Pantau radar saham IDX hari ini: filter value, EMA cross, dan akumulasi asing otomatis untuk emiten BEI. Skor sinyal kuantitatif & update tiap sesi bursa.",
        inLanguage: "id-ID",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "IDX Radar", item: `${SITE_URL}/radar` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqData.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* Header Hero Section */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
            <nav className="mb-4 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <Link href="/" className="hover:text-foreground transition-colors">
                    Beranda
                  </Link>
                </li>
                <li>/</li>
                <li className="font-medium text-foreground">IDX Radar</li>
              </ol>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                  <Radar className="h-3.5 w-3.5 animate-pulse" aria-hidden />
                  Algorithmic Market Scanner BEI
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  IDX Radar<span className="sr-only"> — Sinyal Saham Hari Ini</span>
                </h1>
                <p className="mt-2 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Pemindaian algoritmik saham Bursa Efek Indonesia secara objektif setiap sesi perdagangan bursa. 
                  Temukan kandidat saham value fundamental, konfirmasi tren Exponential Moving Average (EMA cross), 
                  serta pola akumulasi dana institusi asing tanpa perlu memilah ratusan grafik secara manual.
                </p>
              </div>

              {generatedWib && (
                <div className="shrink-0 rounded-xl border border-border bg-background p-4 text-left md:text-right shadow-sm">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Status Pemindaian
                  </span>
                  <span className="block text-sm font-bold text-foreground">
                    {sessionLabel}
                  </span>
                  <span className="block text-xs font-mono text-muted-foreground mt-0.5">
                    {generatedWib} WIB
                  </span>
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Kandidat Value</span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {valueCount} Saham
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saham berfundamental solid dengan valuasi atraktif dan momentum pemulihan teknikal.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">EMA Crossover</span>
                  <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {crossCount} Saham
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Persilangan garis rata-rata eksponensial jangka pendek menandakan akselerasi arah tren baru.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Akumulasi Asing</span>
                  <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-700">
                    {foreignCount} Saham
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Emiten dengan aliran modal bersih (net foreign inflow) positif terakumulasi berturut-turut.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Body */}
        <main className="mx-auto max-w-6xl px-4 py-10 space-y-12">
          {/* Editorial Intro 2 Paragraphs */}
          <section className="space-y-4 max-w-4xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">IDX Radar TeknikalID</strong> adalah instrumen riset pasar yang 
              dirancang khusus bagi para pelaku pasar modal Indonesia untuk mendeteksi anomali harga dan sinyal teknikal 
              secara cepat. Di tengah lebih dari 900 emiten yang tercatat di Bursa Efek Indonesia, memeriksa grafik satu per 
              satu setiap hari membutuhkan waktu yang sangat intensif. IDX Radar memecahkan tantangan tersebut dengan 
              menjalankan filter multi-faktor otomatis yang mengevaluasi struktur harga, indikator momentum, rata-rata bergerak 
              eksponensial, serta neraca transaksi pemodal asing. Seluruh emiten diuji melalui penyaring likuiditas ketat 
              sehingga saham berkarakteristik gorengan, saham tidur berlikuiditas rendah, dan saham papan pemantauan khusus 
              yang tidak wajar langsung disisihkan dari radar.
            </p>
            <p>
              Pembaruan data pada radar dilakukan secara berkala pada setiap sesi bursa. Sesi pagi menyediakan tinjauan 
              pra-pembukaan sebelum bel perdagangan berbunyi, sedangkan sesi sore menyajikan kalkulasi final berbasis data 
              penutupan resmi (<em className="italic">End of Day / EOD</em>). Skor sinyal yang dihasilkan menggabungkan bobot 
              Relative Strength Index (RSI), posisi harga terhadap Moving Average, histogram MACD, hingga konfirmasi lonjakan volume. 
              Dengan pendekatan berbasis data kuantitatif yang objektif tanpa bias emosional, investor dan swing trader dapat 
              dengan mudah menyaring peluang potensial yang siap dipantau lebih lanjut ke dalam daftar pantauan (<em className="italic">watchlist</em>) pribadi.
            </p>
          </section>

          {/* Table Top 20 Results */}
          <section aria-labelledby="radar-table-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 id="radar-table-heading" className="text-xl sm:text-2xl font-bold text-foreground">
                  Tabel Hasil Pemindaian Teratas (Top 20 Radar)
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Daftar saham lolos saringan algoritmik sesi ini lengkap dengan kategori, sinyal, dan skor kuantitatif.
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Menampilkan {top20.length} dari {radar.length} kandidat
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">Ticker</th>
                    <th scope="col" className="py-3 px-4">Nama Perusahaan</th>
                    <th scope="col" className="py-3 px-4">Kategori Radar</th>
                    <th scope="col" className="py-3 px-4">Keterangan / Sinyal</th>
                    <th scope="col" className="py-3 px-4 text-right">Skor Sinyal</th>
                    <th scope="col" className="py-3 px-4 text-center">Analisis Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {top20.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Belum ada data scan radar untuk sesi saat ini atau proses pembaruan sedang berlangsung. Silakan cek kembali saat sesi bursa berikutnya.
                      </td>
                    </tr>
                  ) : (
                    top20.map((row) => {
                      const catConfig = CATEGORY_CONFIG[row.cat];
                      return (
                        <tr key={`${row.ticker}-${row.cat}`} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <Link
                              href={`/stocks/${row.ticker}.JK`}
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {row.ticker}
                              <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden />
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground text-xs sm:text-sm max-w-[220px] truncate">
                            {row.name ?? "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${catConfig.badgeClass}`}
                            >
                              {catConfig.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs sm:text-sm text-foreground">
                            <div className="space-y-0.5">
                              <div>{row.signalLabel ?? "Sinyal Aktif"}</div>
                              {(row.note || row.pe) && (
                                <div className="text-[11px] text-muted-foreground">
                                  {row.note ? row.note : ""}
                                  {row.note && row.pe ? " · " : ""}
                                  {row.pe ? `PER ${row.pe}x` : ""}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-xs sm:text-sm">
                            {typeof row.signalScore === "number" ? (
                              <span
                                className={
                                  row.signalScore > 0
                                    ? "text-emerald-600 font-bold"
                                    : row.signalScore < 0
                                      ? "text-rose-600 font-bold"
                                      : "text-muted-foreground"
                                }
                              >
                                {row.signalScore > 0 ? "+" : ""}
                                {formatDecimalId(row.signalScore, 2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Link
                              href={`/stocks/${row.ticker}.JK`}
                              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-primary transition-colors"
                            >
                              Buka Chart
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Skor sinyal berkisar antara -1.00 (sangat melemah) hingga +1.00 (sangat menguat), dihitung dari komposit sembilan indikator teknikal utama.
            </p>
          </section>

          {/* Educational Framework: 3 Pillars */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Tiga Pilar Pemindaian Algoritmik IDX Radar
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Memahami logika matematika dan fundamental di balik setiap kategori pemindaian.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-bold text-foreground">1. Kategori Value &amp; Fundamental</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Kategori ini menyaring emiten yang memiliki rasio valuasi murah (Price to Earnings Ratio dan Price to Book Value di bawah rata-rata industrinya) 
                  namun telah memperlihatkan pembalikan arah momentum teknikal positif. Pendekatan ini meminimalkan risiko jebakan nilai (<em className="italic">value trap</em>) 
                  karena saham yang dibeli tidak sedang dalam fase penurunan bebas (<em className="italic">falling knife</em>), melainkan telah mulai mengumpulkan tenaga pembeli.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <TrendingUp className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-bold text-foreground">2. Kategori EMA Crossover</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Moving average eksponensial memberikan bobot lebih berat pada pergerakan harga terkini. Ketika garis rata-rata eksponensial jangka pendek 
                  (EMA12) memotong ke atas garis rata-rata jangka menengah (EMA26), sistem mendeteksi sinyal <em className="italic">EMA Bullish Cross</em>. 
                  Sinyal ini sering kali menjadi tanda awal terbentuknya tren naik baru sebelum dikonfirmasi oleh indikator jangka panjang seperti Golden Cross SMA50/SMA200.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <Activity className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-bold text-foreground">3. Kategori Akumulasi Asing</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Arus dana institusi asing memiliki pengaruh likuiditas yang signifikan terhadap saham-saham berkapitalisasi menengah dan besar di BEI. 
                  Radar mengakumulasi data transaksi beli bersih (<em className="italic">net foreign buy</em>) selama rentang sesi beruntun untuk menemukan saham 
                  yang secara konsisten dikoleksi oleh dana besar (<em className="italic">smart money</em>), meskipun harga di pasar reguler belum mengalami lonjakan drastis.
                </p>
              </div>
            </div>
          </section>

          {/* Practical Guide on Trading Strategy */}
          <section className="rounded-2xl border border-border bg-muted/20 p-6 sm:p-8 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              Panduan Menggunakan IDX Radar dalam Eksekusi Trading
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>
                Hasil pemindaian radar sebaiknya tidak diperlakukan sebagai sinyal instan untuk langsung melakukan pembelian tanpa kalkulasi matang. 
                Gunakan daftar saham hasil radar sebagai langkah awal (<em className="italic">top-down screening</em>) untuk mempersempit semesta pencarian dari 900+ saham menjadi segelintir saham potensial.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Verifikasi Level Kunci:</strong> Buka tautan chart emiten bersangkutan di TeknikalID untuk melihat level support dan resistance historis, garis Fibonacci retracement, serta batas Pivot Points harian.
                </li>
                <li>
                  <strong className="text-foreground">Tentukan Batas Stop Loss:</strong> Tetapkan batas toleransi risiko maksimal (misalnya 3%–5% di bawah swing low terdekat atau 1.5× ATR) sebelum membuka posisi. Hindari menahan posisi rugi melebihi rencana awal.
                </li>
                <li>
                  <strong className="text-foreground">Periksa Kalender Perusahaan:</strong> Pastikan tidak ada pengumuman aksi korporasi besar mendadak, publikasi laporan keuangan kuartalan yang mengecewakan, atau pembagian dividen dalam waktu dekat yang dapat memicu lonjakan volatilitas tak terduga.
                </li>
              </ul>
            </div>
          </section>

          {/* FAQ Section */}
          <section aria-labelledby="faq-heading" className="space-y-6">
            <div className="border-b border-border pb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
              <h2 id="faq-heading" className="text-xl sm:text-2xl font-bold text-foreground">
                Pertanyaan yang Sering Diajukan (FAQ)
              </h2>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {faqData.map((faq, index) => (
                <div key={index} className="p-5 sm:p-6 space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {faq.q}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Community & Bot CTA */}
          <section className="pt-4">
            <TelegramSubscribeCta />
          </section>
        </main>
      </div>
    </>
  );
}
