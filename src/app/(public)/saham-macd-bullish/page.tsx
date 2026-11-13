import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import { SITE_URL } from "@/lib/constants";
import { BookOpen, Search, Target, TrendingUp } from "lucide-react";
import { GuestStar } from "@/components/stock/guest-star";

 // 12 Okt: failed-bake 5mnt bikin 'tidak ada data' pasca-deploy; 30s self-heal // 5 min ISR

// force-dynamic (RCA 18 Okt): prerender build-time tanpa DB membekukan empty state
// ("Data sedang diperbarui") — ISR revalidate tidak pernah mengisi (pola /berita).
export const dynamic = "force-dynamic";

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
    title: "Saham MACD Bullish Hari Ini — Histogram MACD > 0",
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

  const topScored = [...stocks]
    .filter((s): s is typeof s & { ticker: string; signalScore: number } => {
      const row = s as { ticker?: string; signalScore?: number | null };
      return typeof row.signalScore === "number" && Number.isFinite(row.signalScore);
    })
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 3);
  const topScoredText = topScored.length > 0
    ? ` · 3 skor tertinggi hari ini: ${topScored.map((s) => `${stripJk(s.ticker)} (${s.signalScore > 0 ? "+" : ""}${formatDecimalId(s.signalScore, 2)})`).join(", ")}`
    : "";

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD from a hardcoded trusted object literal (no user input) — same pattern as /saham-oversold, /akademi, stocks pages.
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <PageHero
        eyebrow="Saham IDX"
        title="Saham MACD Bullish Hari Ini"
        description="Daftar saham IDX dengan histogram MACD di atas nol — momentum beli sedang menguat. Dihitung dari data penutupan &amp; sesi terakhir BEI."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-bullish/30 bg-bullish/5 p-4 text-sm text-text-secondary">
          <strong className="text-text-primary"> Apa itu MACD bullish?</strong> MACD (Moving Average Convergence Divergence) bullish terjadi
          ketika histogram MACD berada di atas nol — artinya garis MACD berada di atas garis sinyal dan momentum
          beli sedang menguat.
        </div>

        <div className="mt-4">
          <p className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary" data-seo-dr="live-count">
            Per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })},
            terdapat <strong className="text-text-primary">{stocks.length} saham aktif BEI</strong> yang lolos
            saringan ini (sudah difilter dari saham gorengan){topScoredText} — daftar lengkap di bawah, gratis tanpa login.
          </p>
        </div>

        {/* Tabel Saham di atas fold */}
        <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabel Saham MACD Bullish">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">Ticker</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Nama</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Harga</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Perubahan</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Skor Sinyal</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Pantau</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary">
                    Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary">
                    Belum ada saham MACD bullish saat ini. Cek lagi nanti saat pasar buka.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; signalScore: number | null };
                  return (
                    <tr key={s.ticker} className="border-b hover:bg-bg-hover/50">
                      <td className="py-2 pr-4">
                        <Link href={`/stocks/${s.ticker}`} className="font-semibold text-accent hover:underline inline-block py-1.5">
                          {stripJk(s.ticker)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{s.name}</td>
                      <td className="py-2 pr-4"><span data-live-price={(s ?? stock).ticker}>{s.close !== null ? formatPrice(s.close) : "—"}</span></td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>
                        {s.changePercent !== null ? formatPercent(s.changePercent) : "—"}
                      </td>
                      <td className={`py-2 pr-4 font-mono tabular-nums ${s.signalScore !== null ? (s.signalScore > 0 ? "text-bullish" : s.signalScore < 0 ? "text-bearish" : "") : ""}`}>
                        {s.signalScore !== null ? (s.signalScore > 0 ? `+${formatDecimalId(s.signalScore, 2)}` : formatDecimalId(s.signalScore, 2)) : "—"}
                      </td>
                      <td className="py-2 pr-4"><GuestStar ticker={s.ticker} compact /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="mt-4">
            <a
              href="https://t.me/TeknikalidAgentBot?start=web_screener_tematik"
              target="_blank"
              rel="noopener noreferrer"
              data-engagement="tg_subscribe_click"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 shrink-0"><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/><path d="M10.268 21a2 2 0 0 0 3.464 0"/></svg>Dapatkan notifikasi sinyal harian via Telegram →
            </a>
          </div>
        </div>

        <AskAiCta question="MACD bullish ada?" />

        {/* Strategi & Risiko — folded into details */}
        <details className="mt-8 group rounded-xl border border-border/70 bg-bg-card p-5">
          <summary className="cursor-pointer font-semibold text-text-primary flex items-center justify-between list-none">
            <h2 className="text-base font-bold text-text-primary">Strategi &amp; Risiko Trading MACD Bullish</h2>
            <span className="text-text-tertiary text-xs transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-4 pt-4 border-t border-border/40 space-y-6">
            <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
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
        </details>

        {/* FAQ — folded into details */}
        <details className="mt-4 group rounded-xl border border-border/70 bg-bg-card p-5">
          <summary className="cursor-pointer font-semibold text-text-primary flex items-center justify-between list-none">
            <h2 className="text-base font-bold text-text-primary">Pertanyaan Umum seputar Saham MACD Bullish</h2>
            <span className="text-text-tertiary text-xs transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
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
        </details>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            <Search className="inline h-4 w-4" /> Screener Lengkap
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <TrendingUp className="inline h-4 w-4" /> Saham Golden Cross
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <Target className="inline h-4 w-4" /> Saham Oversold (RSI &lt; 30)
          </Link>
          <Link href="/akademi/cara-membaca-macd-saham-panduan-trader-pemula" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <BookOpen className="inline h-4 w-4" /> Belajar MACD
          </Link>
        </div>
      </div>
    </>
  );
}
