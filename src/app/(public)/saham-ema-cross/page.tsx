import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import { SITE_URL } from "@/lib/constants";
import { Search, Star, TrendingUp } from "lucide-react";
import { GuestStar } from "@/components/stock/guest-star";

 // 12 Okt: failed-bake 5mnt bikin 'tidak ada data' pasca-deploy; 30s self-heal

// force-dynamic (RCA 18 Okt): prerender build-time tanpa DB membekukan empty state
// ("Data sedang diperbarui") — ISR revalidate tidak pernah mengisi (pola /berita).
export const dynamic = "force-dynamic";

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
    title: "Saham EMA Cross Hari Ini — EMA12/EMA26",
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
      <script type="application/ld+json">{jsonLd}</script>
      <PageHero
        eyebrow="Saham IDX"
        title="Saham EMA Cross Hari Ini"
        description="Saham dengan sinyal EMA12/EMA26 crossover — momentum jangka pendek untuk trader aktif. Dihitung dari data penutupan &amp; sesi terakhir BEI."
      />
      {/* seo-dr-3: kalimat pembuka dinamis utk SERP (jumlah saham hari ini) */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <p className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary" data-seo-dr="live-count">
          Per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })},
          terdapat <strong className="text-text-primary">{stocks.length} saham aktif BEI</strong> yang lolos
          saringan ini{topScoredText} — daftar lengkap di bawah, gratis tanpa login.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-4 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
          <strong className="text-text-primary"> Mengapa EMA cross penting?</strong> EMA cross adalah detektor
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
                <th className="py-2 pr-4 font-semibold text-text-primary">Skor Sinyal</th>
                <th className="py-2 pr-4 font-semibold text-text-primary">Pantau</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-tertiary">
                    Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-tertiary">
                    Belum ada saham EMA cross saat ini. Cek lagi nanti.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; signalScore: number | null };
                  return (
                    <tr key={s.ticker} className="border-b border-border hover:bg-bg-hover">
                      <td className="py-2 pr-4">
                        <Link href={`/stocks/${s.ticker}`} className="font-semibold text-accent hover:underline inline-block py-1.5">
                          {stripJk(s.ticker)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{s.name}</td>
                      <td className="py-2 pr-4 text-text-primary"><span data-live-price={s.ticker}>{s.close !== null ? formatPrice(s.close) : "—"}</span></td>
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

        <AskAiCta question="EMA cross baru ada?" />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            <Search className="inline h-4 w-4" /> Screener Lengkap
          </Link>
          <Link href="/saham-macd-bullish" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <TrendingUp className="inline h-4 w-4" /> Saham MACD Bullish
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <Star className="inline h-4 w-4" /> Saham Golden Cross
          </Link>
        </div>
      </div>
    </>
  );
}
