import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { SignalVerdict } from "@/components/stock/signal-verdict";
import { ChartSection } from "@/components/chart/chart-section";
import { IndicatorPanel } from "@/components/stock/indicator-panel";
import { ThesisButton } from "@/components/stock/thesis-modal";
import { StockDiscussion } from "@/components/community/stock-discussion";
import { formatPrice, formatPercent, changeColor, stripJk } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const detail = await stockMarketService.getStockDetailForPage(ticker).catch(() => null);
  if (!detail || detail.stock.assetClass !== "CRYPTO") return {};
  const close = detail.close;
  const name = stripJk(ticker);
  return {
    // ponytail: crypto detail noindex — logged-in tool, not SEO inventory (see /crypto listing).
    robots: { index: false, follow: true },
    title: `Harga ${name} (${detail.stock.name}) Hari Ini — Analisa Teknikal Crypto | TeknikalID`,
    description: `Harga ${name} hari ini ${close !== null ? formatPrice(close) : ""}. Chart interaktif, indikator teknikal RSI/MACD/SMA, dan sinyal trading crypto (data Indodax, IDR).`,
    alternates: { canonical: `/crypto/${ticker.toUpperCase()}` },
  };
}

export default async function CryptoDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  let detail;
  try {
    detail = await stockMarketService.getStockDetailForPage(upper);
  } catch (e) {
    if (e instanceof StockNotFoundError) notFound();
    throw e;
  }

  // Crypto-only route — IDX tickers don't belong here.
  if (detail.stock.assetClass !== "CRYPTO") notFound();

  // Canonical case (lowercase → uppercase).
  if (ticker !== upper) redirect(`/crypto/${upper}`);

  const session = await auth();
  const isAuthed = !!session?.user;
  const { stock, close, changePercent, indicator: indicators, prevIndicator } = detail;
  const isPositive = (detail.change ?? 0) >= 0;

  const label = indicators?.signalLabel ?? null;
  const outlook = label
    ? label.toLowerCase().includes("bullish")
      ? "Bullish"
      : label.toLowerCase().includes("bearish")
        ? "Bearish"
        : "Neutral"
    : "Neutral";

  return (
    <div className="fade-in">
      <SignalVerdict
        ticker={upper}
        signalLabel={label}
        signalScore={isAuthed ? indicators?.signalScore ?? null : null}
        outlook={outlook as "Bullish" | "Bearish" | "Neutral"}
        rsi14={isAuthed ? indicators?.rsi14 ?? null : null}
        isGorengan={false}
        showHypeAlert={false}
      />

      {/* Price header */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-3">
          <nav className="text-xs text-text-tertiary flex items-center gap-1.5 font-mono" aria-label="Breadcrumb">
            <Link href="/crypto" className="hover:text-text-primary transition-colors">Crypto</Link>
            <span aria-hidden>/</span>
            <span className="text-text-secondary">{upper}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                <span className="font-mono">{upper}</span>{" "}
                <span className="text-text-secondary font-normal text-lg">{stock.name}</span>
              </h1>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-mono text-3xl font-bold tabular-nums text-text-primary">
                  {close !== null ? formatPrice(close) : "—"}
                </span>
                {changePercent !== null && (
                  <span className={`font-mono text-sm font-semibold tabular-nums ${changeColor(changePercent)}`}>
                    {isPositive ? "+" : ""}{formatPercent(changePercent)}
                  </span>
                )}
              </div>
            </div>
            <ThesisButton ticker={upper} />
          </div>
          <p className="text-[11px] text-text-tertiary">Data dari Indodax · Harga dalam Rupiah (IDR)</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Chart */}
        {isAuthed ? (
          <ChartSection ticker={upper} />
        ) : (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-text-secondary">Daftar gratis untuk melihat chart interaktif + indikator lengkap.</p>
            <Link href="/auth/signin" className="inline-block mt-3 text-sm font-semibold text-accent hover:underline">Masuk / Daftar →</Link>
          </div>
        )}

        {/* Indicators */}
        {isAuthed && indicators ? (
          <IndicatorPanel
            close={close}
            rsi14={indicators.rsi14}
            macdLine={indicators.macdLine}
            macdSignal={indicators.macdSignal}
            macdHist={indicators.macdHist}
            bbUpper={indicators.bbUpper}
            bbMiddle={indicators.bbMiddle}
            bbLower={indicators.bbLower}
            stochK={indicators.stochK}
            stochD={indicators.stochD}
            adx={indicators.adx}
            vwap={indicators.vwap}
            atr={indicators.atr}
            obv={indicators.obv}
            obvTrend={indicators.obvTrend ?? null}
            supertrend={indicators.supertrend}
            smaCrossSignal={indicators.smaCrossSignal ?? null}
            emaCrossSignal={indicators.emaCrossSignal ?? null}
            sma20={indicators.sma20}
            sma50={indicators.sma50}
            sma200={indicators.sma200}
            ema12={indicators.ema12}
            ema26={indicators.ema26}
            prevIndicator={prevIndicator}
          />
        ) : null}

        <StockDiscussion ticker={upper} />
      </div>
    </div>
  );
}
