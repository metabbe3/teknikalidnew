import { signalLabelId } from "@/lib/signal-label-id";
import { type Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { bigIntToNumber, decimalToNumber } from "@/lib/serialize";
import {formatPrice, formatPercent, formatVolume, stripJk, changeColor, rsiColor, signalToHealthScore, healthScoreMeta} from "@/lib/utils";
import { normalizeTickerTitle } from "@/lib/normalize-ticker-title";
import { ChartSection } from "@/components/chart/chart-section";
import { IndicatorPanel } from "@/components/stock/indicator-panel";
import { EduCard } from "@/components/akademi/edu-card";
import dynamicImport from "next/dynamic";
const TickerFunnelActions = dynamicImport(
  () => import("@/components/stock/ticker-funnel-actions").then((m) => ({ default: m.TickerFunnelActions })),
  { loading: () => <div className="h-[52px] rounded-xl bg-bg-card animate-pulse" /> },
);
const TickerFab = dynamicImport(
  () => import("@/components/stock/ticker-fab").then((m) => ({ default: m.TickerFab })),
);
import { KeyStatistics } from "@/components/stock/key-statistics";
import { FundamentalData } from "@/components/stock/fundamental-data";
import { TradingPlanCard } from "@/components/stock/trading-plan-card";
import { monteCarloTpFirst } from "@/lib/monte-carlo";
import { cachedEod, eodKey } from "@/domains/stock/eod-cache";
import { HypeWarningBadge } from "@/components/stock/hype-warning-badge";
import { isHscTicker } from "@/lib/hsc-stocks";
import { StockDiscussion } from "@/components/community/stock-discussion";
import { RegistrationInlinePrompt } from "@/components/ui/registration-inline-prompt";
import { StockActionBadge } from "@/components/stock/stock-action-badge";
import { RepeatVisitHint } from "@/components/stock/repeat-visit-hint";
import { VerdictFeedback } from "@/components/stock/verdict-feedback";
import { AlertPreviewCard } from "@/components/stock/alert-preview-card";
import { SentimentGauge } from "@/components/stock/sentiment-gauge";
import { PresenceBadge } from "@/components/stock/presence-badge";
import { StockAlertBanner } from "@/components/stock/stock-alert-banner";
import { StockFAQWidget } from "@/components/faq/stock-faq-widget";
import { CompanyDataTabs } from "@/components/stock/company-data-tabs";
import { StockPaperPosition } from "@/components/paper-trading/stock-paper-position";
import { HealthScoreDetail } from "@/components/stock/health-score-detail";
import { SignalBreakdownDetails } from "@/components/stock/signal-breakdown-details";
import { StockLogo } from "@/components/stock/stock-logo";
import { StockAiModalButton } from "@/components/stock/stock-ai-modal";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { IndicatorTooltip } from "@/components/ui/indicator-tooltip";
import { technicalAnalysisService, computeSignalScore } from "@/domains/stock/technical-analysis.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { calculatePivotPoints } from "@/lib/indicators";
import { summarizeVerdict, toSnapshot } from "@/lib/verdict-prose";
import { subDays } from "date-fns";
import { SITE_URL, isCryptoTicker } from "@/lib/constants";
import { getSectorSlug, sectorToBahasa } from "@/lib/sectors";
import { ShareButtons } from "@/components/ui/share-buttons";
import { articleRepository } from "@/domains/article/article.repository";
import { DATA_SOURCE_LABEL } from "@/domains/article/article-freshness";
import { ArticleContent } from "@/components/article/article-renderer";
import { IDX_STOCKS } from "@/lib/idx-stocks";
import { prisma } from "@/lib/prisma";
import { portfolioService } from "@/domains/portfolio/portfolio.service";
import DailyAnalysisSection from "@/components/stock/daily-analysis-section";
import { LoginGate } from "@/components/auth/login-gate";
import { GuestStockTracker } from "@/components/ui/guest-stock-tracker";
import { GuestOverlimitBanner } from "@/components/ui/guest-overlimit-banner";
import { guestHasQuota } from "@/lib/guest-pass";
import { auth } from "@/lib/auth";
import { AlertTriangle, Banknote, Newspaper } from "lucide-react";

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

  // SEO-optimized title — shortName ≤ 35 chars (suffix stripped, word-boundary cut; root template adds "| TeknikalID" = ~13 chars → total < 60)
  // Price lives in meta description, not title (title stays stable for SERP consistency)
  // GSC intent (CTR 0.8%, pos 67): query user = "harga saham X hari ini" → keyword WAJIB di title.
  const shortName = normalizeTickerTitle(fullName, name);
  // product-audit-2026-10-29 QW3: hilangkan spasi ganjil "( BBCA )" → "(BBCA)"
  // seo-dr-1 (deep-research 641c019): keluar dari medan "harga saham" (Google OneBox+DR75+)
  // → tembak "analisa teknikal + sinyal" yang kosong lawannya di ~535 saham non-LQ45.
  const title = `Saham ${name} (${shortName}) Hari Ini: Harga, Analisa Teknikal & Sinyal`;
  const description = price
    ? `Harga saham ${name} (${fullName}) hari ini ${price}${changeStr}. Analisa teknikal & skor sinyal 0-1, RSI, MACD, support-resistance, modal 1 lot, dan aliran dana asing — gratis tanpa login.`
    : `Analisa teknikal saham ${fullName} (${name}): skor sinyal 0-1, RSI, MACD, support-resistance, modal 1 lot, dan aliran dana asing — gratis tanpa login.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${name} — ${fullName} | TeknikalID`,
      description: description,
      url: `${SITE_URL}${canonicalPath}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Harga Saham ${name} Hari Ini` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${fullName} | TeknikalID`,
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

  // Crypto lives under /crypto/* — redirect before the IDX render.
  // Crypto tickers are stored bare (BTC); IDX with .JK — so a resolved bare ticker = crypto.
  const precheck = await stockRepository.findStockByTicker(ticker);
  if (precheck && !precheck.ticker.endsWith(".JK")) {
    redirect(`/crypto/${precheck.ticker}`);
  }

  // Hybrid freemium: chart + indicator panel are free (chart data fetched client-side,
  // API range-clamped to ~90d for anon). Still gated: key stats, health score,
  // fundamentals, company data, daily analysis — LoginGate placeholders, data never
  // in the anon HTML.
  const session = await auth();
  const isAuthed = !!session?.user;
  // Guest pass v2.1 (owner 20 Okt): dalam kuota gratis (≤5 ticker unik/hari)
  // anon melihat konten penuh — indikator, trading plan, fundamentals, data perusahaan.
  const guestPass = !isAuthed ? await guestHasQuota() : false;
  const fullAccess = isAuthed || guestPass;

  let detail;
  try {
    detail = await stockMarketService.getStockDetailForPage(ticker);
  } catch (e) {
    if (e instanceof StockNotFoundError) notFound();
    throw e;
  }

  const { stock, prices, latest, close, change, changePercent, indicator: indicators, prevIndicator } = detail;
  // seo-dr-1: shortName utk h1 (sama dengan derivasi generateMetadata)
  const shortName = normalizeTickerTitle(detail.stock?.name ?? stripJk(ticker), stripJk(ticker));
  // seo-dr-1: level batas utk answer block (support/resistance toleran-null)
  // Audit UI/UX #3 (30 Okt): SATU angka per konsep — pemula & trader harus lihat level yang SAMA.
  // Dulu: bbLower/bbUpper (Bollinger) vs pivot di blok trader → 2 versi support/resistance di 1 halaman.
  const pivHigh = latest ? decimalToNumber(latest.high) ?? close : null;
  const pivLow = latest ? decimalToNumber(latest.low) ?? close : null;
  const pivots = pivHigh && close
    ? calculatePivotPoints(pivHigh, pivLow ?? close, close)
    : null;
  const supLevel = pivots?.s1 ?? indicators?.sma20 ?? detail.week52Low ?? null;
  const resLevel = pivots?.r1 ?? indicators?.sma50 ?? detail.week52High ?? null;
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
    return `${label} ${days === 0 ? "terjadi hari ini" : `${days} hari lalu`}`; // product-audit-2026-10-29 QW3
  })();

  const emaCrossText = (() => {
    if (!indicators?.emaCrossSignal || !indicators.emaCrossDate) return null;
    const days = Math.floor((now - new Date(indicators.emaCrossDate).getTime()) / 86400000);
    const label = indicators.emaCrossSignal === "bullish" ? "EMA Bullish Cross" : "EMA Bearish Cross";
    return `${label} ${days === 0 ? "terjadi hari ini" : `${days} hari lalu`}`;
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

  // Dynamic per-stock verdict prose (SEO: replaces the static 3-sentence fallback
  // with unique copy per ticker, derived from which indicators actually agree).
  const verdictProse = indicators
    ? summarizeVerdict(toSnapshot(indicators), outlook, close)
    : undefined;

  // Find sector peer tickers for related articles
  const sectorPeers = stock.sector
    ? IDX_STOCKS.filter((s) => s.sector === stock.sector && s.ticker !== ticker).map((s) => s.ticker)
    : [];

  // Owner 24 Okt: chips sektor "terlalu simple" → 6 peer pertama jadi mini-cards dgn harga+%
  const peerBatch = sectorPeers.length
    ? await stockMarketService.getStockBatchWithIndicators(sectorPeers.slice(0, 8)).catch(() => [])
    : [];
  const peerMap = new Map(peerBatch.map((b) => [b.ticker, b]));

  const [socialData, { structure: marketStructure }, fundamentalRow, idxCommissioners, idxDirectors, idxShareholders, idxSubsidiaries, idxDividends, relatedArticles, sectorArticles] = await Promise.all([
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
      where: { status: "PUBLISHED", tickerTag: ticker, articleType: { notIn: ["DAILY_SNAPSHOT", "STOCK_ANALYSIS"] } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, slug: true, title: true, publishedAt: true, articleType: true },
    }),
    sectorPeers.length > 0
      ? prisma.article.findMany({
          where: {
            status: "PUBLISHED",
            tickerTag: { in: sectorPeers },
            articleType: { not: "DAILY_SNAPSHOT" },
            publishedAt: { gte: subDays(new Date(), 14) }, // audit UI/UX 30 Okt: berita basi >14 hari disembunyikan
          },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: { id: true, slug: true, title: true, publishedAt: true, tickerTag: true },
        })
      : [],
  ]);

  // Aliran dana asing 5 sesi terakhir (usp-2026-10-24-04) — graceful: kosong → section hidden.
  const foreignRows = detail
    ? await prisma.foreignFlow.findMany({
        where: { stockId: detail.stock.id },
        orderBy: { date: "desc" },
        take: 5,
      }).catch(() => [])
    : [];
  const foreignWithPx = await Promise.all(
    foreignRows.map(async (f) => {
      const px = await prisma.stockPrice.findUnique({
        where: { stockId_date: { stockId: f.stockId, date: f.date } },
        select: { close: true },
      }).catch(() => null);
      const close = px?.close ? Number(px.close) : null;
      const netShares = Number(f.foreignBuy) - Number(f.foreignSell);
      return { date: f.date, netValue: close !== null ? netShares * close : null };
    })
  );
  const foreignLatest = foreignWithPx.find((f) => f.netValue !== null) ?? null;

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
  // Trust: bar terakhir saham < bar terakhir pasar = saham tidak trade di sesi
  // terakhir (beku/ARA/suspend) — % hero = vs sesi trade terakhirnya (perlu badge).
  // Basis "sesi terakhir pasar" = tanggal indikator pasar (dihitung dari semua saham).
  const marketLatestDate = await stockMarketService
    .getMarketLatestPriceDate()
    .catch(() => null);
  const latestStale =
    latest?.date != null && marketLatestDate != null
      ? latest.date.getTime() < marketLatestDate.getTime()
      : false;
  const avgVolume = prices.length > 1
    ? prices.slice(1).reduce((sum, p) => sum + (bigIntToNumber(p.volume) ?? 0), 0) / (prices.length - 1)
    : 0;
  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 0;

  // Perubahan multi-hari utk konteks AI (close-based)
  const closeAt = (daysAgo: number) => {
    const p = prices[daysAgo];
    return p ? decimalToNumber(p.close) : null;
  };
  const change5d = close !== null && closeAt(5) !== null && closeAt(5)! > 0
    ? ((close - closeAt(5)!) / closeAt(5)!) * 100 : null;
  const change20d = close !== null && closeAt(20) !== null && closeAt(20)! > 0
    ? ((close - closeAt(20)!) / closeAt(20)!) * 100 : null;

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

  // Monte Carlo probability (10.000 jalur / 20 hari) — bootstrap return 150 hari.
  // Angka deterministic per ticker (seed) — stabil seharian, konsisten dgn /trading-plan.
  // cachedEod: on-demand compute sekali, TTL EOD (angka baru tiap sync sore; clearEodCaches
  // dipanggil pasca sync-eod) — hemat query 150-bar + 34ms sim per pageview.
  const mcProbability = tradingPlan && close !== null
    ? await cachedEod(eodKey("mc", stock.ticker), async () => {
        const ps = await stockRepository
          .findPricesByTicker(stock.ticker, { date: { gte: subDays(new Date(), 150) }, volume: { gt: 0 } })
          .catch(() => [] as Awaited<ReturnType<typeof stockRepository.findPricesByTicker>>);
        return monteCarloTpFirst(ps.map((x) => Number(x.close)), tradingPlan.entry, tradingPlan.tp1, tradingPlan.sl, {
          seedKey: stock.ticker,
        });
      }, 24 * 60 * 60 * 1000) // TTL khusus MC: 24 jam — angka hanya berubah pasca eod-sync (clearEodCaches tetap memaksa refresh instan)
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

  // Upcoming cash dividend (ex-date ≤45 hari ke depan) → badge hero.
  // Sumber: StockDividend (IDX profile sync) — idempotent, updated per sync-profiles.
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingDividend = idxDividendsSerialized
    .filter((d) => d.type === "cash" && d.exDate && d.exDate >= todayStr && d.amount !== null)
    .sort((a, b) => (a.exDate! < b.exDate! ? -1 : 1))[0] ?? null;
  const upcomingDividendSoon =
    upcomingDividend && upcomingDividend.exDate! <= new Date(Date.now() + 45 * 86400_000).toISOString().split("T")[0]
      ? upcomingDividend
      : null;

  const ogImageUrl = `${SITE_URL}/api/og/stock?ticker=${encodeURIComponent(ticker)}`;

  // Single FAQ source — feeds both the FAQPage JSON-LD and the visible section
  // (Google: schema must represent content visible on the page).
  const faqItems = [
    {
      q: `Berapa harga saham ${stripJk(ticker)} hari ini?`,
      a: `Harga saham ${stripJk(ticker)} hari ini ${close !== null ? formatPrice(close) : "-"}` + (changePercent !== null ? ` (${formatPercent(changePercent)})` : "") + `. Lihat chart, indikator teknikal, dan analisa lengkap di TeknikalID.`,
    },
    {
      q: `Bagaimana analisis teknikal saham ${stripJk(ticker)}?`,
      a: `Analisis teknikal ${stripJk(ticker)} termasuk RSI, MACD, Support/Resistance, Bollinger Bands, dan sinyal trading tersedia lengkap di halaman ini.`,
    },
    {
      q: `Apa itu saham ${stripJk(ticker)} (${stock.name})?`,
      a: `${stripJk(ticker)} (${stock.name}) adalah emiten yang tercatat di Bursa Efek Indonesia${stock.sector ? `, sektor ${sectorToBahasa(stock.sector)}` : ""}. Pantau pergerakan harga, indikator teknikal, dan diskusi komunitas di TeknikalID.`,
    },
    {
      q: `Bagaimana cara membeli saham ${stripJk(ticker)}?`,
      a: `Untuk membeli saham ${stripJk(ticker)}, Anda membutuhkan rekening efek di sekuritas (perusahaan sekuritas berizin OJK), menyetor dana, lalu melakukan order beli minimum 1 lot = 100 lembar melalui aplikasi broker. Harga live ${stripJk(ticker)} bisa dipantau di halaman ini sebelum eksekusi.`,
    },
    {
      q: `Apa risiko investasi saham ${stripJk(ticker)}?`,
      a: `Risiko investasi saham ${stripJk(ticker)} mencakup risiko pasar (volatilitas IHSG), risiko likuiditas, dan risiko spesifik emiten. Halaman ini bukan nasihat investasi — pantau indikator RSI, MACD, dan support/resistance di halaman ini untuk manajemen risiko.`,
    },
    {
      q: `Sektor apa saham ${stripJk(ticker)} dan bagaimana kinerjanya?`,
      a: `Saham ${stripJk(ticker)} (${stock.name}) berada di sektor ${stock.sector ? sectorToBahasa(stock.sector) : "—"}. Pantau harga dan indikator teknikalnya di halaman ini, atau bandingkan dengan saham sektor yang sama melalui halaman sektor di TeknikalID.`,
    },
    ...(ticker === "HRTA.JK" ? [{
      q: "Apa itu HRTA11 dan apa bedanya dengan saham HRTA?",
      a: "HRTA11 bukan kode efek resmi di Bursa Efek Indonesia — kode saham PT Hartadinata Abadi Tbk adalah HRTA (4 huruf). Jika Anda mencari harga atau analisa saham Hartadinata (produsen perhiasan emas), halaman ini adalah halaman yang tepat.",
    }] : []),
  ];

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
        // Stock schema — Google's preferred type for equities
        "@type": "Stock",
        name: stripJk(ticker),
        description: `Saham ${stock.name} (${stripJk(ticker)}) di Bursa Efek Indonesia${stock.sector ? `, sektor ${sectorToBahasa(stock.sector)}` : ""}.`,
        ticker: `${stripJk(ticker)}.JK`,
        tradingStatus: "ACTIVE",
        exchange: {
          "@type": "Organization",
          name: "Bursa Efek Indonesia",
        },
        ...(close !== null ? {
          price: {
            "@type": "MonetaryAmount",
            value: {
              "@type": "QuantitativeValue",
              value: close,
              unitText: "IDR",
            },
          },
        } : {}),
        ...(fundamentals?.marketCap != null ? {
          marketCapitalization: {
            "@type": "MonetaryAmount",
            value: {
              "@type": "QuantitativeValue",
              value: fundamentals.marketCap,
              unitText: "IDR",
            },
          },
        } : {}),
        issuer: {
          "@type": "Organization",
          name: stock.name,
          ...(stock.sector ? {
            industry: stock.sector,
          } : {}),
        },
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
      // seo-2026-10-29-p1 (audit #4): BreadcrumbList JSON-LD dihapus dari @graph —
      // komponen <Breadcrumbs> (4-item dgn sektor) sudah render schema yang lebih kaya;
      // dua BreadcrumbList di 1 halaman = sinyal duplikat ke Google.
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
    <div className="fade-in stock-detail-root">
      {/* ── AI panel (MLX lokal, ringkasan naratif + Q&A) — menggantikan SignalVerdict

      {/* Price header (light broadsheet) */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-5 space-y-3">
          {/* Breadcrumb */}
          {/* qw-audit-tk-2 (30 Okt): breadcrumb Inggris duplikat DIHAPUS —
              <Breadcrumbs> 4-item di bawah (Beranda > Saham > Sektor > TIKER,
              dgn schema.org lebih kaya) jadi SATU breadcrumb. */}
          {/*
          <nav className="text-xs text-text-tertiary flex items-center gap-1.5 font-mono" aria-label="Breadcrumb">
            <Link href="/stocks" className="hover:text-text-primary transition-colors">Stocks</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-text-secondary" aria-current="page">{stripJk(ticker)}</span>
          </nav>
          */}

          {/* Price Header Card */}
          <div className="rounded-xl border border-border bg-bg-primary/60 p-4 sm:p-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${
              change !== null
                ? (isPositive ? "bg-gradient-to-r from-bullish via-bullish/40 to-transparent" : "bg-gradient-to-r from-bearish via-bearish/40 to-transparent")
                : "bg-gradient-to-r from-accent via-accent/40 to-transparent"
            }`} aria-hidden="true" />

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StockLogo src={stock.logo} name={stock.name} ticker={ticker} />
                  {/* seo-dr-1 → fix owner 30 Okt: h1 = TICKER ringkas (scannable), keyword SEO
                      pindah ke <p> deskriptif di bawahnya — crawler tetap baca keyword di atas fold. */}
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">{stripJk(ticker)}</h1>
                  {indicators?.isGorengan && (
                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1">
                      <AlertTriangle className="inline h-4 w-4" /> Gorengan
                      <IndicatorTooltip indicator="Gorengan" className="opacity-60 hover:opacity-100" />
                    </span>
                  )}
                  {isHscTicker(ticker) && (
                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-bearish-bg text-bearish border border-bearish/30 inline-flex items-center gap-1" title="Kepemilikan saham terkonsentrasi tinggi (penetapan BEI). Likuiditas efektif rendah; dikeluarkan dari perhitungan IHSG per 2 Nov 2026. Tetap dapat diperdagangkan — bukan delisting.">
                      <AlertTriangle className="inline h-4 w-4" /> HSC
                      <IndicatorTooltip indicator="HSC" className="opacity-60 hover:opacity-100" />
                    </span>
                  )}
                  {upcomingDividendSoon && (
                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-bullish-bg text-bullish border border-bullish/30 inline-flex items-center gap-1" title={`Dividen tunai Rp${upcomingDividendSoon.amount!.toLocaleString("id-ID")}/lembar. Tanggal ex: ${upcomingDividendSoon.exDate} — beli SETELAH tanggal ex TIDAK dapat dividen (harga biasanya disesuaikan turun di tanggal ex). Data: pengumuman emiten via IDX.`}>
                      <Banknote className="inline h-4 w-4" /> Div {formatPrice(upcomingDividendSoon.amount!)} · Ex {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(upcomingDividendSoon.exDate!))}
                      <IndicatorTooltip indicator="Dividen" className="opacity-60 hover:opacity-100" />
                    </span>
                  )}
                  <span className="text-text-tertiary" aria-hidden="true">·</span>
                  <span className="text-xs text-text-tertiary font-medium">{sectorToBahasa(stock.sector)}</span>
                </div>
                <p className="text-sm text-text-secondary mt-0.5 truncate">
                  {/* seo-dr-1 (fix owner 30 Okt): frasa keyword "Harga & Analisa Teknikal Saham"
                      turun ke baris nama — h1 kembali ringkas BBCA, crawler tetap baca keyword. */}
                  <span className="text-text-tertiary">Harga &amp; Analisa Teknikal Saham </span>
                  <span className="font-medium">{stock.name}</span>
                  {(() => {
                    const desc = stock.businessActivity?.trim() || stock.subSector?.trim();
                    if (!desc) return null;
                    return (
                      <>
                        <span className="text-text-tertiary" aria-hidden="true"> · </span>
                        <span className="text-text-tertiary font-normal">{desc.charAt(0).toUpperCase() + desc.slice(1)}</span>
                      </>
                    );
                  })()}
                </p>
              </div>
              {close !== null && (
                <div className="text-right shrink-0">
                  <p data-live-price={ticker} className="text-xl sm:text-3xl font-bold tracking-tight leading-none tabular-nums text-text-primary">{formatPrice(close)}</p>
                  {changePercent !== null && (
                    <p data-live-percent={ticker} className={`text-sm mt-1 tabular-nums ${
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
                      {/* Trust: saham tanpa transaksi di sesi terakhir (mis. beku/ARA) —
                          % = vs sesi trade terakhirnya, bukan kemarin. Jujurkan. */}
                      {latestStale && (
                        <span className="block text-[10px] font-normal text-text-tertiary">
                          tidak diperdagangkan di sesi terakhir — % vs sesi trade terakhir
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 opacity-90">
                    <span id="ai" className="block scroll-mt-24" />
                    <StockAiModalButton ticker={ticker} name={stock.name} changePercent={changePercent} isGorengan={indicators?.isGorengan ?? null} />
                  </div>
                  {/* Nudge pasif: kunjungan ke-3 saham sama (guest) — hint simpan pantauan, bukan popup */}
                  <RepeatVisitHint ticker={ticker} />
                </div>
              )}
              {close === null && <StockActionBadge ticker={ticker} />}
              {close === null && <RepeatVisitHint ticker={ticker} />}
            </div>

            {/* Skor Sinyal hero — verdict instan (riset NBER: 6 menit riset, verdict dulu baru data).
                SSR utk semua visitor: trust builder + rich answer utk crawler. */}
            {indicators && indicators.signalScore !== null && indicators.signalScore !== undefined && (() => {
              // product-audit-2026-10-29 #2: unifikasi skala — tampilkan skor brand 0,00-1,00
              // (konsisten /pasar Top-20) alih-alih konversi 0-100 yang membelah identitas.
              const raw = indicators.signalScore;
              const score = signalToHealthScore(raw); // tetap utk meta warna/label band
              if (score === null) return null;
              const meta = healthScoreMeta(score);
              const outlook = signalLabelId(indicators.signalLabel);
              const isBull = /bullish|beli|accumulate/i.test(outlook);
              const isBear = /bearish|jual|sell/i.test(outlook);
              return (
                <div className="mt-4 rounded-xl border border-border bg-bg-card p-4 depth-shadow" aria-label="Skor sinyal teknikal">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: meta.color }}>
                        {raw.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-[10px] font-semibold text-text-tertiary mt-0.5">Skor Sinyal (−1 s.d. +1)</span>
                    </div>
                    <div className="h-10 w-px bg-border shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                        Sinyal: <span style={{ color: isBull ? "var(--color-bullish)" : isBear ? "var(--color-bearish)" : meta.color }}>{outlook}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                      </p>
                      <div className="mt-2 h-2 rounded-full bg-bg-hover overflow-hidden relative" role="meter" aria-valuenow={raw} aria-valuemin={0} aria-valuemax={1} aria-label={`Skor sinyal teknikal ${raw.toFixed(2)} dari 1,00`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: meta.color }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-text-tertiary">Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume</p>
                    </div>
                  </div>
                  <SignalBreakdownDetails breakdown={signalBreakdown} />
                  {/* ret-qw7: arah skor 5 sesi — reason-to-check-back-later */}
                  {(() => {
                    const series = (detail.scoreSeries ?? []).map((r) => r.score).filter((v): v is number => v !== null);
                    if (series.length < 3) return null;
                    const oldest = series[0];
                    const newest = series[series.length - 1];
                    const diff = newest - oldest;
                    const fmt = (v: number) => v.toFixed(2).replace(".", ",");
                    return (
                      <>
                        <p className="mt-3 text-[12px] text-text-secondary">
                          Arah 5 sesi terakhir: {fmt(oldest)} → {fmt(newest)}{" "}
                          <span className={diff > 0.04 ? "text-bullish font-semibold" : diff < -0.04 ? "text-bearish font-semibold" : "text-text-tertiary"}>
                            ({diff > 0 ? "menguat +" : diff < 0 ? "melemah " : "stabil "}{fmt(Math.abs(diff))})
                          </span>
                          <span className="text-text-tertiary"> · dihitung dari penutupan sesi terakhir</span>
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <a
                            href={`/stocks/${ticker}#pantau`}
                            className="flex items-center justify-center gap-1.5 min-h-11 rounded-lg border border-border bg-bg hover:bg-bg-hover text-xs font-medium text-text-secondary transition-colors"
                          >
                            ⭐ Simpan ke pantauan
                          </a>
                          <a
                            href={`https://t.me/TeknikalidBot?start=${ticker.replace(/\.JK$/, "")}_JK`}
                            data-engagement="tg_pantau_skor"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 min-h-11 rounded-lg border border-border bg-bg hover:bg-bg-hover text-xs font-medium text-text-secondary transition-colors"
                          >
                            🔔 Kabari di Telegram
                          </a>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })()}
            {/* seo-dr-1 (deep-research 641c019): Answer block pemula — modal 1 lot + batas bawah/atas.
                Angka konkret di HTML (SERP nyata: halaman yang mencetak angka level harga menang). */}
            {close !== null && (
              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
                <strong className="text-text-primary">Ringkas untuk pemula:</strong> 1 lot (100 lembar) {stripJk(ticker)} = <strong className="text-text-primary">{formatPrice(close * 100)}</strong>
                {supLevel !== null && close > supLevel && (
                  <> · batas bawah (support) sekitar <strong className="text-text-primary">{formatPrice(supLevel)}</strong></>
                )}
                {resLevel !== null && resLevel > 0 && (
                  <> · batas atas (resistance) sekitar <strong className="text-text-primary">{formatPrice(resLevel)}</strong></>
                )}
                {smaCrossText && <> · {smaCrossText}</>}.
              </p>
            )}

            {/* OHLC + 52-week strip — anon-visible (SEO + first impression; data sudah SSR di page) */}
            {close !== null && (
              <div className="mt-4 pt-3 border-t border-border">
                {/* Section nav dipindah ke sticky bar tunggal di bawah (dedupe 15 Okt — dulu 2 baris identik) */}

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-xs" aria-label="Statistik harga hari ini">
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary">Buka</span>
                    <span className="font-mono font-semibold text-text-secondary tabular-nums">{latest ? formatPrice(decimalToNumber(latest.open) ?? close) : "—"}</span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary">Tertinggi</span>
                    <span className="font-mono font-semibold text-text-secondary tabular-nums">{latestHigh !== null ? formatPrice(latestHigh) : "—"}</span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary">Terendah</span>
                    <span className="font-mono font-semibold text-text-secondary tabular-nums">{latestLow !== null ? formatPrice(latestLow) : "—"}</span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary">Volume</span>
                    <span className="font-mono font-semibold text-text-secondary tabular-nums">{latestVolume > 0 ? formatVolume(latestVolume) : "—"}</span>
                  </span>
                  <span className="hidden sm:inline-block self-center w-px h-3.5 bg-border" aria-hidden="true" />
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary">52mgg</span>
                    <span className="font-mono font-semibold text-text-secondary tabular-nums">
                      {detail.week52Low !== null && detail.week52High !== null ? `${formatPrice(detail.week52Low)}–${formatPrice(detail.week52High)}` : "—"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 basis-full sm:basis-auto">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary">Posisi</span>
                    {detail.week52Low !== null && detail.week52High !== null && detail.week52High > detail.week52Low ? (
                      <>
                        <div className="h-1 w-16 rounded-full bg-bg-hover overflow-hidden" role="img" aria-label={`Posisi harga dalam rentang 52 minggu: ${Math.round(((close - detail.week52Low) / (detail.week52High - detail.week52Low)) * 100)}%`}>
                          <div className={`h-full rounded-full ${changePercent !== null && changePercent < 0 ? "bg-bearish" : "bg-bullish"}`} style={{ width: `${Math.min(100, Math.max(0, ((close - detail.week52Low) / (detail.week52High - detail.week52Low)) * 100))}%` }} />
                        </div>
                        <span className="font-mono font-semibold text-text-secondary tabular-nums">{Math.round(((close - detail.week52Low) / (detail.week52High - detail.week52Low)) * 100)}%</span>
                      </>
                    ) : (
                      <span className="font-mono text-text-secondary">—</span>
                    )}
                  </span>
                </div>
                {latest && (
                  <p className="mt-2 text-[10px] text-text-tertiary font-mono">
                    EOD {new Date(latest.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · <span data-live-fresh data-fresh-eod="live saat pasar buka">live saat pasar buka</span>
                  </p>
                )}
              </div>
            )}

            {/* Indicator strip anon DIHAPUS (20 Okt) — redundan: Skor Sinyal hero SSR
                (sinyal+gauge) + 4 kartu indikator hero di bawah + guest meter CTA register */}
            {fullAccess && indicators && close !== null && (
              <div className="border-t border-border mt-5 pt-4">
                {/* Chips RSI/MACD/Vol/Tren DIHAPUS (20 Okt) — duplikat skor hero + kartu indikator.
                    Sisa: cross-badge, freshness, presence (fungsional, bukan duplikasi). */}
                <div className="flex items-center justify-end gap-2 flex-wrap">
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

        {/* Sticky nav — nempel setelah price card terlewat */}
        <div className="sticky top-[57px] z-40 border-b border-border bg-bg-primary/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex gap-1 overflow-x-auto">
            {[
              ["chart", "Chart"],
              ["indikator", "Indikator"],
              ["analisa", "Analisa"],
              ["asing", "Asing"],
              ...(fullAccess ? [["plan", "Trading Plan"]] : []),
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                data-engagement={`nav_${id}`} // 28 Okt: sticky nav sebelumnya tak ter-track (anchor jump tak memicu apa pun)
                className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>



      {/* Alert preview CTA — anon only: tunjukkan value tersembunyi (alert sinyal) saat saham PUNYA sinyal aktif */}
      {!fullAccess && (
        <AlertPreviewCard
          ticker={ticker}
          signalLabel={indicators?.signalLabel ?? null}
          hasSignal={!!(indicators?.signalLabel && indicators.signalLabel.toLowerCase() !== "netral" && indicators.signalLabel.toLowerCase() !== "neutral")}
        />
      )}


        {/* Sticky section nav — akses 1-tap ke semua blok; menjawab bounce "tidak tahu ada data di bawah" */}
        

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-5">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Saham", href: "/stocks" },
            ...(stock.sector
              ? [{ label: sectorToBahasa(stock.sector), href: `/sektor/${getSectorSlug(stock.sector)}` }]
              : []),
            { label: stripJk(ticker) },
          ]}
        />
        {/* Tracker harus jalan utk SEMUA anon (guest pass v2.1): beacon-nya yang
            men-claim quota server-side. Banner overlimit hanya saat gate aktif. */}
        {!isAuthed && (
          <div className="space-y-3">
            <GuestStockTracker ticker={ticker} />
            {!fullAccess && <GuestOverlimitBanner ticker={stripJk(ticker)} />}
          </div>
        )}
        {/* ── SEO Teaser: Technical analysis summary for crawlers (anon only) ── */}
        {/* Renders server-side text that Google can index — real indicator values, not gate copy. */}
        {!fullAccess && indicators && close !== null && (
          <section className="bg-bg-card rounded-xl border border-border p-5 space-y-4" aria-label="Ringkasan analisa teknikal">
            <h2 className="font-serif text-base font-semibold text-text-primary">Ringkasan Analisa Teknikal {stripJk(ticker)}</h2>
            <div className="mt-1"><VerdictFeedback ticker={ticker} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-text-secondary">
                  <span className="font-semibold text-text-primary">Sinyal:</span>{' '}
                  <span style={{ color: outlook === "Bullish" ? "var(--color-bullish)" : outlook === "Bearish" ? "var(--color-bearish)" : "var(--color-text-tertiary)" }}>
                    {outlook}
                  </span>
                  {' — '}
                  {verdictProse || `Indikator teknikal menunjukkan sinyal ${outlook.toLowerCase()} untuk ${stripJk(ticker)}.`}
                </p>
                <p className="text-text-secondary">
                  <span className="font-semibold text-text-primary">Harga:</span> {formatPrice(close)}
                  {changePercent !== null && ` (${formatPercent(changePercent)})`}
                  {latestHigh && latestLow && <> · <span className="font-semibold text-text-primary">Range:</span> {formatPrice(latestLow)} — {formatPrice(latestHigh)}</>}
                </p>
                <p className="text-text-secondary">
                  <span className="font-semibold text-text-primary">Fundamental:</span>{' '}
                  P/E, P/B, dan kapitalisasi pasar — <span className="font-medium text-accent">gratis setelah daftar</span>.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-text-secondary">
                  <span className="font-semibold text-text-primary">Detail indikator:</span>{' '}
                  nilai RSI, MACD, ADX, dan posisi SMA real-time — <span className="font-medium text-accent">buka gratis setelah daftar</span>.
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <RegistrationInlinePrompt ticker={ticker} />
            </div>
          </section>
        )}

        {/* Aliran Dana Asing 5 sesi (usp-2026-10-24-04) — guest-visible, graceful hidden */}
        {foreignLatest && (
          <section id="asing" className="bg-bg-card rounded-xl border border-border p-5 space-y-3 scroll-mt-24" aria-label="Aliran dana asing">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-base font-semibold text-text-primary">Aliran Dana Asing</h2>
              <span className="text-xs text-text-tertiary">5 sesi terakhir · net (beli − jual) asing</span>
            </div>
            {/* Owner 24 Okt: bar vertikal 1-sesi tampak mengambang aneh —
                ganti diverging horizontal bars (sumbu tengah: merah kiri=jual,
                hijau kanan=beli). Rapi di jumlah sesi apapun, makin lama makin
                seperti history chart. */}
            {(() => {
              const valid = foreignWithPx.filter((x) => x.netValue !== null) as { date: Date; netValue: number }[];
              const max = Math.max(...valid.map((x) => Math.abs(x.netValue)), 1);
              const total = valid.reduce((a, b) => a + b.netValue, 0);
              const ordered = foreignWithPx.slice().reverse();
              return (
                <div className="space-y-1.5" role="img" aria-label={`Net aliran dana asing ${valid.length} sesi terakhir`}>
                  {ordered.map((f, i) => {
                    const v = f.netValue;
                    const isLatest = i === ordered.length - 1;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-12 shrink-0 text-[10px] ${isLatest ? "text-text-primary font-semibold" : "text-text-tertiary"}`}>
                          {f.date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })}
                        </span>
                        <div className="flex-1 h-2.5 relative bg-bg-hover/40 rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden />
                          {v !== null && v !== 0 && (
                            <div
                              className={`absolute inset-y-[3px] rounded-full ${v >= 0 ? "left-1/2 bg-bullish/80" : "right-1/2 bg-bearish/80"} ${isLatest ? "" : "opacity-60"}`}
                              style={{ width: `${Math.max(1.5, (Math.abs(v) / max) * 48)}%` }}
                            />
                          )}
                        </div>
                        <span className={`w-16 shrink-0 text-right font-mono tabular-nums text-[11px] ${v === null ? "text-text-tertiary" : v >= 0 ? "text-bullish" : "text-bearish"} ${isLatest ? "font-semibold" : ""}`}>
                          {v === null ? "—" : `${v >= 0 ? "+" : "−"}${(Math.abs(v) / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`}
                        </span>
                      </div>
                    );
                  })}
                  {valid.length > 1 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                      <span className="w-12 shrink-0 text-[10px] text-text-secondary font-medium">Σ {valid.length}s</span>
                      <span className="flex-1 text-[10px] text-text-tertiary">total net</span>
                      <span className={`w-16 shrink-0 text-right font-mono tabular-nums text-[11px] font-semibold ${total >= 0 ? "text-bullish" : "text-bearish"}`}>
                        {`${total >= 0 ? "+" : "−"}Rp${(Math.abs(total) / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
            <p className="text-sm text-text-secondary">
              Sesi terakhir ({foreignLatest.date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}):{' '}
              <span className={foreignLatest.netValue! >= 0 ? "font-semibold text-bullish" : "font-semibold text-bearish"}>
                {foreignLatest.netValue! >= 0 ? "+" : "−"}Rp{(Math.abs(foreignLatest.netValue!) / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
              </span>{' '}
              {foreignLatest.netValue! >= 0 ? "akumulasi asing" : "distribusi asing"}.
            </p>
            <p className="text-xs text-text-tertiary">
              Jejak dana institusi asing = konteks informasi, bukan rekomendasi beli/jual. Lihat agregat pasar di <a className="text-accent hover:underline" href="/pasar">Koran Saham Live</a>.
            </p>
          </section>
        )}

        {/* Pantau via Telegram (retention-2026-10-28) — guest-visible, no-login, bahasa awam, tap target 44px */}
        <section className="bg-bg-card rounded-xl border border-border p-5 space-y-2" aria-label="Pantau via Telegram">
          <h2 className="font-serif text-base font-semibold text-text-primary">Pantau {ticker.replace(/\.JK$/, "")} tiap hari</h2>
          <p className="text-sm text-text-secondary">Dapatkan ringkasan harga &amp; sinyal langsung di Telegram setelah pasar tutup — tanpa perlu login.</p>
          <a
            href={`https://t.me/TeknikalidBot?start=${encodeURIComponent(ticker.replace(/\.JK$/, "") + "_JK")}`}
            data-engagement="tg_pantau_kartu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            🔔 Pantau via Telegram
          </a>
        </section>

        {/* Chart — free for everyone (hybrid freemium). Anon fetches via API, range-clamped to ~90d; the OHLC series is still never SSR-embedded. */}
        <section id="chart" className="scroll-mt-24">
          <ChartSection ticker={ticker} />
        </section>

        {/* Paper trading position card — dipindah ke bawah: jangan rebut fold-1 user baru */}
        {close !== null && <StockPaperPosition ticker={ticker} />}

        {/* Today's market brief, if this stock is mentioned (≤3 days old) — anon-visible internal link */}
        {await (async () => {
          const brief = await articleRepository.findLatestBriefMentioning(ticker).catch(() => null);
          if (!brief) return null;
          return (
            <section className="mt-4" aria-label="Brief pasar terkait">
              <Link
                href={`/berita/${brief.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-accent/25 bg-accent/5 p-4 hover:depth-shadow-hover transition-all"
              >
                <span className="shrink-0 text-lg" aria-hidden><Newspaper className="inline h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Disebut di Brief Pasar Hari Ini</p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary leading-snug group-hover:text-accent transition-colors">
                    {brief.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-accent">Baca brief lengkap →</p>
                </div>
              </Link>
            </section>
          );
        })()}

        {/* Daily Analysis — auth-gated (embeds indicator values in narrative) */}
        <span id="analisa" className="block scroll-mt-24" />
        {/* seo-2026-10-29-p0 (audit #1): internal link ke artikel kenapa-naik —
            575 halaman artikel dapat backlink kontekstual dari stock page (sebelumnya 0) */}
        <p className="text-xs text-text-tertiary">
          Butuh konteks pergerakan?{" "}
          <Link
            href={`/saham/${stripJk(ticker).toLowerCase()}/kenapa-naik-hari-ini`}
            className="text-accent hover:underline"
          >
            Kenapa saham {stripJk(ticker)} naik/turun hari ini →
          </Link>
        </p>
        {fullAccess && close !== null ? (
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

        {/* Indicators + Sidebar */}
        <div id="indikator" className="flex items-center justify-between mb-2 scroll-mt-24 pt-2">
          <h2 className="font-serif text-lg font-semibold text-text-primary">Indikator Teknikal</h2>
          <Link
            href={`/stocks/${ticker}/indikator`}
            className="text-xs text-primary hover:underline"
          >
            Riwayat indikator historis →
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-4">
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
                Data indikator belum tersedia untuk saham ini
              </div>
            )}
            {/* Owner 26 Okt: funnel aksi — compare (modal pilih pembanding) + paper-trading */}
            <TickerFunnelActions ticker={ticker} />
            {/* Owner 26 Okt: FAB mobile-only (share sheet multi-mode + cari saham) — desktop md:hidden */}
            <TickerFab
              ticker={ticker}
              base={stripJk(ticker)}
              price={close !== null ? formatPrice(close) : null}
              changePercent={changePercent}
              signalLabel={indicators?.signalLabel ?? null}
              signalScore={indicators?.signalScore ?? null}
            />
            {/* Owner 24 Okt: funnel belajar — EduCard kontekstual (RSI/MACD → akademi) */}
            <EduCard
              rsi14={indicators?.rsi14 ?? null}
              macdSignal={
                indicators?.macdLine != null && indicators?.macdSignal != null
                  ? indicators.macdLine >= indicators.macdSignal
                    ? "bullish"
                    : "bearish"
                  : null
              }
            />
            {/* Key Stats + Fundamentals pindah ke kiri (owner 21 Okt): rail kanan
                terlalu panjang (4 card stacked 1.809px) sementara kolom kiri
                menyisakan ~1.500px kosong di bawah IndicatorPanel. */}
            <div className="grid grid-cols-1 gap-4 items-start">
              {fullAccess ? (
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
                  className="w-full"
                  feature="Statistik Utama"
                  message="Daftar gratis untuk membuka data statistik lengkap — OHLC harian, volume, SMA, dan range 52 minggu."
                />
              )}
            </div>
          </div>
          <div className="space-y-4">
            {fullAccess ? (
              <div className="space-y-4">
                <span id="plan" className="block scroll-mt-24" />
                {tradingPlan && <TradingPlanCard plan={tradingPlan} mc={mcProbability} />}
                <FundamentalData data={fundamentals} />
              </div>
            ) : (
              <LoginGate
                feature="Trading Plan & Fundamental"
                message="Daftar gratis untuk membuka kalkulator trading plan dan data fundamental saham."
              />
            )}
          </div>
        </div>

        {/* IDX Company Data Tabs — auth-gated */}
        {fullAccess ? (
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

        {/* Visible FAQ — must match the FAQPage JSON-LD above (single source: faqItems) */}
        <section aria-label="Pertanyaan umum" className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="text-xl font-bold text-text-primary mt-8 mb-4">Pertanyaan Umum saham {stripJk(ticker)}</h2>
          <div className="space-y-3">
            {faqItems.map((f) => (
              <details key={f.q}>
                <summary className="text-sm font-semibold text-text-primary">{f.q}</summary>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <StockFAQWidget ticker={ticker} />

        {/* Micro-feedback verdik: Akurat? — semua user (owner 27 Okt) */}
        <div className="pb-2">
          <VerdictFeedback ticker={ticker} />
        </div>


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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sectorPeers.slice(0, 8).map((peer) => {
                const b = peerMap.get(peer);
                return (
                  <Link
                    key={peer}
                    href={`/stocks/${peer}`}
                    data-engagement="funnel_peer_card"
                    className="group bg-bg-card rounded-lg depth-shadow px-3 py-2.5 hover:border-accent/30 hover:depth-shadow-hover transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <StockLogo name={b?.name ?? stripJk(peer)} ticker={peer} size={26} />
                      <span className="font-mono text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                        {stripJk(peer)}
                      </span>
                      {b?.changePercent !== null && b?.changePercent !== undefined && (
                        <span className={`text-[10px] font-semibold tabular-nums ml-auto ${changeColor(b.changePercent)}`}>
                          {b.changePercent >= 0 ? "▲" : "▼"} {Math.abs(b.changePercent).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary truncate mt-1">
                      {b?.name ?? "Analisa →"}
                    </p>
                    {b?.close !== null && b?.close !== undefined ? (
                      <p className="text-[11px] text-text-secondary tabular-nums mt-0.5">{formatPrice(b.close)}</p>
                    ) : (
                      <p className="text-[11px] text-text-tertiary mt-0.5">Analisa →</p>
                    )}
                  </Link>
                );
              })}
            </div>
            {sectorPeers.length > 8 && (
              <div className="flex flex-wrap gap-2">
                {sectorPeers.slice(8, 16).map((peer) => (
                  <Link
                    key={peer}
                    href={`/stocks/${peer}`}
                    data-engagement="funnel_peer_chip"
                    className="text-xs font-mono font-semibold px-3 py-1.5 rounded-full bg-bg-card depth-shadow text-text-secondary hover:text-accent hover:border-accent/20 transition-colors"
                  >
                    {stripJk(peer)}
                  </Link>
                ))}
              </div>
            )}
            {/* Sector page link for SEO */}
            <Link
              href={`/sektor/${getSectorSlug(stock.sector)}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Lihat semua saham sektor {sectorToBahasa(stock.sector)} →
            </Link>
            {/* seo-2026-10-29-p0 (audit #1): link screener kontekstual dari stock page */}
            <Link
              href="/screener"
              className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-accent transition-colors"
            >
              Saring saham lain by indikator di Screener →
            </Link>
          </div>
        )}
      </div>

      <StockAlertBanner ticker={ticker} />
    </div>
    </>
  );
}
