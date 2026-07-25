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
import { RegistrationInlinePrompt } from "@/components/ui/registration-inline-prompt";
import { StockActionBadge } from "@/components/stock/stock-action-badge";
import { ThesisButton } from "@/components/stock/thesis-modal";
import { SentimentGauge } from "@/components/stock/sentiment-gauge";
import { PresenceBadge } from "@/components/stock/presence-badge";
import { StockAlertBanner } from "@/components/stock/stock-alert-banner";
import { StockFAQWidget } from "@/components/faq/stock-faq-widget";
import { CompanyDataTabs } from "@/components/stock/company-data-tabs";
import { StockPaperPosition } from "@/components/paper-trading/stock-paper-position";
import { HealthScoreDetail } from "@/components/stock/health-score-detail";
import { StockLogo } from "@/components/stock/stock-logo";
import { SignalVerdict } from "@/components/stock/signal-verdict";
import { IndicatorTooltip } from "@/components/ui/indicator-tooltip";
import { technicalAnalysisService, computeSignalScore } from "@/domains/stock/technical-analysis.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { calculatePivotPoints } from "@/lib/indicators";
import { subDays } from "date-fns";
import { IDX40, SITE_URL, isCryptoTicker } from "@/lib/constants";
import { SECTORS, getSectorSlug, sectorToBahasa } from "@/lib/sectors";
import { ShareButtons } from "@/components/ui/share-buttons";
import { IDX_STOCKS } from "@/lib/idx-stocks";
import { prisma } from "@/lib/prisma";
import { portfolioService } from "@/domains/portfolio/portfolio.service";
import DailyAnalysisSection from "@/components/stock/daily-analysis-section";
import { LoginGate } from "@/components/auth/login-gate";
import { auth } from "@/lib/auth";

// ponytail: page is per-request SSR (auth-gated data varies by session — can't be SSG).
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
  const fullName = stock.stock.name;
  const price = stock.close !== null ? formatPrice(stock.close) : "";
  const changeStr = stock.changePercent !== null
    ? ` (${formatPercent(stock.changePercent)})`
    : "";
  // Canonical: IDX → uppercase TICKER.JK; crypto → bare uppercase ticker.
  const upperTicker = ticker.toUpperCase();
  const canonicalTicker = isCryptoTicker(upperTicker)
    ? upperTicker
    : upperTicker.endsWith(".JK") ? upperTicker : `${stripJk(upperTicker)}.JK`;
  const canonicalPath = `/stocks/${canonicalTicker}`;
  const ogImage = `${SITE_URL}/api/og/stock?ticker=${encodeURIComponent(canonicalTicker)}`;

  // SEO-optimized title targeting "harga saham X hari ini" queries
  const title = price
    ? `Harga Saham ${name} Hari Ini ${price}${changeStr} — ${fullName}`
    : `Harga Saham ${name} (${fullName}) Hari Ini — Analisa Teknikal`;
  const description = price
    ? `Analisa teknikal saham ${name} (${fullName}) lengkap hari ini. Chart interaktif, indikator RSI, MACD, Bollinger Bands, support/resistance, dan sinyal trading.`
    : `Analisa teknikal saham ${fullName} (${name}) hari ini. Chart interaktif, RSI, MACD, Bollinger Bands, SMA/EMA, dan sinyal trading di TeknikalID.`;

  return {
    title,
    description,
    keywords: [`harga saham ${name} hari ini`, `saham ${name}`, `${name} idx`, `analisa teknikal ${name}`, fullName, `harga ${name}`, `${ticker} harga`],
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `Harga Saham ${name} (${fullName}) Hari Ini | TeknikalID`,
      description: description,
      url: `${SITE_URL}${canonicalPath}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Harga Saham ${name} Hari Ini` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Harga Saham ${name} (${fullName}) Hari Ini | TeknikalID`,
      description: description,
    },
  };
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  // Server-side auth gate: detailed data (chart, indicators, fundamentals) only for logged-in
  // users. Anon gets the SEO teaser (price/name/signal) + LoginGate placeholders — never the
  // underlying data in the HTML, so scrapers can't read it.
  const session = await auth();
  const isAuthed = !!session?.user;

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

  // Compute signal breakdown for health score detail
  const signalBreakdown = indicators ? computeSignalScore({
    price: close,
    sma20: indicators.sma20,
    sma50: indicators.sma50,
    sma200: indicators.sma200,
    ema12: indicators.ema12,
    ema26: indicators.ema26,
    rsi14: indicators.rsi14,
    macdHist: indicators.macdHist,
    stochK: indicators.stochK,
    stochD: indicators.stochD,
    adx: indicators.adx,
    supertrend: indicators.supertrend,
    obvTrend: indicators.obvTrend ?? null,
    vwap: indicators.vwap,
  }).breakdown : [];

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

  // Find sector peer tickers for related articles
  const sectorPeers = stock.sector
    ? IDX_STOCKS.filter((s) => s.sector === stock.sector && s.ticker !== ticker).map((s) => s.ticker)
    : [];

  const [socialData, { structure: marketStructure }, fundamentalRow, idxCommissioners, idxDirectors, idxShareholders, idxSubsidiaries, idxDividends, relatedArticles, dailySnapshot, sectorArticles] = await Promise.all([
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
    prisma.article.findMany({
      where: { status: "PUBLISHED", tickerTag: ticker },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, slug: true, title: true, publishedAt: true, articleType: true },
    }),
    prisma.article.findFirst({
      where: { status: "PUBLISHED", articleType: "DAILY_SNAPSHOT", tickerTag: ticker },
      orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true },
    }),
    sectorPeers.length > 0
      ? prisma.article.findMany({
          where: {
            status: "PUBLISHED",
            tickerTag: { in: sectorPeers },
            articleType: { not: "DAILY_SNAPSHOT" },
          },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: { id: true, slug: true, title: true, publishedAt: true, tickerTag: true },
        })
      : [],
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

  const ogImageUrl = `${SITE_URL}/api/og/stock?ticker=${encodeURIComponent(ticker)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `Harga Saham ${stripJk(ticker)} Hari Ini — ${stock.name}`,
        description: `Harga saham ${stock.name} (${stripJk(ticker)}) hari ini. Analisa teknikal, chart, RSI, MACD, dan sinyal trading.`,
        url: `${SITE_URL}/stocks/${ticker}`,
        image: ogImageUrl,
        breadcrumb: { "@id": `${SITE_URL}/stocks/${ticker}#breadcrumb` },
      },
      {
        // FinancialProduct schema for Google rich snippets
        "@type": "FinancialProduct",
        name: `Saham ${stripJk(ticker)} — ${stock.name}`,
        description: `Harga saham ${stripJk(ticker)} (${stock.name}) hari ini${close !== null ? ` ${formatPrice(close)}` : ""}. Analisa teknikal dan chart di TeknikalID.`,
        url: `${SITE_URL}/stocks/${ticker}`,
        ...(close !== null ? {
          offers: {
            "@type": "Offer",
            price: close,
            priceCurrency: "IDR",
            availability: "https://schema.org/InStock",
            ...(changePercent !== null ? {
              priceSpecification: {
                "@type": "PriceSpecification",
                price: close,
                priceCurrency: "IDR",
                valueAddedTaxIncluded: false,
              },
            } : {}),
          },
        } : {}),
        provider: {
          "@type": "Organization",
          name: "TeknikalID",
          url: SITE_URL,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/stocks/${ticker}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Stocks", item: `${SITE_URL}/stocks` },
          { "@type": "ListItem", position: 2, name: stripJk(ticker), item: `${SITE_URL}/stocks/${ticker}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Berapa harga saham ${stripJk(ticker)} hari ini?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Harga saham ${stripJk(ticker)} hari ini ${close !== null ? formatPrice(close) : "-"}` + (changePercent !== null ? ` (${formatPercent(changePercent)})` : "") + `. Lihat chart, indikator teknikal, dan analisa lengkap di TeknikalID.`,
            },
          },
          {
            "@type": "Question",
            name: `Bagaimana analisis teknikal saham ${stripJk(ticker)}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Analisis teknikal ${stripJk(ticker)} termasuk RSI, MACD, Support/Resistance, Bollinger Bands, dan sinyal trading tersedia lengkap di halaman ini.`,
            },
          },
          {
            "@type": "Question",
            name: `Apa itu saham ${stripJk(ticker)} (${stock.name})?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `${stripJk(ticker)} (${stock.name}) adalah emiten yang tercatat di Bursa Efek Indonesia${stock.sector ? `, sektor ${sectorToBahasa(stock.sector)}` : ""}. Pantau pergerakan harga, indikator teknikal, dan diskusi komunitas di TeknikalID.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="fade-in">
      {/* ── Signal verdict (leads the page) ── */}
      <SignalVerdict
        ticker={ticker}
        signalLabel={indicators?.signalLabel ?? null}
        signalScore={isAuthed ? indicators?.signalScore ?? null : null}
        outlook={outlook}
        rsi14={isAuthed ? indicators?.rsi14 ?? null : null}
        isGorengan={indicators?.isGorengan ?? false}
        showHypeAlert={showHypeAlert}
      />

      {/* Price header (light broadsheet) */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-5">
          {/* Breadcrumb */}
          <nav className="text-xs text-text-tertiary flex items-center gap-1.5 font-mono" aria-label="Breadcrumb">
            <Link href="/stocks" className="hover:text-text-primary transition-colors">Stocks</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-text-secondary" aria-current="page">{stripJk(ticker)}</span>
          </nav>

          {/* Price Header Card */}
          <div className="rounded-xl border border-border bg-bg-primary/60 p-5 sm:p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${
              change !== null
                ? (isPositive ? "bg-gradient-to-r from-bullish via-bullish/40 to-transparent" : "bg-gradient-to-r from-bearish via-bearish/40 to-transparent")
                : "bg-gradient-to-r from-accent via-accent/40 to-transparent"
            }`} aria-hidden="true" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StockLogo src={stock.logo} name={stock.name} ticker={ticker} />
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">{stripJk(ticker)}</h1>
                  {indicators?.isGorengan && (
                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1">
                      ⚠ Gorengan
                      <IndicatorTooltip indicator="Gorengan" className="opacity-60 hover:opacity-100" />
                    </span>
                  )}
                  <span className="text-text-tertiary" aria-hidden="true">·</span>
                  <span className="text-xs text-text-tertiary font-medium">{sectorToBahasa(stock.sector)}</span>
                </div>
                <p className="text-sm text-text-secondary mt-0.5">{stock.name}</p>
              </div>
              {close !== null && (
                <div className="text-right shrink-0">
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight leading-none tabular-nums text-text-primary">{formatPrice(close)}</p>
                  {changePercent !== null && (
                    <p className={`text-sm mt-1 tabular-nums ${
                      changePercent === 0
                        ? "text-text-tertiary"
                        : `font-semibold ${changeColor(changePercent)}`
                    }`}>
                      {formatPercent(changePercent)}
                      {change !== null && changePercent !== 0 && (
                        <span className="text-text-tertiary font-normal ml-1">
                          ({isPositive ? "+" : ""}{formatPrice(change)})
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 opacity-90">
                    <StockActionBadge ticker={ticker} />
                    <ThesisButton ticker={ticker} />
                    <Link
                      href={`/compare?s=${ticker}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-border text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-all press-scale"
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

            {/* Indicator strip — auth-gated (current indicator values are scrape data) */}
            {isAuthed && indicators && close !== null && (
              <div className="border-t border-border mt-5 pt-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap text-sm">
                    <span className={`font-mono font-semibold inline-flex items-center gap-1 ${rsiColor(indicators.rsi14) || "text-text-secondary"}`}>
                      RSI {indicators.rsi14?.toFixed(0) ?? "—"}
                      <IndicatorTooltip indicator="RSI" />
                    </span>
                    <Dot />
                    {indicators.macdHist !== null && (
                      <>
                        <span className={`font-mono font-semibold inline-flex items-center gap-1 ${indicators.macdHist >= 0 ? "text-bullish" : "text-bearish"}`}>
                          MACD {indicators.macdHist >= 0 ? "▲" : "▼"}
                          <IndicatorTooltip indicator="MACD" />
                        </span>
                        <Dot />
                      </>
                    )}
                    {indicators.atr !== null && (
                      <>
                        <span className="font-mono text-text-secondary inline-flex items-center gap-1">Vol {(indicators.atr / close * 100).toFixed(1)}%<IndicatorTooltip indicator="Volatilitas" /></span>
                        <Dot />
                      </>
                    )}
                    {indicators.adx !== null && (
                      <span className={`font-mono font-semibold inline-flex items-center gap-1 ${indicators.adx > 25 ? "text-accent" : "text-text-tertiary"}`}>
                        {indicators.adx > 25 ? "Tren Kuat" : "Tren Lemah"}
                        <IndicatorTooltip indicator="ADX" />
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
                    <span className="text-xs text-text-tertiary flex items-center gap-1 font-mono">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      Data tertunda ~5mnt
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

            {/* Share bar */}
            <div className="flex justify-end mt-3 pt-3 border-t border-border">
              <ShareButtons
                url={`${SITE_URL}/stocks/${ticker}`}
                title={`Analisa Teknikal ${stripJk(ticker)} — ${stock.name}`}
                text={`Chart dan indikator teknikal ${stripJk(ticker)} hari ini di TeknikalID`}
                imageUrl={`${SITE_URL}/api/og/stock?ticker=${encodeURIComponent(ticker)}`}
                storyImageUrl={`${SITE_URL}/api/og/stock-story?ticker=${encodeURIComponent(ticker)}`}
                className="[&_button]:!border-border [&_button]:!text-text-tertiary [&_button:hover]:!text-text-primary [&_button:hover]:!bg-bg-hover [&_span]:!text-text-tertiary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Chart — auth-gated. Anon gets a login placeholder; the OHLC series is never sent. */}
        {isAuthed ? (
          <ChartSection ticker={ticker} />
        ) : (
          <LoginGate
            feature="Chart Interaktif"
            message="Daftar gratis untuk membuka chart candlestick interaktif, indikator teknikal, dan analisa pergerakan harga lengkap."
          />
        )}

        {/* Daily Analysis — auth-gated (embeds indicator values in narrative) */}
        {isAuthed && close !== null ? (
            <DailyAnalysisSection
              ticker={ticker}
              stockName={stock.name}
              sector={stock.sector}
              close={close}
              change={change}
              changePercent={changePercent}
              high={latestHigh}
              low={latestLow}
              volume={latestVolume}
              week52High={detail.week52High}
              week52Low={detail.week52Low}
              rsi14={indicators?.rsi14 ?? null}
              macdHist={indicators?.macdHist ?? null}
              sma20={indicators?.sma20 ?? null}
              sma50={indicators?.sma50 ?? null}
              sma200={indicators?.sma200 ?? null}
              adx={indicators?.adx ?? null}
              stochK={indicators?.stochK ?? null}
              stochD={indicators?.stochD ?? null}
              supertrend={indicators?.supertrend ?? null}
              atr={indicators?.atr ?? null}
              obvTrend={indicators?.obvTrend ?? null}
              signalLabel={indicators?.signalLabel ?? null}
              signalScore={indicators?.signalScore ?? null}
              emaCrossSignal={indicators?.emaCrossSignal ?? null}
              smaCrossSignal={indicators?.smaCrossSignal ?? null}
              bbUpper={indicators?.bbUpper ?? null}
              bbLower={indicators?.bbLower ?? null}
              pe={fundamentals?.pe ?? null}
              pb={fundamentals?.pb ?? null}
              eps={fundamentals?.eps ?? null}
              dividendYield={fundamentals?.dividendYield ?? null}
              marketCap={fundamentals?.marketCap ?? null}
              pivotR1={pivots?.r1 ?? null}
              pivotS1={pivots?.s1 ?? null}
            />
        ) : null}

        {/* Saham Hari Ini — daily snapshot article */}
        {dailySnapshot && (
          <section className="mt-6">
            <Link
              href={`/berita/${dailySnapshot.slug}`}
              className="block bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover transition-all border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-text-tertiary font-mono">
                  Saham Hari Ini
                </span>
                <span className="text-xs text-text-tertiary font-mono">
                  {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dailySnapshot.publishedAt))}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
                {dailySnapshot.title}
              </p>
              {dailySnapshot.excerpt && (
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{dailySnapshot.excerpt}</p>
              )}
            </Link>
          </section>
        )}

        {/* Indicators + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
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
            ) : isAuthed ? (
              <div className="indicator-card depth-shadow p-8 text-center text-text-secondary">
                Data indikator belum tersedia untuk saham ini
              </div>
            ) : (
              <LoginGate
                feature="Indikator Teknikal"
                message="Daftar gratis untuk membuka panel indikator lengkap — RSI, MACD, Bollinger Bands, Stochastic, ADX, dan moving average."
              />
            )}
          </div>
          <div className="space-y-4">
            {isAuthed ? (
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
            ) : (
              <LoginGate
                feature="Key Statistics"
                message="Daftar gratis untuk membuka data statistik lengkap — OHLC harian, volume, SMA, dan range 52 minggu."
              />
            )}
            {isAuthed ? (
              <div className="space-y-4">
                <HealthScoreDetail
                  signalScore={indicators?.signalScore ?? null}
                  breakdown={signalBreakdown}
                />
                <FundamentalData data={fundamentals} />
                {tradingPlan && <TradingPlanCard plan={tradingPlan} />}
              </div>
            ) : (
              <LoginGate
                feature="Health Score & Fundamental"
                message="Daftar gratis untuk membuka Health Score detail, data fundamental, dan trading plan lengkap."
              />
            )}
          </div>
        </div>

        {/* IDX Company Data Tabs — auth-gated */}
        {isAuthed ? (
          <CompanyDataTabs
            profile={idxProfile}
            commissioners={idxCommissionersSerialized}
            directors={idxDirectorsSerialized}
            shareholders={idxShareholdersSerialized}
            subsidiaries={idxSubsidiariesSerialized}
            dividends={idxDividendsSerialized}
          />
        ) : (
          <LoginGate
            feature="Data Perusahaan"
            message="Daftar gratis untuk melihat data perusahaan lengkap — komisaris, direksi, pemegang saham, dan dividen."
          />
        )}

        {/* Who holds this stock */}
        {await (async () => {
          let holders: { username: string; name: string | null; image: string | null }[] = [];
          let totalHolders = 0;
          try {
            const result = await portfolioService.getStockHolders(ticker, 5);
            holders = result.holders;
            totalHolders = result.total;
          } catch {
            return null;
          }
          if (holders.length === 0) return null;
          return (
            <div className="bg-bg-card depth-shadow rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-500">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h2 className="text-sm font-semibold text-text-primary">
                  Dipantau Komunitas
                </h2>
                <span className="text-[10px] font-mono text-text-tertiary ml-auto">{totalHolders} komunitas</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {holders.map((h) => (
                  <Link
                    key={h.username}
                    href={`/profile/${h.username}`}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-hover hover:bg-teal-50 transition-colors group"
                  >
                    {h.image ? (
                      <img src={h.image} alt={`${h.username} avatar`} className="w-5 h-5 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-[8px] font-bold">
                        {(h.name || h.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-text-secondary group-hover:text-teal-600 transition-colors">
                      {h.username}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Daily Analysis moved up — right after chart */}

        <SentimentGauge ticker={ticker} />
        <RegistrationInlinePrompt ticker={ticker} />
        <StockDiscussion ticker={ticker} />

        <StockFAQWidget ticker={ticker} />

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Artikel Terkait</p>
            <div className="space-y-2">
              {relatedArticles.map((ra) => (
                <Link key={ra.id} href={`/berita/${ra.slug}`} className="group block bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {ra.title}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1 font-mono">
                        {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ra.publishedAt))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sector-related articles */}
        {sectorArticles.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">
              Berita Sektor {sectorToBahasa(stock.sector)}
            </p>
            <div className="space-y-2">
              {sectorArticles.map((sa) => (
                <Link key={sa.id} href={`/berita/${sa.slug}`} className="group block bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {sa.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {sa.tickerTag && (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                            {stripJk(sa.tickerTag)}
                          </span>
                        )}
                        <span className="text-xs text-text-tertiary font-mono">
                          {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(sa.publishedAt))}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── SEO Internal Links: Sector peers + sector page ── */}
        {stock.sector && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">
              Saham Sektor {sectorToBahasa(stock.sector)} Lainnya
            </p>
            <div className="flex flex-wrap gap-2">
              {sectorPeers.slice(0, 10).map((peer) => (
                <Link
                  key={peer}
                  href={`/stocks/${peer}`}
                  className="text-xs font-mono font-semibold px-3 py-1.5 rounded-full bg-bg-card depth-shadow text-text-secondary hover:text-accent hover:border-accent/20 transition-colors"
                >
                  {stripJk(peer)}
                </Link>
              ))}
            </div>
            {/* Sector page link for SEO */}
            <Link
              href={`/sektor/${getSectorSlug(stock.sector)}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Lihat semua saham sektor {sectorToBahasa(stock.sector)} →
            </Link>
          </div>
        )}
      </div>

      <StockAlertBanner ticker={ticker} />
    </div>
    </>
  );
}
