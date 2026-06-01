import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serialize";
import { SITE_URL, IDX_STOCKS, SECTORS } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { FeaturedStockCard } from "@/components/home/featured-stock-card";
import { SectorHeatmap } from "@/components/home/sector-heatmap";
import { PlatformFeatures } from "@/components/home/platform-features";
import { CtaSection } from "@/components/home/cta-section";
import { TickerTape } from "@/components/home/ticker-tape";
import { MiniScreenerPreview } from "@/components/home/mini-screener-preview";
import { RadarPreview } from "@/components/home/radar-preview";
import { TradingPlanCard } from "@/components/stock/trading-plan-card";

export const metadata: Metadata = {
  title: "TeknikalID — Analisa Teknikal Saham BEI Terlengkap",
  description:
    "Analisa teknikal saham BEI real-time. Chart interaktif, indikator RSI MACD Bollinger Bands, screener saham, dan komunitas trader Indonesia.",
  alternates: { canonical: "/" },
};

// Force dynamic rendering — DB not available at build time in Docker
export const dynamic = "force-dynamic";

// ── Skeleton fallbacks ──────────────────────────────────────────────

function FeaturedSkeleton() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" />
        <h2 className="text-lg font-semibold tracking-tight">Saham Paling Aktif</h2>
      </div>
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
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" />
        <h2 className="text-lg font-semibold tracking-tight">Performa Sektor</h2>
      </div>
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
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" />
        <h2 className="text-lg font-semibold tracking-tight">Coba Langsung</h2>
      </div>
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
  badgeColor?: string;
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
          stock: { isActive: true },
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
      badgeColor: "#0d9488",
    })),
    ...losers.slice(0, 2).map((s) => ({
      ...s,
      change: null as number | null,
      badge: "Top Mover",
      badgeColor: "#dc2626",
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
        badgeColor: "#8b5cf6",
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
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">Saham Paling Aktif</h2>
      </div>
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
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">Coba Langsung</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MiniScreenerPreview />
        <div className="space-y-4">
          <div className="preview-panel depth-shadow" style={{ borderTop: "3px solid #0d9488" }}>
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

export default async function HomePage() {
  // Fast cached calls only — hero renders immediately
  const [overview, marketInfo] = await Promise.all([
    stockMarketService.getMarketOverview(),
    stockMarketService.getMarketStatusForPage(),
  ]);

  const isClosed = !marketInfo.marketStatus.isOpen;
  const { gainers, losers, sectors } = overview;

  const topGainer = gainers[0];
  const topLoser = losers[0];
  const totalStocks = IDX_STOCKS.length;
  const totalSectors = SECTORS.length;

  const tickerItems = [...gainers, ...losers].map((s) => ({
    ticker: s.ticker,
    changePercent: s.changePercent as number | null,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TeknikalID",
    url: SITE_URL,
    description: "Platform analisa teknikal saham BEI terlengkap",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/stocks?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Section 1: Terminal Hero */}
      <section className="akademi-hero" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="relative z-[1] max-w-7xl mx-auto px-4 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
            <div className="max-w-xl space-y-6">
              <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${isClosed ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-teal-400 bg-teal-500/10 border-teal-500/20"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-amber-400" : "bg-teal-400 animate-pulse"}`} aria-hidden="true" />
                {isClosed ? "Pasar Tutup — Data Sesi Terakhir" : "Data Pasar Saham Hari Ini"}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-white">
                Analisa Teknikal
                <br />
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  Saham BEI
                </span>
              </h1>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                Chart interaktif, indikator teknikal, dan screener untuk{" "}
                <span className="text-white font-semibold">{totalStocks}+ saham</span> IDX dari{" "}
                <span className="text-white font-semibold">{totalSectors} sektor</span>.
                <span className="akademi-cursor" />
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/stocks"
                  className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors press-scale"
                >
                  Lihat Saham
                </Link>
                <Link
                  href="/screener"
                  className="bg-white/10 text-white border border-white/15 px-6 py-2.5 rounded-lg font-medium hover:bg-white/20 transition-all press-scale"
                >
                  Coba Screener
                </Link>
              </div>
            </div>

            {/* Market Pulse Panel */}
            <div className="hidden lg:flex flex-col gap-2.5 min-w-[220px]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">
                Market Pulse{isClosed ? " (sesi terakhir)" : ""}
              </p>
              {topGainer && (
                <div className="terminal-stat">
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Top Gainer</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-white">{topGainer.ticker.replace(".JK", "")}</span>
                    <span className="text-sm font-bold font-mono text-bullish tabular-nums">
                      +{topGainer.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              {topLoser && (
                <div className="terminal-stat">
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Top Loser</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-white">{topLoser.ticker.replace(".JK", "")}</span>
                    <span className="text-sm font-bold font-mono text-bearish tabular-nums">
                      {topLoser.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              <div className="terminal-stat">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Tracking</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-white">{totalStocks}+</span>
                  <span className="text-xs text-gray-400">saham</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Ticker Tape */}
      <TickerTape items={tickerItems} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">
        {/* Section 3: Featured Stocks — lazy-loaded with Suspense */}
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedStocksSection gainers={gainers} losers={losers} />
        </Suspense>

        {/* Section 4: Sector Heatmap */}
        <Suspense fallback={<SectorSkeleton />}>
          <SectorHeatmap sectors={sectors} />
        </Suspense>

        {/* Section 5: "Coba Langsung" — Interactive Tool Previews */}
        <Suspense fallback={<PreviewSkeleton />}>
          <TradingPlanPreview />
        </Suspense>

        {/* Section 6: Platform Features */}
        <PlatformFeatures />

        {/* Section 7: CTA Banner */}
        <CtaSection />
      </div>
    </div>
  );
}
