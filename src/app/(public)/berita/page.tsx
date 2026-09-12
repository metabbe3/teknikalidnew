import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight } from "lucide-react";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { weeklyReportService } from "@/domains/stock/weekly-report.service";
import { articleRepository } from "@/domains/article/article.repository";
import { DailyBriefHero } from "@/components/berita/daily-brief-hero";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Brief Pasar Saham Hari Ini — Berita & Analisa IDX";
  const description =
    "Brief pasar saham IDX setiap hari: ringkasan pergerakan IHSG, top movers, dan sinyal teknikal — semua saham yang disebut terhubung ke chart-nya. Ditulis dari data asli TeknikalID.";
  return {
    title,
    description,
    alternates: { canonical: "/berita" },
    keywords: [
      "brief pasar saham", "brief saham hari ini", "ringkasan pasar idx",
      "berita saham hari ini", "saham hari ini", "top mover saham",
    ],
    openGraph: {
      title: "Brief Pasar Saham Hari Ini | TeknikalID",
      description,
      url: `${SITE_URL}/berita`,
      images: [{ url: `${SITE_URL}/api/og?title=Brief+Pasar+Saham+Hari+Ini&type=berita`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: "Brief Pasar Saham Hari Ini — TeknikalID", description },
  };
}

function fmtDateId(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
}

export default async function BeritaPage() {
  // Brief-centric listing (2026-09-10): the old per-ticker DAILY_SNAPSHOT grid is
  // gone — only ~6 snapshots/day are still generated (movers), so the grid was
  // 99% stale rows. Snapshot pages stay live for long-tail SEO; they're just not
  // listed here anymore.
  // All fire-soft: build-stage prerender has no DB — empty states render and the
  // hourly ISR revalidate fills them in production.
  const [brief, briefsArchive, overview, recentWeeks] = await Promise.all([
    articleRepository.findLatestDailyBrief().catch(() => null),
    prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        isListed: true,
        articleType: { in: [ArticleType.NEWS, ArticleType.GENERAL] as ArticleType[] },
      },
      orderBy: { publishedAt: "desc" },
      take: 12,
      select: { slug: true, title: true, excerpt: true, publishedAt: true, articleType: true },
    }).catch(() => [] as { slug: string; title: string; excerpt: string | null; publishedAt: Date; articleType: ArticleType }[]),
    stockMarketService.getMarketOverview().catch(() => ({
      gainers: [] as { ticker: string; changePercent: number }[],
      losers: [] as { ticker: string; changePercent: number }[],
      sectors: {},
      advancersCount: 0,
      declinersCount: 0,
      unchangedCount: 0,
    })),
    // Same anchor the /laporan-pasar hub uses (latest data week) so this block
    // always links the hub's actual TERBARU edition — never a data-less week.
    weeklyReportService.getRecentWeeks(1).catch(() => [] as Date[]),
  ]);
  const latestWeek = recentWeeks[0] ?? null;

  // WIB display — container runs UTC; without an explicit timeZone the masthead
  // shows the previous day between 00:00-06:59 WIB.
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const topGainer = overview.gainers[0];
  const topLoser = overview.losers[0];

  const breadcrumbJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Brief Pasar Saham", url: `${SITE_URL}/berita` },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Berita", item: `${SITE_URL}/berita` },
        ],
      },
    ],
  });

  return (
    <>
      <script type="application/ld+json">{breadcrumbJsonLd}</script>
      <div className="min-h-screen bg-bg-primary">
        {/* ── Editorial masthead ── */}
        <section className="border-b border-border bg-bg-card">
          <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              <time dateTime={new Date().toISOString()}>{today}</time>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-text-primary leading-[1.05]">
              Brief Pasar Hari Ini
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
              Ringkasan pasar IDX setiap hari dari data asli TeknikalID — IHSG, top movers, dan sinyal teknikal. Setiap saham yang disebut terhubung langsung ke chart-nya.
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
                <Link href={`/stocks/${topGainer.ticker}`}
                  className="hidden sm:inline-flex items-center gap-1 text-text-secondary hover:text-bullish transition-colors">
                  Top Gainer:
                  <span className="font-mono font-bold text-bullish">{topGainer.ticker.replace(/\.JK$/i, "")}</span>
                  <span className="font-mono text-bullish">+{topGainer.changePercent.toFixed(2)}%</span>
                </Link>
              )}
              {topLoser && (
                <Link href={`/stocks/${topLoser.ticker}`}
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
          {/* ── Featured daily brief ── */}
          <DailyBriefHero brief={brief ? { slug: brief.slug, title: brief.title, excerpt: brief.excerpt, publishedAt: brief.publishedAt } : null} />

          {/* ── Brief & article archive ── */}
          <section aria-label="Arsip brief dan artikel">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-text-primary">Brief & Artikel Terbaru</h2>
              <span className="text-xs text-text-tertiary">{briefsArchive.length} tulisan</span>
            </div>

            {briefsArchive.length === 0 ? (
              <p className="text-center text-text-tertiary py-12">
                Belum ada brief. Brief pertama terbit setelah pasar tutup hari ini.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-bg-card">
                {briefsArchive.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/berita/${a.slug}`}
                    className="group flex items-start gap-4 p-4 first:rounded-t-xl last:rounded-b-xl hover:bg-bg-hover/50 transition-colors"
                  >
                    <time className="shrink-0 pt-0.5 text-xs font-mono text-text-tertiary tabular-nums w-20">
                      {fmtDateId(a.publishedAt).replace(/ 20\d\d$/, "")}
                    </time>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary leading-snug group-hover:text-accent transition-colors">
                        {a.title}
                      </p>
                      {a.excerpt && (
                        <p className="mt-1 text-xs text-text-secondary line-clamp-1 leading-relaxed">{a.excerpt}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Weekly market report ── */}
          <section aria-label="Laporan pasar mingguan" className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-text-primary">Laporan Pasar Mingguan</h2>
              <Link href="/laporan-pasar" className="text-xs font-semibold text-accent hover:underline">
                Semua laporan →
              </Link>
            </div>
            {latestWeek && (
            <Link
              href={`/laporan-pasar/minggu-${latestWeek.toISOString().slice(0, 10)}`}
              className="group flex items-start gap-4 rounded-xl border border-border bg-bg-card p-5 hover:depth-shadow-hover transition-all"
            >
              <span className="shrink-0 text-lg" aria-hidden>📊</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-snug group-hover:text-accent transition-colors">
                  Laporan Pasar Minggu {fmtDateId(latestWeek)}
                </p>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  Rekap mingguan dari data asli TeknikalID: breadth, sektor, top movers, dan persilangan SMA.
                </p>
              </div>
            </Link>
            )}
          </section>

          {/* Footer CTAs — screener + register */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl depth-shadow border border-border/60 bg-bg-card p-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">Cari saham berdasarkan sinyal teknikal</p>
                <p className="text-xs text-text-tertiary mt-0.5">Golden cross, oversold, volume spike — filter ratusan saham IDX.</p>
              </div>
              <Link href="/stocks?view=screener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline whitespace-nowrap">
                Buka Screener <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl depth-shadow border border-accent/25 bg-accent/5 p-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">Brief harian, gratis di inbox beranda Anda</p>
                <p className="text-xs text-text-tertiary mt-0.5">Daftar — pantauan saham, trading plan, dan notifikasi sinyal.</p>
              </div>
              <Link href="/auth/register" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-lg px-4 py-2 whitespace-nowrap">
                Daftar Gratis <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
