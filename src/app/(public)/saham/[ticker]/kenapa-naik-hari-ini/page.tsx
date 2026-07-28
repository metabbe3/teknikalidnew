import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { ArticleType, ArticleStatus } from "@/generated/prisma/client";
import { ArticleContent, estimateReadingTime } from "@/components/article/article-renderer";
import { ArrowLeft, ChevronRight, TrendingUp, TrendingDown, Activity, ListChecks } from "lucide-react";
import { ShareButtons } from "@/components/ui/share-buttons";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { explainMove, type MoveExplainer } from "@/lib/verdict-prose";

export const revalidate = 3600; // 1 hour ISR
export const dynamic = "force-dynamic";

async function loadKenapaData(tickerRaw: string) {
  const tickerUpper = tickerRaw.toUpperCase();
  const tickerJK = tickerUpper.endsWith(".JK") ? tickerUpper : `${tickerUpper}.JK`;
  const tickerClean = tickerUpper.replace(/\.JK$/, "");

  let base;
  try {
    base = await stockMarketService.getStockDetailForPage(tickerJK);
  } catch (e) {
    if (e instanceof StockNotFoundError) return null;
    throw e;
  }

  const changePercent = base.changePercent;
  const explainer = explainMove({
    ticker: tickerJK,
    latest: base.indicator,
    prev: base.prevIndicator,
    changePercent,
  });

  const article = await prisma.article.findFirst({
    where: {
      articleType: ArticleType.MOVEMENT_ANALYSIS,
      status: ArticleStatus.PUBLISHED,
      OR: [
        { tickerTag: tickerJK },
        { tickerTag: tickerClean },
        { slug: { startsWith: `kenapa-saham-${tickerClean.toLowerCase()}` } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { name: true, username: true, image: true } } },
  });

  return {
    tickerJK,
    tickerClean,
    name: base.stock.name,
    changePercent,
    explainer,
    asOfDate: base.latest?.date ?? null,
    article,
  };
}

function directionLabel(d: MoveExplainer["direction"] | undefined): string {
  if (d === "naik") return "Naik";
  if (d === "turun") return "Turun";
  return "Datar";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const data = await loadKenapaData(ticker);
  if (!data) return {};

  const { name, tickerClean, explainer, article } = data;
  const dir = directionLabel(explainer?.direction);

  const title = article?.title
    ?? (dir === "Datar"
      ? `Analisis Teknikal Saham ${name} (${tickerClean}) Hari Ini`
      : `Kenapa Saham ${name} ${dir} Hari Ini — Analisis Teknikal ${tickerClean}`);

  const description =
    article?.excerpt ?? explainer?.prose.slice(0, 160) ?? `Analisis teknikal dan pergerakan harga saham ${name} hari ini.`;

  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&type=movement&ticker=${tickerClean}`;

  return {
    title,
    description,
    alternates: { canonical: `/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini`,
      publishedTime: data.asOfDate ? data.asOfDate.toISOString() : undefined,
      modifiedTime: article?.updatedAt?.toISOString() ?? data.asOfDate?.toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    keywords: [
      `kenapa saham ${tickerClean} naik`,
      `kenapa saham ${tickerClean} turun`,
      `harga saham ${tickerClean} hari ini`,
      `analisa saham ${tickerClean}`,
      `analisis teknikal ${tickerClean}`,
      `saham ${tickerClean}`,
    ],
  };
}

export default async function MovementAnalysisPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const data = await loadKenapaData(ticker);
  if (!data) notFound();

  const { tickerClean, tickerJK, name, explainer, asOfDate, article } = data;
  const dir = directionLabel(explainer?.direction);
  const isNaik = dir === "Naik";
  const isDatar = dir === "Datar";
  const dirColor = isNaik
    ? "bg-bullish/15 text-bullish"
    : isDatar
      ? "bg-muted text-muted-foreground"
      : "bg-bearish/15 text-bearish";
  const DirIcon = isNaik ? TrendingUp : isDatar ? Activity : TrendingDown;

  const readingTime = article ? estimateReadingTime(article.content) : null;

  const h1 = article?.title
    ?? (isDatar
      ? `Analisis Teknikal Saham ${name} (${tickerClean}) Hari Ini`
      : `Kenapa Saham ${name} ${dir} Hari Ini?`);

  const subtitle = article?.excerpt ?? explainer?.headline ?? `Pergerakan harga dan sinyal teknikal ${name} hari ini.`;

  return (
    <article className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li><Link href={`/stocks/${tickerJK}`} className="hover:text-foreground">Saham {tickerClean}</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-semibold">Kenapa {dir} Hari Ini?</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-4xl px-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${dirColor}`}>
            <DirIcon className="h-4 w-4" />
            {dir}
            {data.changePercent !== null && !isDatar && (
              <span className="ml-1 font-mono">{Math.abs(data.changePercent).toFixed(2)}%</span>
            )}
          </span>
          {asOfDate && (
            <span className="text-sm text-muted-foreground">
              Update: {asOfDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{h1}</h1>
        <p className="text-lg text-muted-foreground mb-4">{subtitle}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {readingTime && (
            <span className="flex items-center gap-1"><Activity className="h-4 w-4" />{readingTime} menit baca</span>
          )}
          <ShareButtons
            title={h1}
            url={`${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini`}
          />
        </div>
      </header>

      {/* Deterministic technical analysis — ALWAYS rendered (the SEO core).
          No gated decimals: prose is qualitative/relative only. */}
      {explainer && (
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Analisis Teknikal {tickerClean}</h2>
            </div>
            <p className="text-base text-foreground/90 leading-relaxed mb-4">{explainer.prose}</p>
            {explainer.bullets.length > 0 && (
              <ul className="space-y-2">
                {explainer.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ListChecks className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground italic">
              Analisis dihasilkan otomatis dari indikator teknikal (RSI, MACD, SMA, EMA, volume). Bukan rekomendasi beli/jual.
            </p>
          </div>
        </section>
      )}

      {/* Article body (optional — only if a movement-analysis article exists) */}
      {article && (
        <div className="mx-auto max-w-4xl px-4">
          <ArticleContent content={article.content} />
        </div>
      )}

      {/* CTA: Link to stock page */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Pantau {tickerClean} Real-time</h3>
          <p className="text-muted-foreground mb-4">
            Lihat harga, chart, indikator teknikal, dan sinyal {tickerClean} secara lengkap di halaman saham.
          </p>
          <Link
            href={`/stocks/${tickerJK}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            Lihat Chart {tickerClean} →
          </Link>
        </div>
      </div>

      {/* Back link */}
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <Link
          href={`/stocks/${tickerJK}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Saham {tickerClean}
        </Link>
      </div>
    </article>
  );
}
