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
import { SentimentGauge } from "@/components/stock/sentiment-gauge";
import { PresenceBadge } from "@/components/stock/presence-badge";
import { StockAlertBanner } from "@/components/stock/stock-alert-banner";
import { CompanyDataTabs } from "@/components/stock/company-data-tabs";
import { StockPaperPosition } from "@/components/paper-trading/stock-paper-position";
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

  const [socialData, { structure: marketStructure }, fundamentalRow, idxCommissioners, idxDirectors, idxShareholders, idxSubsidiaries, idxDividends] = await Promise.all([
    prisma.post.aggregate({
      where: { tickerTag: ticker, createdAt: { gte: subDays(new Date(), 7) } },
      _count: true,
      _sum: { likesCount: true, commentsCount: true },
    }),
    technicalAnalysisService.getMarketStructure(ticker),
    stockRepository.findLatestFundamental(detail.stock.id),
    stockRepository.findCommissioners(detail.stock.id),
    stockRepository.findDirectors(detail.stock.id),
    stockRepository.findShareholders(detail.stock.id),
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
  const idxProfile = (stock.industry || stock.subIndustry || stock.subSector || stock.address || stock.phone || stock.email || stock.website || stock.businessActivity || stock.listedShares || stock.foreignOwnershipPercent || stock.isinCode)
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
        businessActivity: stock.businessActivity,
        listedShares: stock.listedShares ? bigIntToNumber(stock.listedShares) : null,
        foreignOwnershipPercent: stock.foreignOwnershipPercent ? decimalToNumber(stock.foreignOwnershipPercent) : null,
        isinCode: stock.isinCode,
      }
    : null;

  const idxCommissionersSerialized = idxCommissioners.map((c) => ({
    name: c.name,
    position: c.position,
    independent: c.independent,
  }));

  const idxDirectorsSerialized = idxDirectors.map((d) => ({
    name: d.name,
    position: d.position,
    type: d.type,
    independent: d.independent,
  }));

  const idxShareholdersSerialized = idxShareholders.map((s) => ({
    name: s.name,
    type: s.type,
    shares: s.shares !== null ? decimalToNumber(s.shares) : null,
    percent: s.percent !== null ? decimalToNumber(s.percent) : null,
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
      <section className="stocks-hero" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
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
                <div className="flex items-center gap-2.5 flex-wrap">
                  {stock.logo && (
                    <img src={stock.logo} alt="" className="w-8 h-8 rounded-md object-contain bg-white/10" />
                  )}
                  <h1 className="text-2xl font-bold tracking-tight text-white">{stripJk(ticker)}</h1>
                  {indicators?.signalLabel && (
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                      indicators.signalLabel === "Strong Bullish" ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                      : indicators.signalLabel === "Bullish" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : indicators.signalLabel === "Bearish" ? "bg-red-500/15 text-red-400 border border-red-500/20"
                      : indicators.signalLabel === "Strong Bearish" ? "bg-red-500/25 text-red-300 border border-red-500/30"
                      : "bg-white/10 text-gray-300 border border-white/10"
                    }`}>
                      {indicators.signalLabel === "Strong Bullish" ? "▲▲" : indicators.signalLabel === "Bullish" ? "▲" : indicators.signalLabel === "Strong Bearish" ? "▼▼" : indicators.signalLabel === "Bearish" ? "▼" : "◆"} {indicators.signalLabel}
                    </span>
                  )}
                  {indicators?.isGorengan && (
                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ⚠ Gorengan
                    </span>
                  )}
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

            {/* Paper trading position card */}
            {close !== null && <StockPaperPosition ticker={ticker} />}

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
            <p className="text-[10px] text-text-tertiary text-center mt-2">
              Sinyal teknikal berdasarkan indikator. Bukan rekomendasi investasi.
            </p>
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
          directors={idxDirectorsSerialized}
          shareholders={idxShareholdersSerialized}
          subsidiaries={idxSubsidiariesSerialized}
          dividends={idxDividendsSerialized}
        />

        {/* Who holds this stock */}
        {await (async () => {
          const holders = await prisma.portfolioHolding.findMany({
            where: {
              stockTicker: ticker,
              user: { portfolioPublic: true, bannedAt: null },
            },
            take: 5,
            select: {
              user: {
                select: { username: true, name: true, image: true },
              },
            },
          });
          const totalHolders = await prisma.portfolioHolding.count({
            where: {
              stockTicker: ticker,
              user: { portfolioPublic: true, bannedAt: null },
            },
          });
          if (holders.length === 0) return null;
          return (
            <div className="bg-bg-card depth-shadow rounded-xl p-5 border border-border" style={{ borderTop: "3px solid #0d9488" }}>
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-500">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-primary">
                  Pemilik Saham
                </h3>
                <span className="text-[10px] font-mono text-text-tertiary ml-auto">{totalHolders} komunitas</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {holders.map((h) => (
                  <Link
                    key={h.user.username}
                    href={`/profile/${h.user.username}`}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-hover hover:bg-teal-50 transition-colors group"
                  >
                    {h.user.image ? (
                      <img src={h.user.image} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-[8px] font-bold">
                        {(h.user.name || h.user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-text-secondary group-hover:text-teal-600 transition-colors">
                      {h.user.username}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <SentimentGauge ticker={ticker} />
        <StockDiscussion ticker={ticker} />
      </div>

      <StockAlertBanner ticker={ticker} />
    </div>
  );
}
