import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serialize";
import { IDX_STOCKS } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { authService } from "@/domains/auth/auth.service";
import { FeaturedStockCard } from "@/components/home/featured-stock-card";
import { SectorHeatmap } from "@/components/home/sector-heatmap";
import { PlatformFeatures } from "@/components/home/platform-features";
import { CtaSection } from "@/components/home/cta-section";
import { TickerTape } from "@/components/home/ticker-tape";
import { SahamStrategyLinks } from "@/components/seo/saham-strategy-links";
import { TradingPlanCard } from "@/components/stock/trading-plan-card";
import { WelcomeBackBanner } from "@/components/ui/welcome-back-banner";
import { PersonalizedBeranda } from "@/components/home/personalized-beranda";
import { MorningDeltaCard } from "@/components/home/morning-delta-card";
import { ThesisCard } from "@/components/home/thesis-card";
import { PersonalizedGreeting } from "@/components/home/personalized-greeting";
import { WelcomeCard } from "@/components/home/welcome-card";
import { ClaimStreakButton } from "@/components/home/claim-streak-button";
import { ForYouSignals } from "@/components/home/for-you-signals";
import { reputationRepository } from "@/domains/reputation/reputation.repository";
import { articleRepository } from "@/domains/article/article.repository";
import { SnapshotCard, type SnapshotCardData } from "@/components/berita/snapshot-card";
import { MarketBreathStrip } from "@/components/ui/market-breath-strip";
import { SectionHeading } from "@/components/ui/section-heading";

const MiniScreenerPreview = dynamicImport(
  () => import("@/components/home/mini-screener-preview").then((m) => ({ default: m.MiniScreenerPreview })),
  { loading: () => <div className="h-[200px] bg-bg-card rounded-xl animate-pulse" /> },
);
const RadarPreview = dynamicImport(
  () => import("@/components/home/radar-preview").then((m) => ({ default: m.RadarPreview })),
  { loading: () => <div className="h-[200px] bg-bg-card rounded-xl animate-pulse" /> },
);

export const metadata: Metadata = {
  title: "Analisa Teknikal Saham IDX & Chart Real-Time",
  description:
    "Platform analisa teknikal saham untuk trader Indonesia — chart interaktif real-time, indikator RSI MACD Bollinger Bands, screener saham gratis, dan komunitas trader Indonesia. Pantau 956+ saham IDX.",
  alternates: { canonical: "/" },
};

// DB not available at build time in Docker — service-level cache handles 5-min caching at runtime
export const dynamic = "force-dynamic";

// ── Skeleton fallbacks ──────────────────────────────────────────────

function FeaturedSkeleton() {
  return (
    <section className="space-y-5">
      <SectionHeading title="Saham Paling Aktif Hari Ini" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[120px] bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}

function SectorSkeleton() {
  return (
    <section className="space-y-5">
      <SectionHeading title="Performa Sektor" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[80px] min-w-[140px] bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}

function PreviewSkeleton() {
  return (
    <section className="space-y-5">
      <SectionHeading eyebrow="live preview" title="Coba Fitur Analisa" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[200px] bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}

// ── Async sub-components for Suspense ───────────────────────────────

type OverviewStock = {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number;
};

type FeaturedItem = {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  badge?: string;
  badgeTone?: "bullish" | "bearish" | "neutral";
};

async function FeaturedStocksSection({
  gainers,
  losers,
}: {
  gainers: OverviewStock[];
  losers: OverviewStock[];
}) {
  const [sparklineMap, oversoldRaw] = await Promise.all([
    stockMarketService.getSparklines(),
    prisma.stockIndicator
      .findMany({
        where: {
          interval: "1d",
          rsi14: { lt: 35 },
          stock: { isActive: true, assetClass: "EQUITY" },
        },
        include: {
          stock: {
            include: {
              prices: { orderBy: { date: "desc" }, take: 2 },
            },
          },
        },
        orderBy: { rsi14: "asc" },
        take: 6,
      })
      .catch(() => []),
  ]);

  const featuredRaw: FeaturedItem[] = [
    ...gainers.slice(0, 2).map((s) => ({
      ...s,
      change: null as number | null,
      badge: "Top Mover",
      badgeTone: "bullish" as const,
    })),
    ...losers.slice(0, 2).map((s) => ({
      ...s,
      change: null as number | null,
      badge: "Top Mover",
      badgeTone: "bearish" as const,
    })),
    ...oversoldRaw.slice(0, 2).map((oi) => {
      const s = oi.stock;
      const prev = s.prices[1];
      const close = s.prices[0] ? decimalToNumber(s.prices[0].close) : null;
      const prevClose = prev ? decimalToNumber(prev.close) : null;
      const changePct = close && prevClose ? ((close - prevClose) / prevClose) * 100 : null;
      return {
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        close,
        change: close && prevClose ? close - prevClose : null,
        changePercent: changePct,
        badge: "Oversold",
        badgeTone: "neutral" as const,
      };
    }),
  ];
  const seen = new Set<string>();
  const featured = featuredRaw.filter((s) => {
    if (seen.has(s.ticker)) return false;
    seen.add(s.ticker);
    return true;
  });

  return (
    <section className="space-y-5">
      <SectionHeading
        title="Saham Paling Aktif Hari Ini"
        action={
          <span className="text-xs text-text-tertiary font-mono tabular-nums">{featured.length} saham</span>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 stagger-grid">
        {featured.map((s, i) => (
          <div key={s.ticker} style={{ "--stagger-i": i } as React.CSSProperties}>
            <FeaturedStockCard
              {...s}
              sparklineData={sparklineMap[s.ticker]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

async function TradingPlanPreview() {
  const sampleDetail = await stockMarketService.getStockDetailForPage("BBCA.JK").catch(() => null);

  let sampleTradingPlan = null;
  if (sampleDetail?.close && sampleDetail?.latest) {
    const ind = sampleDetail.indicator;
    const latestHigh = decimalToNumber(sampleDetail.latest.high) ?? sampleDetail.close;
    const latestLow = decimalToNumber(sampleDetail.latest.low) ?? sampleDetail.close;
    sampleTradingPlan = technicalAnalysisService.generateTradingPlan({
      currentPrice: sampleDetail.close,
      high: latestHigh,
      low: latestLow,
      close: sampleDetail.close,
      prevClose: sampleDetail.prevClose ?? sampleDetail.close,
      atr: ind?.atr ?? null,
      rsi14: ind?.rsi14 ?? null,
      sma20: ind?.sma20 ?? null,
      sma50: ind?.sma50 ?? null,
      sma200: ind?.sma200 ?? null,
      macdHist: ind?.macdHist ?? null,
      supertrend: ind?.supertrend ?? null,
      obvTrend: ind?.obvTrend ?? null,
      stochK: ind?.stochK ?? null,
      stochD: ind?.stochD ?? null,
      adx: ind?.adx ?? null,
    });
  }

  return (
    <section className="space-y-5 content-auto">
      <SectionHeading eyebrow="live preview" title="Coba Fitur Analisa" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MiniScreenerPreview />
        <div className="space-y-4">
          <div className="preview-panel" style={{ background: "linear-gradient(180deg, rgba(13, 148, 136, 0.06) 0%, var(--color-bg-card) 40%)" }}>
            <div className="preview-panel-header">
              <p className="text-xs font-semibold text-text-primary">Contoh Trading Plan</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                BBCA — Otomatis dari Pivot Points & ATR
              </p>
            </div>
            <div className="p-3">
              {sampleTradingPlan ? (
                <TradingPlanCard plan={sampleTradingPlan} />
              ) : (
                <p className="text-xs text-text-tertiary text-center py-6">
                  Trading plan tidak tersedia saat ini
                </p>
              )}
            </div>
            <div className="px-4 pb-3">
              <Link
                href="/stocks/BBCA.JK"
                className="block text-center text-xs text-accent hover:underline font-medium"
              >
                Lihat trading plan lengkap →
              </Link>
            </div>
          </div>
        </div>
        <RadarPreview />
      </div>
    </section>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

// ── First-Session Welcome Loop (PRD idea-2026-10-02-2 / prd-2026-10-02-02) ──
// Server component: derives checklist progress, streak state and day-2+ signals
// surface from existing tables. Each piece fails soft (returns null) so the home
// page never errors. Anonymous users never reach this branch (0 cards, AC5).

type WelcomeLoopUser = { id: string; createdAt: Date };

async function WelcomeLoopSection({ currentUser }: { currentUser: WelcomeLoopUser | null }) {
  if (!currentUser) return null;

  const userCreatedAt = new Date(currentUser.createdAt);
  const daysSinceRegister = Math.floor((Date.now() - userCreatedAt.getTime()) / 86_400_000);

  const [reputation, latestBrief] = await Promise.all([
    reputationRepository.findUserReputation(currentUser.id).catch(() => null),
    articleRepository.findLatestDailyBrief().catch(() => null),
  ]);

  const streak = reputation?.dailyStreak ?? 0;
  const isNewUser = daysSinceRegister < 7;

  // Same-day claim check (server calendar day) so the claim button never renders
  // in a state where clicking it is guaranteed to fail (DailyAlreadyClaimedError).
  const lastClaim = reputation?.lastDailyClaimAt ? new Date(reputation.lastDailyClaimAt) : null;
  const claimedToday = lastClaim !== null && lastClaim.toDateString() === new Date().toDateString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {isNewUser ? (
        <>
          <WelcomeCard userId={currentUser.id} userCreatedAt={userCreatedAt} latestBriefSlug={latestBrief?.slug ?? null} />
          <ClaimStreakButton initialStreak={streak} claimedToday={claimedToday} />
        </>
      ) : (
        <>
          <ForYouSignals userId={currentUser.id} />
          <ClaimStreakButton initialStreak={streak} claimedToday={claimedToday} />
        </>
      )}
    </div>
  );
}

export default async function HomePage() {
  // TODO(SSR-blocking): getMarketOverview() and getMarketStatusForPage() block the entire
  // page SSR. While force-dynamic + 5-min service cache keeps this fast for now, consider
  // wrapping the hero in a <Suspense> boundary in the future so the shell streams instantly
  // and market data loads asynchronously without delaying first paint.

  // Check auth server-side for conditional rendering
  const currentUser = await authService.getCurrentUser();

  // Fast cached calls only — hero renders immediately
  const [overview, marketInfo, ihsgPrices] = await Promise.all([
    stockMarketService.getMarketOverview(),
    stockMarketService.getMarketStatusForPage(),
    prisma.stock.findUnique({ where: { ticker: "^JKSE" } })
      .then((stock) => stock ? prisma.stockPrice.findMany({ where: { stockId: stock.id }, orderBy: { date: "desc" }, take: 2 }) : null)
      .catch(() => null),
  ]);

  // Compute IHSG change
  const ihsgLatest = ihsgPrices?.[0];
  const ihsgPrev = ihsgPrices?.[1];
  const ihsgClose = ihsgLatest ? decimalToNumber(ihsgLatest.close) : null;
  const ihsgPrevClose = ihsgPrev ? decimalToNumber(ihsgPrev.close) : null;
  const ihsgChange = ihsgClose !== null && ihsgPrevClose !== null ? ihsgClose - ihsgPrevClose : null;
  const ihsgChangePercent = ihsgClose !== null && ihsgPrevClose !== null && ihsgPrevClose !== 0
    ? ((ihsgClose - ihsgPrevClose) / ihsgPrevClose) * 100
    : null;
  const ihsg = ihsgClose !== null ? { close: ihsgClose, change: ihsgChange, changePercent: ihsgChangePercent } : null;

  const isClosed = !marketInfo.marketStatus.isOpen;
  const { gainers, losers, sectors } = overview;

  const topGainer = gainers[0];
  const topLoser = losers[0];
  const totalStocks = IDX_STOCKS.length;

  const tickerItems = [...gainers, ...losers].map((s) => ({
    ticker: s.ticker,
    changePercent: s.changePercent as number | null,
  }));

  // ── Logged-in: personalized beranda ──────────────────────────────
  if (currentUser) {
    const userName = currentUser.username ?? currentUser.name ?? "Trader";

    return (
      <div className="fade-in">
        <TickerTape items={tickerItems} />
        <PersonalizedGreeting name={userName} marketInfo={marketInfo} overview={overview} ihsg={ihsg} />
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">
          {/* First-Session Welcome Loop (PRD idea-2026-10-02-2): day-1..7 checklist
              + streak claim; day-2+ (or checklist complete) -> "Sinyal untukmu".
              All derives are fire-safe (failure hides the card, never errors home). */}
          <WelcomeLoopSection currentUser={currentUser} />
          <MorningDeltaCard />
          <ThesisCard />
          <PersonalizedBeranda />
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedStocksSection gainers={gainers} losers={losers} />
          </Suspense>
          <Suspense fallback={<SectorSkeleton />}>
            <SectorHeatmap sectors={sectors} />
          </Suspense>
        </div>
      </div>
    );
  }

  // ── Anonymous: marketing homepage ────────────────────────────────

  // Hero signal cards — top movers (anonymous landing)
  const heroMovers = [...gainers.slice(0, 4), ...losers.slice(0, 4)];
  const [heroSparkMap, heroBatch] = await Promise.all([
    stockMarketService.getSparklines(),
    stockMarketService.getStockBatchWithIndicators(heroMovers.map((m) => m.ticker)),
  ]);
  const heroBatchMap = new Map(heroBatch.map((b) => [b.ticker, b]));
  const heroCards: SnapshotCardData[] = heroMovers.slice(0, 4).map((m) => {
    const b = heroBatchMap.get(m.ticker);
    return {
      ticker: m.ticker,
      slug: `saham-${m.ticker.replace(/\.JK$/i, "").toLowerCase()}`,
      name: m.name,
      sector: m.sector,
      close: m.close,
      changePercent: m.changePercent,
      sparkline: heroSparkMap[m.ticker] ?? [],
      signalScore: b?.signalScore ?? null,
      signalLabel: b?.signalLabel ?? null,
      rsi14: b?.rsi14 ?? null,
      isGorengan: b?.isGorengan ?? false,
    };
  });

  return (
    <div className="fade-in">
      {/* ── Editorial masthead hero ── */}
      <section className="relative overflow-hidden border-b border-border bg-bg-card">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          aria-hidden
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1c1917 1px, transparent 0)", backgroundSize: "22px 22px" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${isClosed ? "text-amber-700 bg-amber-500/10 border-amber-500/20" : "text-bullish bg-bullish/10 border-bullish/20"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-amber-500" : "bg-bullish animate-pulse"}`} aria-hidden />
              {isClosed ? "Pasar Tutup — Data Sesi Terakhir" : "Pasar Buka — Data Real-time"}
            </div>
            <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.03] text-text-primary">
              TeknikalID
            </h1>
            <p className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">
              Trading <span className="text-bullish">tanpa nebak-nebak.</span>
            </p>
            <p className="mt-5 text-base sm:text-lg text-text-secondary max-w-xl leading-relaxed">
              Chart profesional, 12 indikator teknikal, dan screener untuk{" "}
              <span className="font-semibold text-text-primary">{totalStocks}+ saham IDX</span>. Gratis.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/stocks"
                className="inline-flex items-center gap-2 bg-text-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-text-primary/90 transition-colors press-scale"
              >
                Analisa Sekarang
              </Link>
              <Link
                href="/screener"
                className="inline-flex items-center gap-2 bg-bg-primary text-text-primary border border-border px-6 py-3 rounded-xl font-semibold hover:border-accent/40 transition-colors press-scale"
              >
                Coba Screener
              </Link>
            </div>
          </div>

          {/* Market breath + hero signal grid */}
          <div className="mt-10 pt-8 border-t border-border">
            <MarketBreathStrip
              data={{
                advancersCount: overview.advancersCount,
                declinersCount: overview.declinersCount,
                unchangedCount: overview.unchangedCount,
                topGainer,
                topLoser,
                ihsg,
              }}
            />
            {heroCards.length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {heroCards.map((c) => (
                  <SnapshotCard key={c.ticker} {...c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ticker Tape */}
      <TickerTape items={tickerItems} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">
        {/* Welcome Back Banner for returning anonymous visitors */}
        <WelcomeBackBanner />

        {/* Try it — interactive tool previews (show-don't-tell, pairs with hero CTAs) */}
        <Suspense fallback={<PreviewSkeleton />}>
          <TradingPlanPreview />
        </Suspense>

        {/* Featured Stocks — the single proper movers showcase */}
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedStocksSection gainers={gainers} losers={losers} />
        </Suspense>

        {/* Sector Heatmap */}
        <Suspense fallback={<SectorSkeleton />}>
          <SectorHeatmap sectors={sectors} />
        </Suspense>

        {/* Platform Features */}
        <PlatformFeatures />

        {/* Screener strategi — de-orphan commercial landing pages */}
        <SahamStrategyLinks />

        {/* CTA Banner */}
        <CtaSection />
      </div>
    </div>
  );
}
