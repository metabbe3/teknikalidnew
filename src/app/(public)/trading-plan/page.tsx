import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Kalkulator Trading Plan Saham — Entry, Target, Cut Loss",
  description:
    "Kalkulator trading plan otomatis untuk saham IDX: entry, TP1/TP2, cut loss, risk-reward, dan confidence berbasis Pivot Points & ATR.",
  alternates: { canonical: "/trading-plan" },
  keywords: [
    "kalkulator trading plan",
    "trading plan saham",
    "entry target stop loss saham",
    "kalkulator cut loss",
    "risk reward saham idx",
  ],
  openGraph: {
    title: "Kalkulator Trading Plan Saham | TeknikalID",
    description: "Entry, target, dan cut loss otomatis dari Pivot Points & ATR untuk saham IDX.",
    url: `${SITE_URL}/trading-plan`,
    images: [{ url: `${SITE_URL}/api/og?title=Kalkulator+Trading+Plan+Saham&type=berita`, width: 1200, height: 630 }],
  },
};

const CONF_LABEL: Record<string, string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };

export default async function TradingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  // sanitize input: uppercase, .JK auto-append, whitelist via DB lookup
  const raw = (params.t ?? "BBCA").trim().toUpperCase().replace(/\.JK$/, "");
  const ticker = raw ? `${raw}.JK` : "BBCA.JK";

  const detail = await stockMarketService.getStockOgData(ticker).catch(() => null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Kalkulator Trading Plan Saham TeknikalID",
        url: `${SITE_URL}/trading-plan`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        eyebrow="Tools"
        title="Kalkulator Trading Plan"
        description="Rencana trading otomatis — entry, target, dan cut loss dari Pivot Points & ATR. Tidak ada lagi entry tanpa rencana."
      />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <form action="/trading-plan" method="get" className="flex gap-2">
          <input
            type="text"
            name="t"
            defaultValue={stripJk(ticker)}
            placeholder="Kode saham, mis. BBCA"
            className="flex-1 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Kode saham"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity press-scale"
          >
            Hitung
          </button>
        </form>

        {!detail || detail.close == null ? (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-sm text-text-secondary">
            Saham <span className="font-mono font-semibold">{stripJk(ticker)}</span> tidak ditemukan atau belum ada
            data. Coba kode lain, atau jelajahi{" "}
            <Link href="/screener" className="text-accent underline underline-offset-2">
              Screener
            </Link>
            .
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-bg-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <Link href={`/stocks/${ticker}`} className="font-mono font-bold text-lg text-text-primary hover:text-accent">
                    {stripJk(ticker)}
                  </Link>
                  <span className="block text-xs text-text-tertiary">{detail.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold tabular-nums">{formatPrice(detail.close)}</div>
                  <div className={`text-xs font-mono tabular-nums ${changeColor(detail.changePercent)}`}>
                    {detail.changePercent != null ? formatPercent(detail.changePercent) : "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  detail.tradingStrategy === "Wait & See"
                    ? "bg-bearish-bg text-bearish"
                    : "bg-bullish-bg text-bullish"
                }`}>
                  {detail.tradingStrategy ?? "—"}
                </span>
                {detail.confidence && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-bg-hover text-text-secondary">
                    Confidence: {CONF_LABEL[detail.confidence] ?? detail.confidence}
                  </span>
                )}
                {detail.signalLabel && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-bg-hover text-text-secondary">
                    Sinyal: {detail.signalLabel}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { label: "Entry", value: detail.entryPrice, sub: "Zona beli" },
                  { label: "TP 1", value: detail.tp1, sub: detail.tp1Source || "Target 1" },
                  { label: "TP 2", value: detail.tp2, sub: "Target 2" },
                  { label: "Cut Loss", value: detail.sl, sub: detail.slSource || "Stop" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-bg-hover p-3">
                    <div className="text-[10px] uppercase tracking-wide text-text-tertiary">{m.label}</div>
                    <div className="font-mono font-bold tabular-nums mt-0.5">
                      {m.value != null ? formatPrice(m.value) : "—"}
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5 leading-tight">{m.sub}</div>
                  </div>
                ))}
              </div>

              {detail.riskReward != null && (
                <div className="text-xs text-text-secondary">
                  Risk-Reward: <span className="font-mono font-semibold">1 : {detail.riskReward.toFixed(1)}</span>
                  {detail.tradingWarning && (
                    <span className="block mt-1.5 text-text-tertiary leading-snug">⚠ {detail.tradingWarning}</span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h2 className="text-sm font-semibold mb-2">Cara pakai</h2>
              <ul className="text-sm text-text-secondary space-y-1.5 list-disc pl-5">
                <li>Plan dihitung dari Pivot Points (S/R klasikal) dan volatilitas ATR(14) — bukan prediksi, tapi kerangka disiplin.</li>
                <li>Entry = zona beli ideal; kalau harga jauh di atasnya, strategi otomatis jadi Wait &amp; See.</li>
                <li>Cut loss bukan opsi — bagian dari plan. Risk-reward di bawah 1:1,5 biasanya tidak layak diambil.</li>
              </ul>
            </div>
          </>
        )}

        <AskAiCta question={`Trading plan ${stripJk(ticker)} bagaimana?`} />
      </div>
    </>
  );
}
