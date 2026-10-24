import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import { SahamView } from "@/components/stock/saham-view";
import { IDX_STOCKS } from "@/lib/constants";
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

export const metadata: Metadata = {
  title: "Harga Saham IDX Hari Ini — Screener Saham Gratis & Chart Live 956+ Saham",
  description:
    "Cek harga saham IDX hari ini di radar saham IDX gratis: screener filter sektor, RSI, MACD, golden cross, dan indikator teknikal. Chart live real-time untuk 956+ saham BEI.",
  alternates: { canonical: "/stocks" },
  keywords: [
    "daftar harga saham hari ini", "harga saham idx hari ini", "harga saham live",
    "screener saham gratis", "screener saham indonesia", "chart saham gratis",
    "chart saham live", "chart saham realtime",
    "analisa saham online", "saham idx hari ini", "daftar saham BEI",
    "radar saham idx", "radar saham",
  ],
  openGraph: {
    title: "Daftar Harga Saham IDX Hari Ini — Live Chart & Analisa Teknikal",
    description: "Cek harga saham IDX hari ini di radar saham IDX gratis: chart live, RSI, MACD, dan filter indikator untuk 956+ saham BEI.",
    url: `${SITE_URL}/stocks`,
    images: [{ url: `${SITE_URL}/api/og?title=Daftar+Harga+Saham+IDX+Hari+Ini&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daftar Harga Saham IDX Hari Ini — Live Chart & Analisa Teknikal",
    description: "Cek harga saham IDX hari ini lengkap dengan analisa teknikal. Chart live, RSI, MACD, dan filter indikator.",
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
  const [latestPrice, marketInfo] = await Promise.all([
    stockMarketService.getLatestPriceDate(),
    stockMarketService.getMarketStatusForPage(),
  ]);

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
              text: "TeknikalID menyediakan 12+ indikator: RSI, MACD, Bollinger Bands, Supertrend, ADX, Stochastic Oscillator, On-Balance Volume (OBV), ATR, dan Moving Average (SMA 20/50/200). Semua indikator dihitung otomatis dan ditampilkan di chart interaktif.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    <div className="fade-in">
      {/* ── Editorial header ── */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
          <MarketStatus marketStatus={marketInfo.marketStatus} latestPrice={latestPrice} />
          <h1 id="radar" className="mt-3 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
            Radar Saham IDX
          </h1>
          <p className="mt-1 text-xs text-text-tertiary">
            {IDX_STOCKS.length}+ saham — cari langsung di bawah, atau saring sesuai strategi. IDX Radar
            TeknikalID memantau harga, RSI, MACD, dan volume seluruh saham BEI setiap hari bursa.
          </p>
          <div className="mt-3">
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

          {/* Owner 24 Okt: funnel simulasi di tiap page utama */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#0f2a3d] to-[#123548] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">Latih strategi tanpa risiko 🎮</p>
              <p className="text-xs text-slate-400">Paper trading dengan Rp 10.000.000 virtual — gratis.</p>
            </div>
            <Link
              href="/paper-trading"
              data-engagement="funnel_paper_banner_stocks"
              className="press-scale inline-flex items-center gap-1.5 text-xs font-bold bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors shrink-0"
            >
              Mulai Simulasi Gratis
            </Link>
          </div>

          {/* Quick discovery pills → screener tab */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "Lagi Naik", href: "/stocks?view=screener&tab=swing-trade&preset=macd_bullish" },
              { label: "Lagi Murah", href: "/stocks?view=screener&tab=bottom-fishing&preset=rsi_oversold" },
              { label: "Tanya AI", href: "/stocks?view=screener&ask=Saham%20apa%20yang%20lagi%20oke%20hari%20ini%3F" },
            ].map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
              >
                {p.label}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            ))}
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
            description="Cari, saring per sektor, urutkan 900+ saham — atau gunakan Screener untuk filter sinyal teknikal."
          />
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

        {/* ── SEO Content Block: Educational + FAQ + Strategy Links ── */}
        <section className="mt-16 space-y-10">
          {/* Educational intro — targets "analisa teknikal saham" keyword */}
          <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-text-secondary">
            <h2 className="text-xl font-bold text-text-primary">Analisa Teknikal Saham IDX — Panduan Lengkap</h2>
            <p>
              TeknikalID menyediakan <strong className="text-text-primary">analisa teknikal saham</strong> untuk 956+ saham di Bursa Efek Indonesia (IDX). 
              Setiap saham dilengkapi chart interaktif real-time, 12+ indikator teknikal (RSI, MACD, Bollinger Bands, 
              Supertrend, ADX, dan lainnya), serta trading plan otomatis berdasarkan Pivot Points & ATR.
            </p>
            <p>
              Gunakan daftar di atas untuk memantau harga saham hari ini, atau manfaatkan screener untuk menemukan 
              saham oversold, overbought, golden cross, dan volume spike secara otomatis. Data diperbarui setiap 
              5 menit saat pasar buka (Senin–Jumat, pukul 09:00–16:00 WIB).
            </p>
          </div>

          {/* FAQ Section — targets featured snippets */}
          <div className="max-w-3xl space-y-5">
            <h2 className="text-xl font-bold text-text-primary">Pertanyaan Umum tentang Analisa Teknikal Saham</h2>
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
                  TeknikalID menyediakan 12+ indikator: RSI, MACD, Bollinger Bands, Supertrend, ADX, 
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

        </section>
      </div>
    </div>
    </>
  );
}
