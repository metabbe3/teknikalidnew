import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { TrendingUp, TrendingDown, Activity, Search, ArrowUpRight } from "lucide-react";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { SnapshotCard, type SnapshotCardData } from "@/components/berita/snapshot-card";
import { BeritaPagination, buildBeritaUrl } from "./berita-grid";

export const revalidate = 300;

const PAGE_SIZE = 24;

type SearchParams = Promise<{ trend?: string; q?: string; page?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { trend, q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const filtered = !!(trend || q);
  const links: Record<string, string> = {};
  if (currentPage > 1) links.prev = buildBeritaUrl(currentPage - 1, trend, q);
  links.next = buildBeritaUrl(currentPage + 1, trend, q);

  const title = filtered
    ? "Saham Hari Ini — Sinyal & Analisa Teknikal IDX"
    : "Saham Hari Ini: Harga, Sinyal Trading & Analisa Teknikal IDX — TeknikalID";
  const description =
    "Saham hari ini: harga terbaru, sinyal trading (RSI, MACD, SMA), dan analisa teknikal harian untuk ratusan saham IDX. Pantau top mover dan sinyal bullish/bearish.";

  const isSearch = !!q;
  return {
    title,
    description,
    // Self-referencing canonical per page/filter — paginated & filtered views show
    // different articles, so collapsing them onto /berita caused 114 "duplicate,
    // no canonical". Search-results pages (?q=) are noindex per Google guidance.
    ...(isSearch ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: isSearch ? "/berita" : buildBeritaUrl(currentPage, trend, q) },
    keywords: [
      "saham hari ini", "harga saham hari ini", "sinyal saham", "saham naik hari ini",
      "top mover saham", "analisa saham hari ini", "sinyal trading saham", "saham idx",
    ],
    openGraph: {
      title: "Saham Hari Ini — Sinyal & Analisa Teknikal IDX",
      description: description,
      url: `${SITE_URL}/berita`,
      images: [{ url: `${SITE_URL}/api/og?title=Saham+Hari+Ini&type=berita`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: "Saham Hari Ini — TeknikalID", description },
    ...(Object.keys(links).length > 0 ? { other: links } : {}),
  };
}

export default async function BeritaPage({ searchParams }: { searchParams: SearchParams }) {
  const { trend, q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const query = (q ?? "").trim().toUpperCase();
  const activeTrend = trend === "gain" ? "gain" : trend === "loss" ? "loss" : "all";

  // All DAILY_SNAPSHOT (regenerated daily per ticker) — light select, no content body.
  const snapshots = await prisma.article.findMany({
    where: {
      status: ArticleStatus.PUBLISHED,
      isListed: true,
      articleType: "DAILY_SNAPSHOT" as ArticleType,
      tickerTag: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, slug: true, title: true, tickerTag: true, publishedAt: true },
  });

  const tickers = Array.from(new Set(snapshots.map((s) => s.tickerTag!).filter(Boolean)));

  const [sparklineMap, batch, overview] = await Promise.all([
    stockMarketService.getSparklines(),
    stockMarketService.getStockBatchWithIndicators(tickers),
    stockMarketService.getMarketOverview(),
  ]);
  const batchMap = new Map(batch.map((b) => [b.ticker, b]));

  // Build card data
  let cards = snapshots.map<SnapshotCardData>((s) => {
    const t = s.tickerTag!;
    const b = batchMap.get(t);
    return {
      ticker: t,
      slug: s.slug,
      name: b?.name ?? s.title,
      sector: b?.sector ?? null,
      close: b?.close ?? null,
      changePercent: b?.changePercent ?? null,
      sparkline: sparklineMap[t] ?? [],
      signalScore: b?.signalScore ?? null,
      signalLabel: b?.signalLabel ?? null,
      rsi14: b?.rsi14 ?? null,
      isGorengan: b?.isGorengan ?? false,
    };
  });

  // Filter
  if (query) {
    cards = cards.filter(
      (c) => c.ticker.replace(/\.JK$/i, "").includes(query) || c.name.toUpperCase().includes(query),
    );
  }
  if (activeTrend === "gain") cards = cards.filter((c) => (c.changePercent ?? 0) > 0);
  if (activeTrend === "loss") cards = cards.filter((c) => (c.changePercent ?? 0) < 0);

  // Sort: biggest movers first (most interesting); gain → strongest up, loss → strongest down
  cards.sort((a, b) => {
    const av = a.changePercent ?? -Infinity;
    const bv = b.changePercent ?? -Infinity;
    if (activeTrend === "gain") return bv - av;
    if (activeTrend === "loss") return av - bv;
    return Math.abs(bv) - Math.abs(av);
  });

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageCards = cards.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
  const topGainer = overview.gainers[0];
  const topLoser = overview.losers[0];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Saham Hari Ini", url: `${SITE_URL}/berita` },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Berita", item: `${SITE_URL}/berita` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      <div className="min-h-screen bg-bg-primary">
        {/* ── Editorial masthead ── */}
        <section className="border-b border-border bg-bg-card">
          <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              <time dateTime={new Date().toISOString()}>{today}</time>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-text-primary leading-[1.05]">
              Saham Hari Ini
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
              Ringkasan teknikal harian untuk ratusan saham IDX — harga terbaru, sinyal trading, dan analisa indikator. Klik saham untuk analisa lengkap.
            </p>

            {/* Market breadth strip */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-bullish">
                <TrendingUp className="h-4 w-4" aria-hidden />
                {overview.advancersCount} naik
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-bearish">
                <TrendingDown className="h-4 w-4" aria-hidden />
                {overview.declinersCount} turun
              </span>
              <span className="text-text-tertiary">{overview.unchangedCount} stagnan</span>
              {topGainer && (
                <Link href={`/berita/saham-${topGainer.ticker.replace(/\.JK$/i, "").toLowerCase()}`}
                  className="hidden sm:inline-flex items-center gap-1 text-text-secondary hover:text-bullish transition-colors">
                  Top Gainer:
                  <span className="font-mono font-bold text-bullish">{topGainer.ticker.replace(/\.JK$/i, "")}</span>
                  <span className="font-mono text-bullish">+{topGainer.changePercent.toFixed(2)}%</span>
                </Link>
              )}
              {topLoser && (
                <Link href={`/berita/saham-${topLoser.ticker.replace(/\.JK$/i, "").toLowerCase()}`}
                  className="hidden sm:inline-flex items-center gap-1 text-text-secondary hover:text-bearish transition-colors">
                  Top Loser:
                  <span className="font-mono font-bold text-bearish">{topLoser.ticker.replace(/\.JK$/i, "")}</span>
                  <span className="font-mono text-bearish">{topLoser.changePercent.toFixed(2)}%</span>
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* ── Filter bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {([
                { value: "all", label: "Semua" },
                { value: "gain", label: "Naik" },
                { value: "loss", label: "Turun" },
              ] as const).map((f) => (
                <Link
                  key={f.value}
                  href={buildBeritaUrl(1, f.value === "all" ? undefined : f.value, q)}
                  aria-current={activeTrend === f.value ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTrend === f.value
                      ? "bg-text-primary text-white"
                      : "bg-bg-card text-text-secondary border border-border hover:border-accent/30"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>

            <form className="relative sm:ml-auto sm:w-72" action="/berita" method="GET" role="search">
              {activeTrend !== "all" && <input type="hidden" name="trend" value={activeTrend} />}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Cari ticker / nama saham…"
                aria-label="Cari saham"
                className="w-full rounded-full border border-border bg-bg-card pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
              />
            </form>
          </div>

          {/* ── Signal-card grid ── */}
          {pageCards.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-text-tertiary">Tidak ada saham yang cocok dengan filter ini.</p>
              <Link href="/berita" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
                Reset filter
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {pageCards.map((c) => (
                <SnapshotCard key={c.ticker} {...c} />
              ))}
            </div>
          )}

          <BeritaPagination currentPage={safePage} totalPages={totalPages} trend={activeTrend !== "all" ? activeTrend : undefined} q={q} />

          {/* Footer link to screener */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl depth-shadow border border-border/60 bg-bg-card p-5">
            <div>
              <p className="text-sm font-semibold text-text-primary">Cari saham berdasarkan sinyal teknikal</p>
              <p className="text-xs text-text-tertiary mt-0.5">Golden cross, oversold, volume spike — filter ratusan saham IDX sekaligus.</p>
            </div>
            <Link href="/screener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline whitespace-nowrap">
              Buka Screener <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
