import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { TradingPlanPicker } from "@/components/trading-plan/plan-picker";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { auth } from "@/lib/auth";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { IDX_STOCKS } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Kalkulator Trading Plan Saham — Entry, Target, Cut Loss",
  description:
    "Kalkulator trading plan otomatis untuk saham IDX: entry, TP1/TP2, cut loss, risk-reward, dan confidence berbasis Pivot Points & ATR. Beberapa saham sekaligus.",
  robots: { index: false, follow: false },
};

const CONF_LABEL: Record<string, string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
const KNOWN = new Set(IDX_STOCKS.map((s) => s.ticker));

export default async function TradingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const params = await searchParams;
  const raw = Array.isArray(params.t) ? params.t : params.t ? [params.t] : [];
  // sanitize: uppercase, strip .JK, whitelist IDX_STOCKS, max 6, dedupe
  const tickers = [...new Set(
    raw
      .flatMap((v) => v.split(","))
      .map((v) => v.trim().toUpperCase().replace(/\.JK$/, ""))
      .filter(Boolean)
      .map((v) => (KNOWN.has(`${v}.JK`) ? `${v}.JK` : v))
      .filter((v) => KNOWN.has(v)),
  )].slice(0, 6);
  const selected = tickers.length > 0 ? tickers : ["BBCA.JK"];

  const details = await Promise.all(
    selected.map((t) => stockMarketService.getStockOgData(t).catch(() => null)),
  );

  return (
    <>
      <PageHero
        eyebrow="Tools"
        title="Kalkulator Trading Plan"
        description="Rencana trading otomatis — entry, target, dan cut loss dari Pivot Points & ATR. Pilih sampai 6 saham sekaligus."
      />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <TradingPlanPicker selected={selected} />

        <div className="grid gap-4 sm:grid-cols-2">
          {details.map((detail, i) => {
            const ticker = selected[i];
            if (!detail || detail.close == null) {
              return (
                <div key={ticker} className="rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
                  Saham <span className="font-mono font-semibold">{stripJk(ticker)}</span> belum ada data — coba kode lain.
                </div>
              );
            }
            return (
              <div key={ticker} className="rounded-xl border border-border bg-bg-card p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Link href={`/stocks/${ticker}`} className="font-mono font-bold text-lg text-text-primary hover:text-accent">
                      {stripJk(ticker)}
                    </Link>
                    <span className="block text-xs text-text-tertiary">{detail.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold tabular-nums">{formatPrice(detail.close)}</div>
                    {detail.changePercent != null && (
                      <div className={`text-xs font-mono tabular-nums ${changeColor(detail.changePercent)}`}>
                        {formatPercent(detail.changePercent)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {detail.tradingStrategy && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      detail.tradingStrategy === "Wait & See"
                        ? "bg-bearish-bg text-bearish"
                        : "bg-bullish-bg text-bullish"
                    }`}>
                      {detail.tradingStrategy}
                    </span>
                  )}
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

                <div className="grid grid-cols-2 gap-2.5">
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
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-bg-card p-5">
          <h2 className="text-sm font-semibold mb-2">Cara pakai</h2>
          <ul className="text-sm text-text-secondary space-y-1.5 list-disc pl-5">
            <li>Ketik kode atau nama saham, pilih dari saran — sampai 6 saham sekaligus, plan-nya berdampingan.</li>
            <li>Plan dihitung dari Pivot Points (S/R klasikal) dan volatilitas ATR(14) — bukan prediksi, tapi kerangka disiplin.</li>
            <li>Entry = zona beli ideal; kalau harga jauh di atasnya, strategi otomatis jadi Wait &amp; See.</li>
            <li>Cut loss bukan opsi — bagian dari plan. Risk-reward di bawah 1:1,5 biasanya tidak layak diambil.</li>
          </ul>
        </div>

        <AskAiCta question={`Trading plan ${stripJk(selected[0])} bagaimana?`} />
      </div>
    </>
  );
}
