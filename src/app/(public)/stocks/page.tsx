import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { stockMarketService } from "@/domains/stock/stock-market.service";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Harga Saham IDX Hari Ini — Screener Saham Gratis & Chart Live 956+ Saham",
  description:
    "Cek harga saham IDX hari ini + screener saham gratis: filter sektor, RSI, MACD, golden cross, dan indikator teknikal lainnya. Chart live real-time untuk 956+ saham BEI.",
  alternates: { canonical: "/stocks" },
  keywords: [
    "daftar harga saham hari ini", "harga saham idx hari ini", "harga saham live",
    "screener saham gratis", "screener saham indonesia", "chart saham gratis",
    "chart saham live", "chart saham realtime",
    "analisa saham online", "saham idx hari ini", "daftar saham BEI",
  ],
  openGraph: {
    title: "Daftar Harga Saham IDX Hari Ini — Live Chart & Analisa Teknikal",
    description: "Cek harga saham IDX hari ini lengkap dengan analisa teknikal. Chart live, RSI, MACD, dan filter indikator untuk 956+ saham BEI.",
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
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Pasar Buka</span>
        </span>
        {dateStr && (
          <span className="font-mono text-xs text-text-tertiary">Data terakhir: {dateStr}</span>
        )}
      </div>
    );
  }

  const reasonLabel = marketStatus.reason === "weekend"
    ? "Akhir Pekan"
    : marketStatus.reason === "holiday"
      ? "Hari Libur Nasional"
      : "Sesi Berakhir";

  const reasonDesc = marketStatus.reason === "weekend"
    ? "Bursa Efek Indonesia tutup pada hari Sabtu & Minggu."
    : marketStatus.reason === "holiday"
      ? "Hari libur nasional — tidak ada sesi perdagangan."
      : "Sesi perdagangan hari ini telah berakhir.";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-amber-800">Pasar Tutup · {reasonLabel}</span>
        </span>
        {dateStr && (
          <span className="font-mono text-xs text-text-tertiary">
            Data sesi terakhir: <span className="font-medium text-text-secondary">{dateStr}</span>
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-text-tertiary max-w-2xl">
        {reasonDesc} Data yang ditampilkan berasal dari sesi perdagangan terakhir.
      </p>
    </div>
  );
}

export default async function StocksPage() {
  const [rows, latestPrice, marketInfo] = await Promise.all([
    stockMarketService.getStockList(),
    stockMarketService.getLatestPriceDate(),
    stockMarketService.getMarketStatusForPage(),
  ]);

  const sectors = [...new Set(rows.map((s) => s.sector))].sort();

  const withChange = rows.filter((s) => s.changePercent !== null);
  const gainers = withChange.filter((s) => s.changePercent! > 0).length;
  const losers = withChange.filter((s) => s.changePercent! < 0).length;
  const unchanged = withChange.length - gainers - losers;

  const sortedDesc = [...withChange].sort((a, b) => b.changePercent! - a.changePercent!);
  const sortedAsc = [...withChange].sort((a, b) => a.changePercent! - b.changePercent!);
  const topGainer = sortedDesc[0] ? { ticker: sortedDesc[0].ticker, changePercent: sortedDesc[0].changePercent! } : undefined;
  const topLoser = sortedAsc[0] ? { ticker: sortedAsc[0].ticker, changePercent: sortedAsc[0].changePercent! } : undefined;

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
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
          <MarketStatus marketStatus={marketInfo.marketStatus} latestPrice={latestPrice} />
          <h1 className="mt-5 font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-text-primary leading-[1.05]">
            Pasar Saham IDX
          </h1>
          <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
            Harga, sinyal teknikal, dan analisa untuk {IDX_STOCKS.length}+ saham IDX. Mulai dari top mover hari ini, atau saring sesuai strategi Anda.
          </p>
          <div className="mt-6">
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

          {/* Quick discovery pills → screener tab */}
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { label: "Sinyal Bullish", href: "/stocks?view=screener&tab=swing-trade&preset=macd_bullish" },
              { label: "Oversold (RSI<30)", href: "/stocks?view=screener&tab=bottom-fishing&preset=rsi_oversold" },
              { label: "Golden Cross", href: "/stocks?view=screener&tab=swing-trade&preset=golden_cross" },
              { label: "Volume Spike", href: "/stocks?view=screener&tab=bottom-fishing&preset=volume_spike_low" },
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

          {/* Compact signup CTA — anon conversion */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-xs sm:text-sm text-text-secondary">
              🚀 Simpan watchlist, aktifkan alert sinyal, dan buka chart 5 tahun — gratis.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center bg-accent text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors press-scale whitespace-nowrap"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Browse | Screener (merged) */}
        <section>
          <SectionHeading
            eyebrow="Database Lengkap"
            title="Semua Saham IDX"
            description="Cari, saring per sektor, urutkan 900+ saham — atau gunakan Screener untuk filter sinyal teknikal."
          />
          <Suspense fallback={<div className="p-8 text-center text-text-secondary">Memuat…</div>}>
            <SahamView stocks={rows} sectors={sectors} assetClass="EQUITY" linkBase="/stocks" />
          </Suspense>
        </section>

        {/* Signup CTA — watchlist & signal alerts */}
        <LoginGate
          feature="Watchlist & Alert Sinyal"
          message="Daftar gratis untuk menyimpan watchlist, alert golden cross/oversold, dan trading plan otomatis untuk 950+ saham IDX."
        />

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

          {/* Strategy links — passes equity to commercial pages */}
          <SahamStrategyLinks />
        </section>
      </div>
    </div>
    </>
  );
}
