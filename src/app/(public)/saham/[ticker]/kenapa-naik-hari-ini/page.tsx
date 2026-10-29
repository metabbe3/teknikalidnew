import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
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
import { safeJsonLd } from "@/lib/safe-json-ld";

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

  // seo-2026-10-18-03: related same-sector via getStockList REUSE (cache 5 mnt service) — API Reuse Rule.
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
    week52High: base.week52High,
    week52Low: base.week52Low,
    asOfDate: base.latest?.date ?? null,
    related,
    article,
  };
}

/** seo-2026-10-18-02: posisi harga sekarang dalam range 52 minggu (prose kualitatif, tanpa desimal gated). */
function rangePositionPct(close: number | null, low: number | null, high: number | null): number | null {
  if (close === null || low === null || high === null || high <= low) return null;
  return ((close - low) / (high - low)) * 100;
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

  // seo-2026-10-18-03 (gate metadata-shape): variasikan modifiers per arah × sektor
  // supaya 499 URL tidak berbagi 1 generated title shape (scaled-content gate).
  const dirWord = dir === "Datar" ? null : dir.toLowerCase();
  const sectorMod = data.sector ? ` Sektor ${data.sector}` : "";
  const title = article?.title
    ?? (dirWord === "naik"
      ? `Kenapa Saham ${name} Naik Hari Ini — Analisis ${tickerClean}${sectorMod}`
      : dirWord === "turun"
        ? `${name} Turun Hari Ini: Penyebab Teknikal ${tickerClean}${sectorMod}`
        : dirWord
          ? `Saham ${name} ${dir} Hari Ini — Ringkasan Teknikal ${tickerClean}`
          : `Analisis Teknikal ${name} (${tickerClean}) Hari Ini${sectorMod}`);

  const descLead = dirWord === "naik"
    ? `Penyebab saham ${name} naik hari ini berdasarkan indikator`
    : dirWord === "turun"
      ? `Alasan ${name} melemah hari ini dari sisi teknikal`
      : `Ringkasan pergerakan dan sinyal teknikal ${name}`;
  const description =
    article?.excerpt ?? explainer?.prose.slice(0, 160) ?? `${descLead}${sectorMod} — RSI, MACD, volume, dan posisi tren ${tickerClean}.`;

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
  // seo-2026-10-29-p0: redirect varian non-kanonik (huruf besar/.JK) ke canonical lowercase
  // (audit #5; pola sama dgn indikator/page.tsx:113)
  const canonicalTicker = ticker.replace(/\.JK$/i, "").toLowerCase();
  if (ticker !== canonicalTicker) {
    permanentRedirect(`/saham/${canonicalTicker}/kenapa-naik-hari-ini`);
  }
  const data = await loadKenapaData(ticker);
  if (!data) notFound();

  const { tickerClean, tickerJK, name, explainer, asOfDate, article, related } = data;
  const dir = directionLabel(explainer?.direction);
  const isNaik = dir === "Naik";
  const isDatar = dir === "Datar";
  const dirColor = isNaik
    ? "bg-bullish/15 text-bullish"
    : isDatar
      ? "bg-muted text-muted-foreground"
      : "bg-bearish/15 text-bearish";
  const DirIcon = isNaik ? TrendingUp : isDatar ? Activity : TrendingDown;

  // seo-2026-10-18-02: section tambahan (YMYL depth) — semua dari data yang sudah di-fetch.
  const rangePos = rangePositionPct(data.close, data.week52Low, data.week52High);
  const rangeLabel =
    rangePos === null ? null
    : rangePos >= 80 ? "dekat puncak 52 minggu"
    : rangePos >= 60 ? "di paruh atas rentang 52 minggu"
    : rangePos >= 40 ? "di tengah rentang 52 minggu"
    : rangePos >= 20 ? "di paruh bawah rentang 52 minggu"
    : "dekat dasar 52 minggu";

  const faqItems = [
    {
      q: `Kenapa saham ${name} (${tickerClean}) ${dir.toLowerCase()} hari ini?`,
      a: explainer?.prose ?? `Pergerakan harga ${name} hari ini dianalisis dari indikator teknikal utama — RSI, MACD, posisi harga terhadap SMA/EMA, dan aktivitas volume. Ringkasan driver ada di bagian Analisis Teknikal di atas.`,
    },
    {
      q: `Apakah ${tickerClean} layak dibeli setelah ${dir.toLowerCase()}?`,
      a: `Analisa TeknikalID bersifat deskriptif, bukan rekomendasi beli/jual. ${tickerClean} ${dir.toLowerCase()} dengan kondisi indikator yang dijelaskan di atas — keputusan beli sebaiknya mempertimbangkan toleransi risiko, rencana trading, dan konteks fundamental. Baca ${`metodologi kami`} untuk memahami bagaimana angka ini dihitung.`,
    },
    {
      q: `Bagaimana cara membaca posisi ${tickerClean} terhadap rata-rata harga?`,
      a: `Posisi harga terhadap SMA 20/50 dan EMA menunjukkan arah tren jangka pendek-menengah: harga di atas rata-rata = tekanan beli dominan; di bawah = tekanan jual. Detail status tren ${tickerClean} tersedia gratis di halaman sahamnya.`,
    },
  ];

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

      {/* seo-2026-10-18-02: Ringkasan perusahaan — konteks YMYL unik per halaman */}
      {(data.businessActivity || data.sector) && (
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-3">Tentang {name} ({tickerClean})</h2>
            {data.businessActivity && (
              <p className="text-base text-foreground/90 leading-relaxed mb-4">{data.businessActivity}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm">
              {data.sector && (
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  Sektor: {data.sector}
                </span>
              )}
              {data.industry && (
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  Industri: {data.industry}
                </span>
              )}
              {data.listingBoard && (
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  Papan Pencatatan: {data.listingBoard}
                </span>
              )}
            </div>
            {data.sector && (
              <p className="mt-4 text-sm text-muted-foreground">
                Perbandingan dengan saham sektor {data.sector} lainnya:{" "}
                <Link href={`/sektor`} className="text-primary hover:underline">lihat performa sektor</Link>.
              </p>
            )}
          </div>
        </section>
      )}

      {/* seo-2026-10-18-02: Posisi dalam rentang 52 minggu */}
      {rangeLabel && (
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-3">Posisi Harga dalam Rentang 52 Minggu</h2>
            <p className="text-base text-foreground/90 leading-relaxed">
              Saat analisa ini dibuat, harga {name} berada <strong>{rangeLabel}</strong> — perbandingan
              terhadap harga tertinggi dan terendah dalam setahun terakhir. Saham yang bergerak mendekati
              puncak rentang umumnya sedang dalam tren naik jangka menengah, sementara yang mendekati dasar
              rentang bisa berada dalam fase akumulasi atau tekanan jual berkepanjangan — konteks penting
              sebelum menilai arti pergerakan hari ini.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Angka rentang 52 minggu lengkap ({tickerClean}) tersedia di{" "}
              <Link href={`/stocks/${tickerJK}`} className="text-primary hover:underline">halaman saham {tickerClean}</Link>.
            </p>
          </div>
        </section>
      )}

      {/* seo-2026-10-18-03: Related same-sector — internal linking gate (3-5 per halaman) */}
      {related.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-3">Saham {data.sector} yang Bergerak Serupa</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pergerakan hari ini di sektor {data.sector} — pembanding konteks sebelum menilai {tickerClean}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => {
                const up = (r.changePercent ?? 0) >= 0;
                return (
                  <Link
                    key={r.ticker}
                    href={`/saham/${r.ticker.replace(/\.JK$/, "").toLowerCase()}/kenapa-naik-hari-ini`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:border-primary/40 transition"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-foreground">{r.ticker.replace(/\.JK$/, "")}</span>
                      <span className="block truncate text-muted-foreground">{r.name}</span>
                    </span>
                    <span className={`font-mono font-semibold ${up ? "text-bullish" : "text-bearish"}`}>
                      {up ? "+" : ""}{r.changePercent?.toFixed(2)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* seo-2026-10-18-02: FAQ — FAQPage schema untuk rich result */}
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
            // seo-2026-10-29-p1 (audit #6): @graph Article + BreadcrumbList + FAQPage (dulu FAQPage saja)
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Article",
                  "@id": `${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini#article`,
                  headline: article?.title ?? `Kenapa Saham ${name} ${dir} Hari Ini (${tickerClean})`,
                  description: article?.excerpt ?? explainer?.prose.slice(0, 160) ?? `Analisis pergerakan saham ${name} hari ini.`,
                  inLanguage: "id",
                  datePublished: asOfDate ? new Date(asOfDate).toISOString() : undefined,
                  dateModified: article?.updatedAt
                    ? new Date(article.updatedAt).toISOString()
                    : asOfDate
                      ? new Date(asOfDate).toISOString()
                      : undefined,
                  author: { "@type": "Organization", name: "TeknikalID", url: SITE_URL },
                  publisher: { "@type": "Organization", name: "TeknikalID", url: SITE_URL },
                  mainEntityOfPage: `${SITE_URL}/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini`,
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
                      name: `Kenapa ${tickerClean} ${dir} Hari Ini`,
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


      {/* CTA: Link to stock page — ret-qw10: 3 pintu retensi sejajar (besok sore balik lagi) */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Apakah gerak {tickerClean} berlanjut besok?</h3>
          <p className="text-muted-foreground mb-4">
            Simpan {tickerClean} sekarang, biar besok langsung tahu apa yang berubah sejak hari ini.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
            <Link
              href={`/stocks/${tickerJK}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition min-h-11"
            >
              Lihat Chart &amp; Skor {tickerClean} →
            </Link>
            <Link
              href={`/stocks/${tickerJK}#pantau`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 min-h-11 font-medium text-sm hover:bg-accent/5 transition"
            >
              ⭐ Simpan ke pantauan HP
            </Link>
            <a
              data-engagement="tg_pantau_kenapa-naik"
              href={`https://t.me/TeknikalidBot?start=watch_${tickerClean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 min-h-11 font-medium text-sm hover:bg-accent/5 transition"
            >
              🔔 Update besok sore via Telegram
            </a>
          </div>
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
