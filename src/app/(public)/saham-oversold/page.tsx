import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { ConditionHistory } from "@/components/signal/condition-history";
import { TermTip } from "@/components/seo/term-tip";
import { getConditionBacktest } from "@/lib/condition-backtest.service";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import { SITE_URL } from "@/lib/constants";
import { AlertTriangle, Search, Target, TrendingUp } from "lucide-react";
import { GuestStar } from "@/components/stock/guest-star";

 // 12 Okt: failed-bake 5mnt bikin 'tidak ada data' pasca-deploy; 30s self-heal // 5 min ISR

// force-dynamic (RCA 18 Okt): prerender build-time tanpa DB membekukan empty state
// ("Data sedang diperbarui") — ISR revalidate tidak pernah mengisi (pola /berita).
export const dynamic = "force-dynamic";

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
    title: "Saham Oversold Hari Ini — RSI < 30",
    description:
      "Daftar saham IDX oversold (RSI < 30) yang berpotensi rebound. Temukan peluang beli saham murah.",
    url: `${SITE_URL}/saham-oversold`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Oversold+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamOversoldPage() {
  const { stocks, failed } = await fetchScreenerRows("rsi_oversold");
  // prd-2026-10-31-01: riwayat & backtest kondisi — fail-diam (section tak
  // muncul bila query error; halaman utama tetap render).
  let conditionHistory: Awaited<ReturnType<typeof getConditionBacktest>> | null = null;
  try {
    conditionHistory = await getConditionBacktest("rsi_oversold");
  } catch (e) {
    console.error("[condition-history] gagal:", e instanceof Error ? e.message : e);
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <PageHero
        eyebrow="Saham IDX"
        title="Saham Oversold Hari Ini"
        description="Daftar saham IDX dengan RSI dibawah 30 — berpotensi rebound. Dihitung dari data penutupan &amp; sesi terakhir BEI."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-bullish/30 bg-bullish/5 p-4 text-sm text-text-secondary">
          <strong className="text-text-primary"> Apa itu saham <TermTip term="oversold">oversold</TermTip>?</strong> Saham dikatakan oversold ketika <TermTip term="rsi">RSI (Relative Strength Index)</TermTip>
          dibawah 30. Ini berarti harga turun terlalu cepat dan berpotensi naik kembali (rebound).
        </div>

        <div className="mt-4">
          <p className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary" data-seo-dr="live-count">
            Per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })},
            terdapat <strong className="text-text-primary">{stocks.length} saham aktif BEI</strong> yang lolos
            saringan ini (sudah difilter dari saham gorengan){topScoredText} — daftar lengkap di bawah, gratis tanpa login.
          </p>
        </div>

        {/* Tabel Saham di atas fold */}
        <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabel Saham Oversold">
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
                    Belum ada saham oversold saat ini. Cek lagi nanti saat pasar buka.
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

          <ConditionHistory result={conditionHistory} />

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

        <AskAiCta question="Saham oversold murah ada?" />

        <Link
          href="/swing"
          data-engagement="crosslink_oversold_swing"
          className="mt-8 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 hover:border-accent/60 p-4 transition-colors"
        >
          <span className="text-xs text-text-secondary leading-relaxed">
            Lebih suka tunggu konfirmasi tren? Lihat <strong className="text-text-primary">Setup Swing Hari Ini</strong> — kandidat skor sinyal tertinggi dengan level entry &amp; stop dari ATR, plus bukti backtest.
          </span>
          <span className="text-accent text-lg" aria-hidden>→</span>
        </Link>

        {/* Strategi & Risiko — folded into details */}
        <details className="mt-8 group rounded-xl border border-border/70 bg-bg-card p-5">
          <summary className="cursor-pointer font-semibold text-text-primary flex items-center justify-between list-none">
            <h2 className="text-base font-bold text-text-primary">Strategi &amp; Risiko Trading Saham Oversold</h2>
            <span className="text-text-tertiary text-xs transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-4 pt-4 border-t border-border/40 space-y-6">
            <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
              <p>
                <strong className="text-text-primary">Saham oversold hari ini</strong> merujuk pada saham di Bursa Efek
                Indonesia (BEI) yang Relative Strength Index (RSI)-nya berada dibawah 30. RSI adalah indikator momentum
                berskala 0–100; nilai dibawah 30 menandakan tekanan jual yang berlebihan sehingga harga terkoreksi jauh
                dari nilai wajar. Secara historis, kondisi ini kerap mendahului <em>rebound</em> atau pantulan harga
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
                gejolak pasar bisa jadi peluang rebound, sementara saham yang turun karena laporan keuangan buruk atau
                sanksi regulator berisiko terus melemah. Selalu konfirmasi dengan struktur pasar, volume, dan konteks
                berita sebelum mengambil posisi.
              </p>
            </div>
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
        </details>

        {/* FAQ — folded into details */}
        <details className="mt-4 group rounded-xl border border-border/70 bg-bg-card p-5">
          <summary className="cursor-pointer font-semibold text-text-primary flex items-center justify-between list-none">
            <h2 className="text-base font-bold text-text-primary">Pertanyaan Umum seputar Saham Oversold</h2>
            <span className="text-text-tertiary text-xs transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
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
                dihitung dari data penutupan &amp; sesi terakhir BEI.
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
        </details>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            <Search className="inline h-4 w-4" /> Screener Lengkap
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <TrendingUp className="inline h-4 w-4" /> Saham Golden Cross
          </Link>
          <Link href="/saham-macd-bullish" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <TrendingUp className="inline h-4 w-4" /> Saham MACD Bullish
          </Link>
          <Link href="/saham-stochastic-oversold" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <Target className="inline h-4 w-4" /> Saham Stochastic Oversold
          </Link>
          <Link href="/saham-overbought" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <AlertTriangle className="inline h-4 w-4" /> Saham Overbought
          </Link>
        </div>
      </div>
    </>
  );
}
