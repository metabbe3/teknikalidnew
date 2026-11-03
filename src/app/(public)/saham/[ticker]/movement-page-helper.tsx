import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { ArticleType, ArticleStatus } from "@/generated/prisma/client";
import { ArticleContent, estimateReadingTime } from "@/components/article/article-renderer";
import { ChevronRight, TrendingUp, TrendingDown, Activity, ListChecks, AlertCircle } from "lucide-react";
import { ShareButtons } from "@/components/ui/share-buttons";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { explainMove, type MoveExplainer } from "@/lib/verdict-prose";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { generateKenapaMetaDescription, determineSignalTone } from "@/lib/kenapa-meta";
import { formatPercent } from "@/lib/utils";

export async function loadMovementData(tickerRaw: string) {
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

  let related: Array<{ ticker: string; name: string; changePercent: number | null }> = [];
  if (base.stock.sector) {
    const peers = (await stockMarketService.getStockList(base.stock.sector))
      .filter((s) => s.ticker !== tickerJK && s.changePercent !== null)
      .sort((a, b) => Math.abs(a.changePercent! - (changePercent ?? 0)) - Math.abs(b.changePercent! - (changePercent ?? 0)))
      .slice(0, 4)
      .map((s) => ({ ticker: s.ticker, name: s.name, changePercent: s.changePercent }));
    related = peers;
  }

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
    sector: base.stock.sector,
    industry: base.stock.industry,
    businessActivity: base.stock.businessActivity,
    listingBoard: base.stock.listingBoard,
    changePercent,
    explainer,
    close: base.close,
    indicator: base.indicator,
    week52High: base.week52High,
    week52Low: base.week52Low,
    asOfDate: base.latest?.date ?? null,
    related,
    article,
  };
}

export async function generateMovementMetadataHelper(
  ticker: string,
  expectedDirection: "naik" | "turun",
): Promise<Metadata> {
  const data = await loadMovementData(ticker);
  if (!data) return {};

  const { name, tickerClean, changePercent, explainer, indicator, sector } = data;
  const sectorMod = sector ? ` Sektor ${sector}` : "";
  const signalTone = determineSignalTone(explainer?.primary?.tone, (indicator as any)?.signalScore);
  const description = generateKenapaMetaDescription({
    ticker: tickerClean,
    name,
    changePercent,
    signalTone,
  });

  const isActuallyNaik = changePercent !== null && changePercent > 0;
  const isActuallyTurun = changePercent !== null && changePercent < 0;

  // Determine true canonical path based on real direction
  const trueDirection = isActuallyNaik ? "naik" : isActuallyTurun ? "turun" : null;
  const canonicalPath = trueDirection
    ? `/saham/${tickerClean.toLowerCase()}/kenapa-${trueDirection}-hari-ini`
    : `/stocks/${tickerClean}.JK`;

  const title =
    expectedDirection === "naik"
      ? (isActuallyTurun
          ? `Saham ${name} (${tickerClean}) Turun Hari Ini — Analisis & Sinyal`
          : `Kenapa Saham ${name} Naik Hari Ini — Analisis ${tickerClean}${sectorMod}`)
      : (isActuallyNaik
          ? `Saham ${name} (${tickerClean}) Naik Hari Ini — Analisis & Sinyal`
          : `Kenapa Saham ${name} Turun Hari Ini — Analisis ${tickerClean}${sectorMod}`);

  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&type=movement&ticker=${tickerClean}`;

  // ADV-2 kurasi (3 Nov): hanya ±145 survivor (top-300 dollar volume + riwayat
  // big-move, survivor.json) + 3 keep-index GSC-intent yang boleh di-index.
  // Sisanya (±344) noindex — melunasi utang thin-content spam-classifier.
  const KURASI_KEEP = new Set<string>();
  try {
    // cached module-level di dev; file kecil (~150 ticker)
    const { default: keep } = (await import("@/lib/seo/kurasi-keep")) as {
      default: Set<string>;
    };
    keep.forEach((t) => KURASI_KEEP.add(t));
  } catch {
    // fallback: file tak ada → jangan blokir (safe default lama)
  }
  const isCurated =
    KURASI_KEEP.size === 0 || KURASI_KEEP.has(tickerClean.toUpperCase());

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonicalPath}`,
      publishedTime: data.asOfDate ? data.asOfDate.toISOString() : undefined,
      modifiedTime: data.article?.updatedAt?.toISOString() ?? data.asOfDate?.toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    // ADV-2: non-survivor noindex (kurasi 3 Nov — survivor.json 145 + 3 GSC keep)
    ...(isCurated ? {} : { robots: { index: false, follow: true } }),
    keywords: [
      `kenapa saham ${tickerClean} ${expectedDirection}`,
      `harga saham ${tickerClean} hari ini`,
      `analisa saham ${tickerClean}`,
      `analisis teknikal ${tickerClean}`,
      `saham ${tickerClean}`,
    ],
  };
}

export async function RenderMovementPage({
  ticker,
  expectedDirection,
}: {
  ticker: string;
  expectedDirection: "naik" | "turun";
}) {
  const canonicalTicker = ticker.replace(/\.JK$/i, "").toLowerCase();
  if (ticker !== canonicalTicker) {
    permanentRedirect(`/saham/${canonicalTicker}/kenapa-${expectedDirection}-hari-ini`);
  }

  const data = await loadMovementData(ticker);
  if (!data) notFound();

  const { tickerClean, tickerJK, name, changePercent, explainer, asOfDate, article, related } = data;
  const isActuallyNaik = changePercent !== null && changePercent > 0;
  const isActuallyTurun = changePercent !== null && changePercent < 0;
  const isDatar = changePercent === null || changePercent === 0;

  const isMismatch =
    (expectedDirection === "naik" && isActuallyTurun) ||
    (expectedDirection === "turun" && isActuallyNaik) ||
    isDatar;

  const readingTime = article ? estimateReadingTime(article.content) : null;
  const h1 =
    expectedDirection === "naik"
      ? (isActuallyTurun
          ? `Saham ${name} (${tickerClean}) Turun Hari Ini`
          : `Kenapa Saham ${name} Naik Hari Ini?`)
      : (isActuallyNaik
          ? `Saham ${name} (${tickerClean}) Naik Hari Ini`
          : `Kenapa Saham ${name} Turun Hari Ini?`);

  const subtitle =
    isMismatch
      ? `Arah pergerakan harga ${tickerClean} hari ini berbeda dengan URL yang Anda buka.`
      : article?.excerpt ?? explainer?.headline ?? `Pergerakan harga dan analisis teknikal ${name} hari ini.`;

  const actualDirLabel = isActuallyNaik ? "Naik" : isActuallyTurun ? "Turun" : "Datar";
  const actualDirColor = isActuallyNaik
    ? "bg-bullish/15 text-bullish border-bullish/30"
    : isActuallyTurun
      ? "bg-bearish/15 text-bearish border-bearish/30"
      : "bg-muted text-muted-foreground border-border";
  const DirIcon = isActuallyNaik ? TrendingUp : isActuallyTurun ? TrendingDown : Activity;

  const correctRoute = isActuallyNaik
    ? `/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini`
    : isActuallyTurun
      ? `/saham/${tickerClean.toLowerCase()}/kenapa-turun-hari-ini`
      : `/stocks/${tickerJK}`;

  const faqItems = [
    {
      q: `Kenapa saham ${name} (${tickerClean}) ${actualDirLabel.toLowerCase()} hari ini?`,
      a: explainer?.prose ?? `Pergerakan harga ${name} hari ini dianalisis dari indikator teknikal utama — RSI, MACD, posisi harga terhadap SMA/EMA, dan aktivitas volume.`,
    },
    {
      q: `Apakah ${tickerClean} layak ditradingkan setelah ${actualDirLabel.toLowerCase()}?`,
      a: `Analisis TeknikalID bersifat deskriptif, bukan rekomendasi beli/jual. Keputusan trading sebaiknya mempertimbangkan toleransi risiko, rencana trading, dan konfirmasi sinyal lanjutan.`,
    },
    {
      q: `Bagaimana cara membaca tren teknikal ${tickerClean}?`,
      a: `Posisi harga terhadap SMA 20/50 dan EMA menunjukkan arah tren: harga di atas rata-rata mencerminkan tekanan beli, sedangkan di bawah rata-rata mencerminkan tekanan jual.`,
    },
  ];

  return (
    <article className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li><Link href={`/stocks/${tickerJK}`} className="hover:text-foreground">Saham {tickerClean}</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-semibold">Kenapa {expectedDirection === "naik" ? "Naik" : "Turun"} Hari Ini?</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-4xl px-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${actualDirColor}`}>
            <DirIcon className="h-4 w-4" />
            {actualDirLabel}
            {changePercent !== null && (
              <span className="ml-1 font-mono">{formatPercent(changePercent)}</span>
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
            url={`${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-${expectedDirection}-hari-ini`}
          />
        </div>
      </header>

      {/* Mismatch Alert Banner (if opened naik URL while stock is falling, or vice versa) */}
      {isMismatch && (
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-1">
                  Arah Pergerakan Berbeda: {tickerClean} {actualDirLabel} {changePercent !== null ? formatPercent(changePercent) : ""}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  Anda membuka halaman <em>kenapa-{expectedDirection}</em>, namun data bursa menunjukkan bahwa harga saham {name} ({tickerClean}) hari ini sebenarnya <strong>{actualDirLabel.toLowerCase()}</strong>.
                </p>
                <Link
                  href={correctRoute}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                >
                  Buka Analisis Kenapa {actualDirLabel} Hari Ini →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Deterministic technical analysis — only render matching explainer if not a mismatch */}
      {!isMismatch && explainer && (
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

      {/* Article body (optional — only if matching direction) */}
      {!isMismatch && article && (
        <div className="mx-auto max-w-4xl px-4">
          <ArticleContent content={article.content} />
        </div>
      )}

      {/* Related sector stocks */}
      {related.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-3">Saham {data.sector} Lainnya</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pergerakan hari ini di sektor {data.sector} — pembanding konteks sebelum menilai {tickerClean}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => {
                const up = (r.changePercent ?? 0) >= 0;
                const peerDir = up ? "kenapa-naik-hari-ini" : "kenapa-turun-hari-ini";
                return (
                  <Link
                    key={r.ticker}
                    href={`/saham/${r.ticker.replace(/\.JK$/, "").toLowerCase()}/${peerDir}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:border-primary/40 transition"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-foreground">{r.ticker.replace(/\.JK$/, "")}</span>
                      <span className="block truncate text-muted-foreground">{r.name}</span>
                    </span>
                    <span className={`font-mono font-semibold ${up ? "text-bullish" : "text-bearish"}`}>
                      {formatPercent(r.changePercent ?? 0)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold mb-4">Pertanyaan Umum tentang {tickerClean}</h2>
          <div className="space-y-5">
            {faqItems.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-foreground mb-1.5">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Article",
                  "@id": `${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-${expectedDirection}-hari-ini#article`,
                  headline: h1,
                  description: explainer?.prose.slice(0, 160) ?? `Analisis pergerakan saham ${name} hari ini.`,
                  inLanguage: "id",
                  datePublished: asOfDate ? new Date(asOfDate).toISOString() : undefined,
                  dateModified: article?.updatedAt
                    ? new Date(article.updatedAt).toISOString()
                    : asOfDate
                      ? new Date(asOfDate).toISOString()
                      : undefined,
                  author: { "@type": "Organization", name: "TeknikalID", url: SITE_URL },
                  publisher: { "@type": "Organization", name: "TeknikalID", url: SITE_URL },
                  mainEntityOfPage: `${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-${expectedDirection}-hari-ini`,
                  about: { "@type": "Corporation", name, tickerSymbol: `${tickerClean}.JK` },
                },
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
                    { "@type": "ListItem", position: 2, name: "Saham", item: `${SITE_URL}/stocks` },
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: tickerClean,
                      item: `${SITE_URL}/stocks/${tickerClean}.JK`,
                    },
                    {
                      "@type": "ListItem",
                      position: 4,
                      name: `Kenapa ${expectedDirection === "naik" ? "Naik" : "Turun"} Hari Ini`,
                      item: `${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-${expectedDirection}-hari-ini`,
                    },
                  ],
                },
                {
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                },
              ],
            }),
          }}
        />
      </section>
    </article>
  );
}
