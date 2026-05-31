import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { bigIntToNumber, decimalToNumber } from "@/lib/serialize";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { ChartSection } from "@/components/chart/chart-section";
import { IndicatorPanel } from "@/components/stock/indicator-panel";
import { KeyStatistics } from "@/components/stock/key-statistics";
import { FundamentalData } from "@/components/stock/fundamental-data";
import { TradingPlanCard } from "@/components/stock/trading-plan-card";
import { HypeWarningBadge } from "@/components/stock/hype-warning-badge";
import { StockDiscussion } from "@/components/community/stock-discussion";
import { StockActionBadge } from "@/components/stock/stock-action-badge";
import { PresenceBadge } from "@/components/stock/presence-badge";
import { StockAlertBanner } from "@/components/stock/stock-alert-banner";
import { CompanyDataTabs } from "@/components/stock/company-data-tabs";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { calculatePivotPoints } from "@/lib/indicators";
import { subDays } from "date-fns";
import { IDX40, SITE_URL } from "@/lib/constants";
import { IDX_STOCKS } from "@/lib/idx-stocks";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function Dot() {
  return <span className="text-gray-500" aria-hidden="true">·</span>;
}

function CrossBadge({ text, isBullish }: { text: string; isBullish: boolean }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
      isBullish ? "bg-bullish/20 text-bullish" : "bg-bearish/20 text-bearish"
    }`}>
      {isBullish ? "▲" : "▼"} {text}
    </span>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const stock = await stockMarketService.getStockDetail(ticker).catch(() => null);
  if (!stock) return {};

  const name = stripJk(ticker);
  return {
    title: `Analisa Teknikal ${name} — ${stock.stock.name}`,
    description: `Analisa teknikal saham ${stock.stock.name} (${name}) hari ini. Chart interaktif, RSI, MACD, Bollinger Bands, SMA/EMA, dan sinyal trading di TeknikalID.`,
    alternates: { canonical: `/stocks/${ticker}` },
    openGraph: {
      title: `Analisa Teknikal ${name} (${stock.stock.name}) | TeknikalID`,
      description: `Chart saham ${name} hari ini dengan indikator RSI, MACD, dan sinyal teknikal.`,
      url: `${SITE_URL}/stocks/${ticker}`,
    },
  };
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  let detail;
  try {
    detail = await stockMarketService.getStockDetailForPage(ticker);
  } catch (e) {
    if (e instanceof StockNotFoundError) notFound();
    throw e;
  }

  const { stock, prices, latest, close, change, changePercent, indicator: indicators, prevIndicator } = detail;
  const prev = prices[1];
  const isPositive = change !== null && change >= 0;

  const now = new Date().getTime();

  const smaCrossText = (() => {
    if (!indicators?.smaCrossSignal || !indicators.smaCrossDate) return null;
    const days = Math.floor((now - new Date(indicators.smaCrossDate).getTime()) / 86400000);
    const label = indicators.smaCrossSignal === "golden_cross" ? "Golden Cross" : "Death Cross";
    return `${label} detected ${days === 0 ? "today" : `${days}d ago`}`;
  })();

  const emaCrossText = (() => {
    if (!indicators?.emaCrossSignal || !indicators.emaCrossDate) return null;
    const days = Math.floor((now - new Date(indicators.emaCrossDate).getTime()) / 86400000);
    const label = indicators.emaCrossSignal === "bullish" ? "EMA Bullish Cross" : "EMA Bearish Cross";
    return `${label} ${days === 0 ? "today" : `${days}d ago`}`;
  })();

  const outlook = (() => {
    if (!indicators || close === null) return "Neutral" as const;
    const bullish = indicators.rsi14 !== null && indicators.rsi14 < 70
      && indicators.macdHist !== null && indicators.macdHist > 0
      && indicators.sma50 !== null && close > indicators.sma50;
    const bearish = indicators.rsi14 !== null && indicators.rsi14 > 30
      && indicators.macdHist !== null && indicators.macdHist < 0
      && indicators.sma50 !== null && close < indicators.sma50;
    if (bullish) return "Bullish" as const;
    if (bearish) return "Bearish" as const;
    return "Neutral" as const;
  })();

  const [socialData, { structure: marketStructure }, fundamentalRow, idxCommissioners, idxSubsidiaries, idxDividends] = await Promise.all([
    prisma.post.aggregate({
      where: { tickerTag: ticker, createdAt: { gte: subDays(new Date(), 7) } },
      _count: true,
      _sum: { likesCount: true, commentsCount: true },
    }),
    technicalAnalysisService.getMarketStructure(ticker),
    stockRepository.findLatestFundamental(detail.stock.id),
    stockRepository.findCommissioners(detail.stock.id),
    stockRepository.findSubsidiaries(detail.stock.id),
    stockRepository.findDividends(detail.stock.id),
  ]);

  const socialScore = (socialData._sum.likesCount ?? 0) * 0.5
    + (socialData._sum.commentsCount ?? 0) * 1
    + socialData._count * 1;
  const isHighSocialActivity = socialScore >= 10;

  const fundamentals = fundamentalRow ? {
    pe: decimalToNumber(fundamentalRow.pe),
    forwardPe: decimalToNumber(fundamentalRow.forwardPe),
    pb: decimalToNumber(fundamentalRow.pb),
    eps: decimalToNumber(fundamentalRow.eps),
    dividendYield: decimalToNumber(fundamentalRow.dividendYield),
    marketCap: bigIntToNumber(fundamentalRow.marketCap),
  } : null;

  const latestHigh = latest ? decimalToNumber(latest.high) ?? close : null;
  const latestLow = latest ? decimalToNumber(latest.low) ?? close : null;

  const latestVolume = latest ? bigIntToNumber(latest.volume) ?? 0 : 0;
  const avgVolume = prices.length > 1
    ? prices.slice(1).reduce((sum, p) => sum + (bigIntToNumber(p.volume) ?? 0), 0) / (prices.length - 1)
    : 0;
  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 0;

  const pivots = latestHigh && close
    ? calculatePivotPoints(latestHigh, latestLow ?? close, close)
    : null;
  const nearResistance = pivots !== null && close !== null
    ? (pivots.r1 - close) / close < 0.02 && close <= pivots.r1
    : false;
  const isOverbought = indicators?.rsi14 !== null && (indicators?.rsi14 ?? 0) > 70;
  const priceSurge = changePercent !== null && changePercent > 0.05;

  const socialHype = isHighSocialActivity && (isOverbought || nearResistance);
  const marketFomo = volumeRatio >= 2 && priceSurge && isOverbought;
  const showHypeAlert = socialHype || marketFomo;

  const tradingPlan = close !== null && latestHigh
    ? technicalAnalysisService.generateTradingPlan({
        currentPrice: close,
        high: latestHigh,
        low: latestLow ?? close,
        close,
        prevClose: prev ? decimalToNumber(prev.close) ?? close : close,
        atr: indicators?.atr ?? null,
        rsi14: indicators?.rsi14 ?? null,
        sma20: indicators?.sma20 ?? null,
        sma50: indicators?.sma50 ?? null,
        sma200: indicators?.sma200 ?? null,
        macdHist: indicators?.macdHist ?? null,
        marketStructure,
        supertrend: indicators?.supertrend ?? null,
        obvTrend: indicators?.obvTrend ?? null,
        stochK: indicators?.stochK ?? null,
        stochD: indicators?.stochD ?? null,
        adx: indicators?.adx ?? null,
      })
    : null;

  // Serialize IDX company data for client component
  const idxProfile = (stock.industry || stock.subIndustry || stock.subSector || stock.address || stock.phone || stock.email || stock.website)
    ? {
        industry: stock.industry,
        subIndustry: stock.subIndustry,
        subSector: stock.subSector,
        listingBoard: stock.listingBoard,
        listingDate: stock.listingDate?.toISOString().split("T")[0] ?? null,
        address: stock.address,
        phone: stock.phone,
        email: stock.email,
        website: stock.website,
      }
    : null;

  const idxCommissionersSerialized = idxCommissioners.map((c) => ({
    name: c.name,
    position: c.position,
    independent: c.independent,
  }));

  const idxSubsidiariesSerialized = idxSubsidiaries.map((s) => ({
    name: s.name,
    businessType: s.businessType,
    totalAssets: s.totalAssets !== null ? decimalToNumber(s.totalAssets) : null,
    ownershipPercent: s.ownershipPercent !== null ? decimalToNumber(s.ownershipPercent) : null,
  }));

  const idxDividendsSerialized = idxDividends.map((d) => ({
    year: d.year,
    type: d.type,
    amount: d.amount !== null ? decimalToNumber(d.amount) : null,
    currency: d.currency,
    exDate: d.exDate?.toISOString().split("T")[0] ?? null,
    paymentDate: d.paymentDate?.toISOString().split("T")[0] ?? null,
  }));

  return (
    <div className="fade-in">
      {/* Dark Terminal Header */}
      <section className="stocks-hero">
        <div className="relative z-[1] max-w-7xl mx-auto px-4 py-8 sm:py-10 space-y-5">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 flex items-center gap-1.5 font-mono" aria-label="Breadcrumb">
            <Link href="/stocks" className="hover:text-white transition-colors">Stocks</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-gray-300" aria-current="page">{stripJk(ticker)}</span>
          </nav>

          {/* Price Header Card */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 relative overflow-hidden backdrop-blur-sm">
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${
              change !== null
                ? (isPositive ? "bg-gradient-to-r from-bullish via-bullish/40 to-transparent" : "bg-gradient-to-r from-bearish via-bearish/40 to-transparent")
                : "bg-gradient-to-r from-accent via-accent/40 to-transparent"
            }`} aria-hidden="true" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  {stock.logo && (
                    <img src={stock.logo} alt="" className="w-8 h-8 rounded-md object-contain bg-white/10" />
                  )}
                  <h1 className="text-2xl font-bold tracking-tight text-white">{stripJk(ticker)}</h1>
                  <span className="text-gray-600" aria-hidden="true">·</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{stock.sector}</span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{stock.name}</p>
              </div>
              {close !== null && (
                <div className="text-right shrink-0">
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight leading-none tabular-nums text-white">{formatPrice(close)}</p>
                  {changePercent !== null && (
                    <p className={`text-sm mt-1 tabular-nums ${
                      changePercent === 0
                        ? "text-gray-500"
                        : `font-semibold ${changeColor(changePercent)}`
                    }`}>
                      {formatPercent(changePercent)}
                      {change !== null && changePercent !== 0 && (
                        <span className="text-gray-500 font-normal ml-1">
                          ({isPositive ? "+" : ""}{formatPrice(change)})
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 opacity-80">
                    <StockActionBadge ticker={ticker} />
                    <Link
                      href={`/compare?s=${ticker}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-white/[0.06] text-gray-500 hover:bg-white/[0.04] hover:text-gray-300 transition-all press-scale"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      Bandingkan
                    </Link>
                  </div>
                </div>
              )}
              {close === null && <StockActionBadge ticker={ticker} />}
            </div>

            {/* Indicator strip */}
            {indicators && close !== null && (
              <div className="border-t border-white/[0.08] mt-5 pt-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap text-sm">
                    <span className={`font-mono font-semibold ${rsiColor(indicators.rsi14) || "text-gray-300"}`}>
                      RSI {indicators.rsi14?.toFixed(0) ?? "—"}
                    </span>
                    <Dot />
                    {indicators.macdHist !== null && (
                      <>
                        <span className={`font-mono font-semibold ${indicators.macdHist >= 0 ? "text-bullish" : "text-bearish"}`}>
                          MACD {indicators.macdHist >= 0 ? "▲" : "▼"}
                        </span>
                        <Dot />
                      </>
                    )}
                    {indicators.atr !== null && (
                      <>
                        <span className="font-mono text-gray-400">Vol {(indicators.atr / close * 100).toFixed(1)}%</span>
                        <Dot />
                      </>
                    )}
                    {indicators.adx !== null && (
                      <span className={`font-mono font-semibold ${indicators.adx > 25 ? "text-blue-400" : "text-gray-500"}`}>
                        {indicators.adx > 25 ? "Tren Kuat" : "Tren Lemah"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`text-xs font-bold font-mono px-3 py-1 rounded-md ${
                      outlook === "Bullish" ? "bg-bullish/20 text-bullish"
                      : outlook === "Bearish" ? "bg-bearish/20 text-bearish"
                      : "bg-white/[0.08] text-gray-300"
                    }`}>
                      {outlook}
                    </span>
                    {smaCrossText && (
                      <CrossBadge text={smaCrossText} isBullish={indicators?.smaCrossSignal === "golden_cross"} />
                    )}
                    {emaCrossText && (
                      <CrossBadge text={emaCrossText} isBullish={indicators?.emaCrossSignal === "bullish"} />
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      Delayed
                    </span>
                    <Dot />
                    <PresenceBadge ticker={ticker} />
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <HypeWarningBadge
                    show={showHypeAlert}
                    socialScore={socialScore}
                    postCount={socialData._count}
                    volumeRatio={volumeRatio}
                    changePercent={changePercent}
                    rsi14={indicators?.rsi14 ?? null}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Chart */}
        <ChartSection ticker={ticker} />

        {/* Indicators + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            {indicators ? (
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
            ) : (
              <div className="indicator-card depth-shadow p-8 text-center text-text-secondary">
                No indicator data available
              </div>
            )}
          </div>
          <div className="space-y-4">
            <KeyStatistics
              open={latest ? decimalToNumber(latest.open) : null}
              high={latest ? decimalToNumber(latest.high) : null}
              low={latest ? decimalToNumber(latest.low) : null}
              close={close}
              volume={latest ? bigIntToNumber(latest.volume) : null}
              week52High={detail.week52High}
              week52Low={detail.week52Low}
              sma20={indicators?.sma20 ?? null}
              sma50={indicators?.sma50 ?? null}
              sma200={indicators?.sma200 ?? null}
            />
            <FundamentalData data={fundamentals} />
            {tradingPlan && <TradingPlanCard plan={tradingPlan} />}
          </div>
        </div>

        {/* IDX Company Data Tabs */}
        <CompanyDataTabs
          profile={idxProfile}
          commissioners={idxCommissionersSerialized}
          subsidiaries={idxSubsidiariesSerialized}
          dividends={idxDividendsSerialized}
        />

        <StockDiscussion ticker={ticker} />
      </div>

      <StockAlertBanner ticker={ticker} />
    </div>
  );
}
