import type { Metadata } from "next";
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
import { Gem, Search, TrendingUp } from "lucide-react";
import { GuestStar } from "@/components/stock/guest-star";

 // 12 Okt: failed-bake 5mnt bikin 'tidak ada data' pasca-deploy; 30s self-heal

// force-dynamic (RCA 18 Okt): prerender build-time tanpa DB membekukan empty state
// ("Data sedang diperbarui") — ISR revalidate tidak pernah mengisi (pola /berita).
export const dynamic = "force-dynamic";

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
    title: "Saham Death Cross Hari Ini — Sinyal Bearish",
    description: "Daftar saham IDX death cross (MA50 < MA200). Sinyal bearish — waspadai momentum turun.",
    url: `${SITE_URL}/saham-death-cross`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Death+Cross+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function SahamDeathCrossPage() {
  const { stocks, failed } = await fetchScreenerRows("death_cross");
  // prd-2026-10-31-01: riwayat & backtest kondisi — fail-diam (section tak
  // muncul bila query error; halaman utama tetap render).
  let conditionHistory: Awaited<ReturnType<typeof getConditionBacktest>> | null = null;
  try {
    conditionHistory = await getConditionBacktest("death_cross");
  } catch (e) {
    console.error("[condition-history] gagal:", e instanceof Error ? e.message : e);
  }

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

  const topScored = [...stocks]
    .filter((s): s is typeof s & { ticker: string; signalScore: number } => typeof (s as any).signalScore === "number" && (s as any).signalScore !== null)
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
        title="Saham Death Cross Hari Ini"
        description={<>Saham dengan <TermTip term="moving-average">MA50 memotong kebawah MA200</TermTip> — sinyal bearish, waspadai momentum turun. Dihitung dari data penutupan &amp; sesi terakhir BEI.</>}
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
          <strong className="text-text-primary"> Mengapa <TermTip term="death-cross">death cross</TermTip> penting?</strong> Death cross (MA50 memotong ke bawah <TermTip term="moving-average">MA200</TermTip>) menandakan
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
                    Belum ada saham death cross saat ini. Cek lagi nanti.
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
              🔔 Dapatkan notifikasi sinyal harian via Telegram →
            </a>
          </div>
        </div>

        <ConditionHistory result={conditionHistory} />

        <AskAiCta question="Saham yang death cross ada?" />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            <Search className="inline h-4 w-4" /> Screener Lengkap
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <TrendingUp className="inline h-4 w-4" /> Saham Golden Cross
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            <Gem className="inline h-4 w-4" /> Saham Oversold
          </Link>
        </div>
      </div>
    </>
  );
}
