import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import Link from "next/link";
import { fetchScreenerRows } from "@/components/signal/screener-data";
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
  title: "Saham Overbought Hari Ini — RSI Diatas 70",
  description:
    "Daftar saham IDX overbought hari ini (RSI diatas 70). Saham overbought berpotensi koreksi — pertimbangkan take profit atau hindari beli di harga tinggi.",
  alternates: { canonical: "/saham-overbought" },
  keywords: [
    "saham overbought hari ini",
    "saham rsi diatas 70",
    "saham jual hari ini",
    "sinyal jual saham",
    "take profit saham",
    "saham naik terlalu tinggi",
    "koreksi saham idx",
  ],
  openGraph: {
    title: "Saham Overbought Hari Ini — RSI > 70",
    description: "Daftar saham IDX overbought (RSI > 70). Waspadai koreksi harga.",
    url: `${SITE_URL}/saham-overbought`,
  },
};

export default async function SahamOverboughtPage() {
  const { stocks, failed } = await fetchScreenerRows("rsi_overbought");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Saham Overbought Hari Ini — RSI Diatas 70",
        description: "Daftar saham IDX overbought yang berpotensi koreksi.",
        url: `${SITE_URL}/saham-overbought`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu saham overbought?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham overbought adalah kondisi dimana harga naik terlalu cepat, ditandai dengan RSI diatas 70. Harga berpotensi koreksi turun karena sudah terlalu mahal.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah overbought berarti harus jual?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Dalam tren kuat, RSI bisa tetap diatas 70 untuk waktu lama. Tapi overbought adalah sinyal untuk berhati-hati, pertimbangkan take profit bertahap.",
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
        title="Saham Overbought Hari Ini"
        description="Saham dengan RSI diatas 70 — berpotensi koreksi. Dihitung dari data penutupan &amp; sesi terakhir BEI."
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
        <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-500/5 p-4 text-sm text-text-secondary">
          <strong className="text-text-primary"> Perhatian:</strong> Saham overbought bukan sinyal jual pasti. Dalam tren kuat, RSI bisa bertahan
          diatas 70. Gunakan bersama indikator lain.
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold">Ticker</th>
                <th className="py-2 pr-4 font-semibold">Nama</th>
                <th className="py-2 pr-4 font-semibold">Harga</th>
                <th className="py-2 pr-4 font-semibold">Perubahan</th>
                <th className="py-2 pr-4 font-semibold">Skor Sinyal</th>
                <th className="py-2 pr-4 font-semibold">Pantau</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr><td colSpan={6} className="py-8 text-center text-text-secondary">Data sinyal sementara tidak dapat dimuat — sedang diperbarui. Mohon muat ulang dalam beberapa menit.</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-text-secondary">Belum ada saham overbought saat ini.</td></tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as { ticker: string; name: string; close: number | null; changePercent: number | null; signalScore: number | null };
                  return (
                    <tr key={s.ticker} className="border-b hover:bg-bg-hover/50">
                      <td className="py-2 pr-4"><Link href={`/stocks/${s.ticker}`} className="font-semibold text-accent hover:underline inline-block py-1.5">{stripJk(s.ticker)}</Link></td>
                      <td className="py-2 pr-4 text-text-secondary">{s.name}</td>
                      <td className="py-2 pr-4"><span data-live-price={(s ?? stock).ticker}>{s.close !== null ? formatPrice(s.close) : "—"}</span></td>
                      <td className={`py-2 pr-4 ${s.changePercent !== null ? changeColor(s.changePercent) : ""}`}>{s.changePercent !== null ? formatPercent(s.changePercent) : "—"}</td>
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

        <AskAiCta question="Saham overbought ada?" />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"><Search className="inline h-4 w-4" /> Screener Lengkap</Link>
          <Link href="/saham-oversold" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover"><Gem className="inline h-4 w-4" /> Saham Oversold</Link>
          <Link href="/saham-golden-cross" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover"><TrendingUp className="inline h-4 w-4" /> Saham Golden Cross</Link>
        </div>
      </div>
    </>
  );
}
