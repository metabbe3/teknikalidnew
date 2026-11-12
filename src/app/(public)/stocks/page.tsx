import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import Link from "next/link";
import { Suspense } from "react";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import { SahamView } from "@/components/stock/saham-view";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { MarketStatusResult } from "@/lib/market-hours";
import { SITE_URL } from "@/lib/constants";
import { MarketBreathStrip } from "@/components/ui/market-breath-strip";
import { SectionHeading } from "@/components/ui/section-heading";
import { ArrowUpRight } from "lucide-react";
import { SahamStrategyLinks } from "@/components/seo/saham-strategy-links";
import { LoginGate } from "@/components/auth/login-gate";
import { auth } from "@/lib/auth";
import { GuestWatchlistPanel } from "@/components/stock/guest-watchlist-panel";
import { WeeklySignalWidget } from "@/components/signal/weekly-signal-widget";
import { ChannelCta } from "@/components/stock/channel-cta";

export const dynamic = "force-dynamic";

const POPULAR_BIG_CAPS = [
  "BBCA",
  "BBRI",
  "BMRI",
  "DSSA",
  "AADI",
  "TPIA",
  "ANTM",
  "GOTO",
] as const;

const THEMATIC_SCREENERS = [
  {
    label: "Saham Mulai Mantul · RSI Oversold",
    href: "/stocks?view=screener&tab=bottom-fishing&preset=rsi_oversold",
  },
  {
    label: "Tren Naik Baru · Golden Cross",
    href: "/stocks?view=screener&tab=swing-trade&preset=golden_cross",
  },
  {
    label: "Volume Meledak",
    href: "/stocks?view=screener&preset=volume_spike",
  },
] as const;

export const metadata: Metadata = {
  title: "Harga Saham Hari Ini — 956 Emiten IDX Real-Time",
  description:
    "Daftar harga saham IDX hari ini untuk 956 emiten — update real-time tiap detik pasar buka. Filter sektor, RSI, MACD & golden cross gratis, tanpa login.",
  alternates: { canonical: "/stocks" },
  keywords: [
    "daftar harga saham hari ini", "harga saham idx hari ini", "harga saham live",
    "screener saham gratis", "screener saham indonesia", "chart saham gratis",
    "chart saham live", "chart saham realtime",
    "analisa saham online", "saham idx hari ini", "daftar saham BEI",
    "radar saham idx", "radar saham",
  ],
  openGraph: {
    title: "Harga Saham Hari Ini — 956 Emiten IDX Real-Time",
    description: "Daftar harga saham IDX hari ini untuk 956 emiten — update real-time tiap detik pasar buka. Filter sektor, RSI, MACD & golden cross gratis, tanpa login.",
    url: `${SITE_URL}/stocks`,
    images: [{ url: `${SITE_URL}/api/og?title=Daftar+Harga+Saham+IDX+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Harga Saham Hari Ini — 956 Emiten IDX Real-Time",
    description: "Daftar harga saham IDX hari ini untuk 956 emiten — update real-time tiap detik pasar buka. Filter sektor, RSI, MACD & golden cross gratis, tanpa login.",
  },
};

function MarketStatus({ marketStatus, latestPrice }: { marketStatus: MarketStatusResult; latestPrice: { date: Date } | null }) {
  const dateStr = latestPrice
    ? format(latestPrice.date, "d MMM yyyy", { locale: idLocale })
    : null;

  if (marketStatus.isOpen) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Pasar Buka</span>
        </span>
        {dateStr && (
          <span className="font-mono text-xs text-text-tertiary">Harga EOD {dateStr} · <span data-live-fresh data-fresh-eod="live saat pasar buka">live saat pasar buka</span></span>
        )}
      </div>
    );
  }

  const reasonLabel = marketStatus.reason === "weekend"
    ? "Akhir Pekan"
    : marketStatus.reason === "holiday"
      ? "Hari Libur Nasional"
      : "Sesi Berakhir";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">Tutup · {reasonLabel}</span>
      </span>
      {dateStr && (
        <span className="font-mono text-xs text-text-tertiary">
          Data sesi terakhir: <span className="font-medium text-text-secondary">{dateStr}</span>
        </span>
      )}
    </div>
  );
}

export default async function StocksPage() {
  const session = await auth().catch(() => null);
  // perf-2026-10-18-01: daftar saham (962 baris) tidak lagi di-serialize ke HTML/RSC flight
  // (~977KB → shell) — SahamView fetch /api/stocks client-side (cache 5 mnt, endpoint lama).
  // seo-p0: render SSR statis TOP 30 teraktif by dollar-volume (hanya ~3KB) untuk crawlability "Rp"
  const [latestPrice, marketInfo, stockList] = await Promise.all([
    stockMarketService.getLatestPriceDate(),
    stockMarketService.getMarketStatusForPage(),
    stockMarketService.getStockList().catch(() => []),
  ]);

  const top30Stocks = [...stockList]
    .filter((s) => !s.ticker.startsWith("^") && s.close !== null && s.close > 0)
    .sort((a, b) => ((b.volume ?? 0) * (b.close ?? 0)) - ((a.volume ?? 0) * (a.close ?? 0)))
    .slice(0, 30);

  // ref-2026-10-17-01: breadth + top movers dari SATU pintu (market-snapshot),
  // identik dengan home/pasar/berita. Tidak lagi dihitung lokal dari getStockList.
  const snap = await marketSnapshotService.getSnapshot();
  const gainers = snap.breadth.advancers;
  const losers = snap.breadth.decliners;
  const unchanged = snap.breadth.unchanged;

  const topGainer = snap.gainers[0]
    ? { ticker: snap.gainers[0].ticker, changePercent: snap.gainers[0].changePercent }
    : undefined;
  const topLoser = snap.losers[0]
    ? { ticker: snap.losers[0].ticker, changePercent: snap.losers[0].changePercent }
    : undefined;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Daftar Harga Saham IDX", url: `${SITE_URL}/stocks` },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham", item: `${SITE_URL}/stocks` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu analisa teknikal saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Analisa teknikal adalah metode mempelajari pergerakan harga saham menggunakan chart dan indikator matematika seperti RSI, MACD, dan Moving Average. Tujuannya memprediksi arah harga berdasarkan pola historis, bukan fundamental perusahaan.",
            },
          },
          {
            "@type": "Question",
            name: "Indikator teknikal apa saja yang tersedia di TeknikalID?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "TeknikalID menyediakan 9 indikator: RSI, MACD, Bollinger Bands, Supertrend, ADX, Stochastic Oscillator, On-Balance Volume (OBV), ATR, dan Moving Average (SMA 20/50/200). Semua indikator dihitung otomatis dan ditampilkan di chart interaktif.",
            },
          },
          {
            "@type": "Question",
            name: "Bagaimana cara membaca chart saham IDX?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Mulai dari candlestick chart untuk melihat pergerakan harga harian. Gunakan indikator RSI untuk mengetahui kondisi overbought/oversold, MACD untuk sinyal tren, dan Moving Average untuk arah tren jangka panjang. TeknikalID menampilkan semua ini dalam satu dashboard.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah data harga saham di TeknikalID real-time?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Data diperbarui setiap 5 menit saat pasar buka. Ada delay ~5-10 menit dari data resmi BEI karena sumber data dari Yahoo Finance. Untuk trading intraday, kami sarankan mengacu pada data broker Anda.",
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
    <div className="fade-in">
      {/* ── Editorial header ── */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <MarketStatus marketStatus={marketInfo.marketStatus} latestPrice={latestPrice} />
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h1 id="radar" className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
              Harga Saham IDX Hari Ini
            </h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              IDX Radar
            </span>
          </div>
          <p className="mt-1 text-xs text-text-tertiary">
            Pantau harga, RSI, MACD &amp; volume 956+ saham BEI setiap hari bursa.
          </p>
          <div className="mt-2 sm:mt-2.5">
            <MarketBreathStrip
              data={{
                advancersCount: gainers,
                declinersCount: losers,
                unchangedCount: unchanged,
                topGainer,
                topLoser,
              }}
            />
          </div>
        </div>
      </section>

      <div id="pantauan" className="max-w-7xl mx-auto px-4 pt-6 scroll-mt-20">
        {/* PRD idea-2026-10-19-2 AC1: panel pantauan guest (guest-only, SSR-safe null,
            lazy mount — tak menyentuh first paint/LCP) */}
        {!session?.user && <GuestWatchlistPanel />}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Browse | Screener (merged) */}
        <section>
          <SectionHeading
            eyebrow="Database Lengkap"
            title="Semua Saham IDX"
            description="Cari & saring 900+ saham BEI"
          />

          {/* Quick jumps: Big-cap paling dicari + Screener tematik (Batch A) */}
          <div className="mt-4 mb-6 space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                Paling Dicari Hari Ini
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {POPULAR_BIG_CAPS.map((ticker) => (
                  <Link
                    key={ticker}
                    href={`/stocks/${ticker}.JK`}
                    className="inline-flex min-h-11 sm:min-h-0 items-center rounded-full border border-border bg-bg-card px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98]"
                  >
                    {ticker}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {THEMATIC_SCREENERS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="inline-flex min-h-11 sm:min-h-0 items-center gap-1 rounded-full border border-border bg-bg-secondary/70 px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98]"
                >
                  <span>{s.label}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden />
                </Link>
              ))}
              <Link
                href="/stocks?view=swing"
                data-engagement="chip_stocksQuickSwing"
                data-nav-label="nav_hubTabSwing_click"
                className="inline-flex min-h-11 sm:min-h-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors active:scale-[0.98]"
              >
                <span>Setup Swing (Entry &amp; TP)</span>
                <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
              </Link>
              <Link
                href="/stocks?view=pasar"
                data-engagement="chip_stocksQuickPasar"
                data-nav-label="nav_hubTabPasar_click"
                className="inline-flex min-h-11 sm:min-h-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 transition-colors active:scale-[0.98]"
              >
                <span>Radar Pasar Live</span>
                <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>

          {/* SSR Section: Top 30 Saham Teraktif (noscript & search bot friendly) */}
          {top30Stocks.length > 0 && (
            <details open className="group mb-8 rounded-xl border border-border bg-bg-card p-4 sm:p-5">
              <summary className="cursor-pointer list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-text-primary">
                    Harga Saham Hari Ini — 30 Teraktif
                  </h2>
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    Sesi Terakhir
                  </span>
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-tertiary transition-transform duration-300 group-open:rotate-180 shrink-0"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                Daftar 30 saham teraktif di Bursa Efek Indonesia (BEI) berdasarkan nilai transaksi dan likuiditas sesi terakhir. Diperbarui otomatis untuk memantau pergerakan harga saham likuid paling populer.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-secondary/40 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                      <th scope="col" className="py-2.5 px-3">Ticker</th>
                      <th scope="col" className="py-2.5 px-3">Nama Emiten</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Harga (Rp)</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Perubahan (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {top30Stocks.map((stock) => (
                      <tr key={stock.ticker} className="hover:bg-bg-hover/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-accent">
                          <Link href={`/stocks/${stock.ticker}`} className="hover:underline">
                            {stripJk(stock.ticker)}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-xs sm:text-sm text-text-secondary max-w-[200px] truncate">
                          {stock.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums text-text-primary">
                          {stock.close !== null ? formatPrice(stock.close) : "Rp—"}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-medium tabular-nums ${stock.changePercent !== null ? changeColor(stock.changePercent) : "text-text-tertiary"}`}>
                          {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <Suspense fallback={<div className="p-8 text-center text-text-secondary">Memuat…</div>}>
            <SahamView assetClass="EQUITY" linkBase="/stocks" />
          </Suspense>

          {/* Discovery section — DIPINDAH ke bawah tabel (owner 18 Okt: tabel harus langsung kelihatan) */}
          <div className="mt-10 space-y-8">
            <SahamStrategyLinks />
            <WeeklySignalWidget />
          </div>
        </section>

        {/* Signup CTA — watchlist & signal alerts (ANON SAJA — owner 18 Okt:
            kartu ini muncul padahal sudah login) */}
        {!session?.user && (
          <LoginGate
            feature="Watchlist & Alert Sinyal"
            message="Daftar gratis untuk menyimpan watchlist, alert golden cross/oversold, dan trading plan otomatis untuk 950+ saham IDX."
          />
        )}

        {/* Channel CTA — owned audience, retention tanpa gesekan register */}
        <div className="mt-4 flex justify-center">
          <ChannelCta />
        </div>

        {/* ── SEO Content Block: Educational + FAQ (folded into details — Batch A) ── */}
        <section className="mt-16">
          <details className="group rounded-xl border border-border bg-bg-card p-5 sm:p-6 transition-all">
            <summary className="cursor-pointer list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 pr-4">
                <span className="text-base sm:text-lg font-bold text-text-primary">
                  Panduan Analisa Teknikal Saham IDX &amp; FAQ
                </span>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Pelajari cara membaca chart, indikator utama, dan penggunaan screener saham
                </p>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-tertiary transition-transform duration-300 group-open:rotate-180 shrink-0"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>

            <div className="mt-6 space-y-8 border-t border-border pt-6">
              {/* Educational intro — targets "analisa teknikal saham" keyword */}
              <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-text-secondary">
                <h2 className="text-lg font-bold text-text-primary">Analisa Teknikal Saham IDX — Panduan Lengkap</h2>
                <p>
                  TeknikalID menyediakan <strong className="text-text-primary">analisa teknikal saham</strong> untuk 956+ saham di Bursa Efek Indonesia (IDX). 
                  Setiap saham dilengkapi chart interaktif real-time, 9 indikator teknikal (RSI, MACD, Bollinger Bands, 
                  Supertrend, ADX, dan lainnya), serta trading plan otomatis berdasarkan Pivot Points &amp; ATR.
                </p>
                <p>
                  Gunakan daftar di atas untuk memantau harga saham hari ini, atau manfaatkan screener untuk menemukan 
                  saham oversold, overbought, golden cross, dan volume spike secara otomatis. Data diperbarui setiap 
                  5 menit saat pasar buka (Senin–Jumat, pukul 09:00–16:00 WIB).
                </p>
              </div>

              {/* FAQ Section — targets featured snippets */}
              <div className="max-w-3xl space-y-5">
                <h2 className="text-lg font-bold text-text-primary">Pertanyaan Umum tentang Analisa Teknikal Saham</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Apa itu analisa teknikal saham?</h3>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                      Analisa teknikal adalah metode mempelajari pergerakan harga saham menggunakan chart dan indikator matematika 
                      seperti RSI, MACD, dan Moving Average. Tujuannya memprediksi arah harga berdasarkan pola historis, 
                      bukan fundamental perusahaan.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Indikator teknikal apa saja yang tersedia di TeknikalID?</h3>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                      TeknikalID menyediakan 9 indikator: RSI, MACD, Bollinger Bands, Supertrend, ADX, 
                      Stochastic Oscillator, On-Balance Volume (OBV), ATR, dan Moving Average (SMA 20/50/200). 
                      Semua indikator dihitung otomatis dan ditampilkan di chart interaktif.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Bagaimana cara membaca chart saham IDX?</h3>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                      Mulai dari candlestick chart untuk melihat pergerakan harga harian. Gunakan indikator RSI untuk 
                      mengetahui kondisi overbought/oversold, MACD untuk sinyal tren, dan Moving Average untuk arah tren 
                      jangka panjang. TeknikalID menampilkan semua ini dalam satu dashboard.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Apakah data harga saham di TeknikalID real-time?</h3>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                      Data diperbarui setiap 5 menit saat pasar buka. Ada delay ~5-10 menit dari data resmi BEI karena 
                      sumber data dari Yahoo Finance. Untuk trading intraday, kami sarankan mengacu pada data broker Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>
    </div>
    </>
  );
}
