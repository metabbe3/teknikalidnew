import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serialize";
import { marketEngine } from "@/lib/market-engine";
import { IDX_STOCKS } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import { authService } from "@/domains/auth/auth.service";
import { FeaturedStockCard } from "@/components/home/featured-stock-card";
import { PlatformFeatures } from "@/components/home/platform-features";
import { CtaSection } from "@/components/home/cta-section";
import { TickerTape } from "@/components/home/ticker-tape";
import { SahamStrategyLinks } from "@/components/seo/saham-strategy-links";
import { PersonalizedBeranda } from "@/components/home/personalized-beranda";
import { SectorHeatmap } from "@/components/home/sector-heatmap";
import { HoldingTradingPlans } from "@/components/home/holding-trading-plans";
import { portfolioRepository } from "@/domains/portfolio/portfolio.repository";
import { ThesisCard } from "@/components/home/thesis-card";
import { PersonalizedGreeting } from "@/components/home/personalized-greeting";
import { articleRepository } from "@/domains/article/article.repository";
import { SnapshotCard, type SnapshotCardData } from "@/components/berita/snapshot-card";
import { DailyBriefHero } from "@/components/berita/daily-brief-hero";
import { DailyBriefStrip } from "@/components/home/daily-brief-strip";
import { AgentKopiBanner } from "@/components/telegram/agent-kopi-banner";
import { MarketBreathStrip } from "@/components/ui/market-breath-strip";
import { SectionHeading } from "@/components/ui/section-heading";
import { Zap } from "lucide-react";

const ScreenerAiButton = dynamicImport(
  () => import("@/components/screener/screener-ai-modal").then((m) => ({ default: m.ScreenerAiButton })),
  { loading: () => <span className="h-[34px] w-[120px] animate-pulse rounded-full" /> },
);
const HeroSearch = dynamicImport(
  () => import("@/components/home/hero-search").then((m) => ({ default: m.HeroSearch })),
  { loading: () => <div className="h-[52px] bg-bg-card rounded-xl animate-pulse" /> },
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
      <div className="flex items-center gap-2.5 mb-5" aria-hidden="true">
        <span className="h-6 w-1 rounded-full bg-accent/40 animate-pulse" />
        <div className="h-6 w-56 bg-bg-card rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[120px] bg-bg-card rounded-xl animate-pulse" />
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
  isMarketOpen,
}: {
  gainers: OverviewStock[];
  losers: OverviewStock[];
  isMarketOpen: boolean;
}) {
  const [volumeLeaders] = await Promise.all([
    // Owner 24 Okt: "Paling Aktif" jangan duplikat movers % (ticker tape + hero
    // sudah menampilkan gainers/losers) — sumbernya top VOLUME transaksi.
    // code-audit-tk-1: raw SQL pindah ke satu pintu marketSnapshotService.
    marketSnapshotService.getVolumeLeaders(5),
  ]);

  const featuredRaw: FeaturedItem[] = [
    // Owner 24 Okt: kartu utama = top VOLUME (aktif diperdagangkan), bukan movers %
    ...volumeLeaders.map((v) => {
      const changePct = v.close !== null && v.prev !== null && v.prev !== 0
        ? ((v.close - v.prev) / v.prev) * 100
        : null;
      return {
        ticker: v.ticker,
        name: v.name,
        sector: v.sector,
        close: v.close,
        change: v.close !== null && v.prev !== null ? v.close - v.prev : null,
        changePercent: changePct,
        badge: "Teraktif",
        badgeTone: "neutral" as const,
      };
    }),
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
        title={isMarketOpen ? "Paling Banyak Diperdagangkan Hari Ini" : "Paling Banyak Diperdagangkan — Sesi Terakhir"}
        action={
          <span className="text-xs text-text-tertiary font-mono tabular-nums">{featured.length} saham</span>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 stagger-grid">
        {featured.map((s, i) => (
          <div key={s.ticker} style={{ "--stagger-i": i } as React.CSSProperties}>
            <FeaturedStockCard {...s} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default async function HomePage() {
  // TODO(SSR-blocking): getMarketOverview() and getMarketStatusForPage() block the entire
  // page SSR. While force-dynamic + 5-min service cache keeps this fast for now, consider
  // wrapping the hero in a <Suspense> boundary in the future so the shell streams instantly
  // and market data loads asynchronously without delaying first paint.

  // Check auth server-side for conditional rendering
  const currentUser = await authService.getCurrentUser();

  // Fast cached calls only — hero renders immediately
  const [overview, marketInfo, ihsgPrices, homeBrief, oversoldCount] = await Promise.all([
    stockMarketService.getMarketOverview(),
    stockMarketService.getMarketStatusForPage(),
    prisma.stock.findUnique({ where: { ticker: "^JKSE" } })
      .then((stock) => stock ? prisma.stockPrice.findMany({ where: { stockId: stock.id }, orderBy: { date: "desc" }, take: 2 }) : null)
      .catch(() => null),
    // Latest daily brief — 1-click editorial surface for anonymous visitors
    // (flow landing→berita→artikel was 2 clicks + required knowing the nav).
    articleRepository.findLatestDailyBrief().catch(() => null),
    // Extreme-session badge (ceo-idea 17 Okt): oversold breadth count, same
    // criteria as /saham-oversold (RSI<30, non-gorengan, active equities).
    // code-audit-tk-1: SATU PINTU marketSnapshotService (dulu inline duplikat).
    marketSnapshotService.getOversoldCount(),
  ]);

  // Compute IHSG change
  const ihsgLatest = ihsgPrices?.[0];
  const ihsgPrev = ihsgPrices?.[1];
  const ihsgClose = ihsgLatest ? decimalToNumber(ihsgLatest.close) : null;
  const ihsgPrevClose = ihsgPrev ? decimalToNumber(ihsgPrev.close) : null;
  const ihsgChange = ihsgClose !== null && ihsgPrevClose !== null ? ihsgClose - ihsgPrevClose : null;
  const ihsgChangePercent = ihsgClose !== null && ihsgPrevClose !== null
    ? marketEngine.pctChange(ihsgClose, ihsgPrevClose)
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
    const holdings = await portfolioRepository
      .findUserHoldings(currentUser.id)
      .catch(() => [] as { stockTicker: string }[]);

    return (
      <div className="fade-in">
        <TickerTape items={tickerItems} />
        <PersonalizedGreeting name={userName} marketInfo={marketInfo} overview={overview} ihsg={ihsg} />
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">
          {/* Owner 18 Okt: PORTOFOLIO dulu — seperti dashboard pribadi.
              Urutan: portofolio+watchlist → trading plan holdings → delta+streak
              → movers → tesis → quick tools. */}
          <PersonalizedBeranda />
          <HoldingTradingPlans tickers={holdings.map((h) => h.stockTicker)} />
          <details className="group rounded-xl border border-border bg-bg-card p-5">
            <summary className="cursor-pointer list-none flex items-center justify-between text-text-primary font-semibold text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span>Saham Teraktif &amp; Tesis Pasar</span>
                <span className="text-xs text-text-tertiary font-normal">({gainers.length + losers.length} movers)</span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-tertiary transition-transform duration-200 group-open:rotate-180 shrink-0 ml-2"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <div className="mt-4 pt-4 border-t border-border space-y-6">
              <Suspense fallback={<FeaturedSkeleton />}>
                <FeaturedStocksSection gainers={gainers} losers={losers} isMarketOpen={!isClosed} />
              </Suspense>
              <ThesisCard />
            </div>
          </details>
        </div>
      </div>
    );
  }

  // ── Anonymous: marketing homepage ────────────────────────────────

  // Hero signal cards — top movers (anonymous landing)
  const heroMovers = [...gainers.slice(0, 4), ...losers.slice(0, 4)];
  const heroBatch = await stockMarketService.getStockBatchWithIndicators(heroMovers.map((m) => m.ticker));
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
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-14 items-start">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${isClosed ? "text-amber-700 bg-amber-500/10 border-amber-500/20" : "text-bullish bg-bullish/10 border-bullish/20"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-amber-500" : "bg-bullish animate-pulse"}`} aria-hidden />
              {isClosed ? "Pasar Tutup — Data Sesi Terakhir" : "Pasar Buka — Data Real-time"}
            </div>
            {oversoldCount >= 150 && (
              <Link
                href="/saham-oversold"
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border text-red-700 bg-red-500/10 border-red-500/25 hover:bg-red-500/15 transition-colors"
                aria-label={`${oversoldCount} saham oversold — lihat daftar lengkap`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
                <Zap className="inline h-4 w-4 text-amber-500" /> Sesi Ekstrem: {oversoldCount} saham oversold (RSI&lt;30) — lihat daftar
              </Link>
            )}
            <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.03] text-text-primary">
              Analisa Saham IDX Tanpa Nebak-Nebak
            </h1>
            <p className="mt-5 text-base sm:text-lg text-text-secondary max-w-xl leading-relaxed">
              Chart profesional, 9 indikator teknikal, dan screener untuk{" "}
              <span className="font-semibold text-text-primary">{totalStocks}+ saham IDX</span>. Gratis.
            </p>

            {/* Owner 24 Okt: cari saham langsung dari homepage — hemat 1 step ke /stocks */}
            <div className="mt-7">
              <HeroSearch />
              {/* Owner 24 Okt: tombol AI — cari saham sesuai kriteria bahasa manusia */}
              <p className="mt-2.5 text-xs text-text-tertiary">
                Belum tahu cari apa?{" "}
                <ScreenerAiButton />
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/stocks"
                title="IDX Radar — radar saham IDX"
                className="inline-flex items-center gap-2 bg-text-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-text-primary/90 transition-colors press-scale"
              >
                Analisa Sekarang
              </Link>
              <Link
                href="/stocks?view=screener"
                className="inline-flex items-center gap-2 bg-bg-primary text-text-primary border border-border px-6 py-3 rounded-xl font-semibold hover:border-accent/40 transition-colors press-scale"
              >
                Coba Screener
              </Link>
              <a
                href="https://t.me/teknikalid"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-text-primary/80 px-4 py-3 rounded-xl font-medium hover:text-[#229ED9] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-[#229ED9]">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Ikuti Channel Telegram
              </a>
            </div>
          </div>

          {/* Owner 25 Okt: kolom kanan hero — movers 2x2 (sebelumnya area kosong di desktop) */}
          {heroCards.length > 0 && (
            <div className="hidden lg:grid grid-cols-2 gap-3 sm:gap-4 content-start">
              {heroCards.map((c) => (
                <SnapshotCard key={c.ticker} {...c} />
              ))}
            </div>
          )}
          </div>

          {/* Market breath strip (full width) */}
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
            {homeBrief && (
              <div className="mt-5">
                <DailyBriefHero brief={homeBrief} variant="compact" />
              </div>
            )}
            {/* Pasar 1 kalimat + chips Q&A (owner 27 Okt) — client fetch /api/brief/daily, fallback diam */}
            <div className="mt-5">
              <DailyBriefStrip />
            </div>
            {heroCards.length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:hidden">
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
        {/* Cross-sell agent (owner 6 Nov): 1 banner jujur, harga kopi, zero-JS */}
        <AgentKopiBanner source="home" />
        {/* wave2-review (Argon 6 Nov): konten SSR anon dipulihkan ke DOM untuk
            Googlebot — dilipat <details> (paritas beranda login), bukan dihapus. */}
        <details className="group rounded-xl border border-border bg-bg-card p-5">
          <summary className="cursor-pointer list-none flex items-center justify-between text-text-primary font-semibold text-sm [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span>Saham Teraktif Hari Ini</span>
              <span className="text-xs text-text-tertiary font-normal">({gainers.length + losers.length} movers)</span>
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-tertiary transition-transform duration-200 group-open:rotate-180 shrink-0 ml-2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="mt-4 pt-4 border-t border-border space-y-6">
            <Suspense fallback={<FeaturedSkeleton />}>
              <FeaturedStocksSection gainers={gainers} losers={losers} isMarketOpen={!isClosed} />
            </Suspense>
            <SectorHeatmap sectors={sectors} />
          </div>
        </details>

        {/* Kalkulator Trading Plan — folded details */}
        <details className="group rounded-xl border border-border bg-bg-card p-6">
          <summary className="cursor-pointer list-none flex items-center justify-between text-text-primary font-semibold text-lg [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                Kalkulator Trading Plan
              </h2>
              <span className="text-xs text-text-tertiary font-normal">(Area Beli, Target &amp; Cut Loss)</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-tertiary transition-transform duration-200 group-open:rotate-180 shrink-0 ml-2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              Hitung area beli (entry limit), target profit (TP1 &amp; TP2), dan batas rugi (Stop Loss) otomatis berdasarkan Pivot Points dan volatilitas ATR untuk 950+ saham IDX.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/trading-plan"
                className="inline-flex items-center gap-2 bg-text-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-text-primary/90 transition-colors"
              >
                Buka Kalkulator Trading Plan →
              </Link>
              <Link
                href="/stocks/BBCA.JK"
                className="inline-flex items-center gap-2 border border-border bg-bg-hover text-text-primary px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-bg-card transition-colors"
              >
                Contoh Rencana BBCA
              </Link>
            </div>
          </div>
        </details>

        {/* Platform Features — folded details */}
        <PlatformFeatures />

        {/* Screener strategi — de-orphan commercial landing pages */}
        <SahamStrategyLinks />

        {/* CTA Banner */}
        <CtaSection />
      </div>
    </div>
  );
}
