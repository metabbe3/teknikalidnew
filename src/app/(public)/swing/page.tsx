import type { Metadata } from "next";
import Link from "next/link";
import { signalBadge } from "@/lib/seo/signal-badge";
import { PageHero } from "@/components/layout/page-hero";
import { StockLogo } from "@/components/stock/stock-logo";
import { GET, type SwingMarketResponse } from "@/app/api/market/swing/route";
import { formatPrice, stripJk, dateLabel } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import { TrendingUp, ShieldAlert, CheckCircle2, ArrowUpRight, BarChart3, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setup Swing Saham Hari Ini — teknikal.id",
  description:
    "Katalog setup swing trading saham IDX hari ini dengan skor sinyal, estimasi rasio Risk:Reward berbasis ATR, RSI, dan jarak SMA50 dilengkapi bukti backtest historis 20 hari.",
  alternates: { canonical: "/swing" },
  openGraph: {
    title: "Setup Swing Saham Hari Ini — teknikal.id",
    description:
      "Daftar 10 kandidat swing trading saham IDX teratas dengan skor sinyal dan bukti backtest forward return 20 hari perdagangan.",
  },
};

function formatPercentWithSign(val: number | null | undefined, isRatio = true): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "—";
  const num = isRatio ? val * 100 : val;
  const sign = num > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num)}%`;
}

function formatPercentPlain(val: number | null | undefined, isRatio = true): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "—";
  const num = isRatio ? val * 100 : val;
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num)}%`;
}

function formatIntId(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "0";
  return new Intl.NumberFormat("id-ID").format(val);
}

export default async function SwingPage() {
  let data: SwingMarketResponse | null = null;
  try {
    const res = await GET();
    if (res.ok) {
      const json = await res.json();
      if (
        json &&
        Array.isArray(json.candidates) &&
        json.backtest?.stats34 &&
        json.backtest?.stats20
      ) {
        data = json as SwingMarketResponse;
      }
    }
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary pb-16">
        <PageHero
          eyebrow="Swing Trader Pack v1"
          title="Setup Swing Saham Hari Ini"
          description="Seleksi 10 emiten dengan skor teknikal terkuat dari seluruh IHSG untuk swing trading 2–8 minggu, dilengkapi kalkulasi rasio Risk:Reward berbasis ATR dan validasi backtest historis."
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
          <div className="rounded-xl border border-border bg-bg-card p-12 text-center space-y-3">
            <Target className="h-10 w-10 text-text-tertiary mx-auto" />
            <h2 className="text-lg font-semibold text-text-primary">
              Belum ada data swing hari ini
            </h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Data setup swing sedang diperbarui atau sesi pasar belum menghasilkan kandidat yang memenuhi kriteria likuiditas dan sinyal teknikal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { asOf, backtest, candidates } = data;
  const { stats34, stats20 } = backtest;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary pb-16">
      {/* ── Page Hero ── */}
      <PageHero
        eyebrow="Swing Trader Pack v1"
        title="Setup Swing Saham Hari Ini"
        description="Seleksi 10 emiten dengan skor teknikal terkuat dari seluruh IHSG untuk swing trading 2–8 minggu, dilengkapi kalkulasi rasio Risk:Reward berbasis ATR dan validasi backtest historis."
      >
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-bg-card font-medium">
            <span className="h-2 w-2 rounded-full bg-bullish animate-pulse" />
            Data EOD Sesi: {dateLabel(asOf)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-bg-card">
            Horizon: 20 Hari Bursa (~1 Bulan Kalender)
          </span>
        </div>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-12">
        {/* ── Table Top 10 Kandidat Swing (paling atas) ── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  Top 10 Kandidat Swing Hari Ini
                </h2>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Diurutkan berdasarkan skor sinyal tertinggi dari emiten aktif di Bursa Efek Indonesia.
              </p>
            </div>
            <span className="text-xs text-text-tertiary">
              Klik nama saham untuk analisis chart &amp; indikator detail
            </span>
          </div>

          <div className="rounded-xl border border-border bg-bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-hover/60 text-xs font-semibold text-text-secondary">
                    <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6">
                      Emiten
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Harga Terakhir
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Skor Sinyal
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      R:R Estimasi
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      RSI (14)
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6">
                      Jarak SMA50
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidates.map((c) => {
                    const cleanTicker = stripJk(c.ticker);
                    const isAboveSma = c.distanceSma50Pct !== null && c.distanceSma50Pct >= 0;

                    return (
                      <tr
                        key={c.ticker}
                        className="hover:bg-bg-hover/50 transition-colors group"
                      >
                        {/* Emiten */}
                        <td className="py-3 pl-4 pr-3 sm:pl-6">
                          <Link
                            href={`/stocks/${cleanTicker}`}
                            className="flex items-center gap-3 min-h-[44px] py-1"
                            title={`Lihat detail ${cleanTicker}`}
                          >
                            <StockLogo name={c.name} ticker={c.ticker} size={36} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-text-primary group-hover:text-accent transition-colors">
                                  {cleanTicker}
                                </span>
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                              </div>
                              <p className="text-xs text-text-secondary truncate max-w-[140px] sm:max-w-[200px]">
                                {c.name}
                              </p>
                              <span className="text-[10px] text-text-tertiary">
                                {c.sector}
                              </span>
                            </div>
                          </Link>
                        </td>

                        {/* Harga Terakhir */}
                        <td className="px-3 py-3 font-semibold tabular-nums text-text-primary">
                          {formatPrice(c.close)}
                        </td>

                        {/* Skor Sinyal */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${signalBadge(c.signalScore).cls}`}
                            >
                              {formatDecimalId(c.signalScore, 2)}
                            </span>
                            <span className="text-[11px] text-text-tertiary font-medium">
                              {signalBadge(c.signalScore).label}
                            </span>
                          </div>
                        </td>

                        {/* R:R Estimasi */}
                        <td className="px-3 py-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold tabular-nums text-accent">
                              1 : {c.estimatedRR != null ? formatDecimalId(c.estimatedRR, 1) : "—"}
                            </span>
                            <p className="text-[11px] text-text-tertiary tabular-nums">
                              Stop: {formatPrice(c.estimatedStop)}
                            </p>
                          </div>
                        </td>

                        {/* RSI 14 */}
                        <td className="px-3 py-3 tabular-nums">
                          <span
                            className={`font-medium ${
                              c.rsi14 !== null && c.rsi14 < 30
                                ? "text-bullish font-semibold"
                                : c.rsi14 !== null && c.rsi14 > 70
                                ? "text-warning font-semibold"
                                : "text-text-primary"
                            }`}
                          >
                            {c.rsi14 !== null ? formatDecimalId(c.rsi14, 1) : "—"}
                          </span>
                        </td>

                        {/* Jarak SMA50 */}
                        <td className="py-3 pl-3 pr-4 sm:pr-6 tabular-nums">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              isAboveSma
                                ? "text-bullish bg-bullish-bg"
                                : "text-bearish bg-bearish-bg"
                            }`}
                          >
                            {formatPercentWithSign(c.distanceSma50Pct, false)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Metodologi & Panduan Eksekusi Swing Trading ── */}
        <details className="group rounded-xl border border-border bg-bg-card p-6 sm:p-8">
          <summary className="cursor-pointer list-none flex items-center justify-between text-text-primary font-semibold text-lg [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              <h2>Metodologi &amp; Panduan Eksekusi Swing Trading</h2>
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
              Swing trading adalah strategi memanfaatkan ayunan tren harga jangka menengah dengan jangka waktu simpan
              2 hingga 8 minggu. Berbeda dengan scalping atau day trading yang menuntut pemantauan layar setiap menit,
              swing trading dirancang bagi pelaku pasar yang ingin menangkap pergerakan substansial saat momentum akumulasi
              atau konfirmasi pembalikan arah (reversal) sedang berlangsung.
            </p>
            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              <div className="rounded-lg border border-border/80 bg-bg-primary/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                  1. Skor Sinyal
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Skor sinyal menggabungkan konfirmasi moving average (SMA20/50/200), RSI14, MACD, dan Supertrend yang
                  dipetakan ke skala −1 s.d. +1 untuk mengeliminasi bias subjektif.
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-bg-primary/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                  2. Stop Loss Berbasis ATR
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Level pembatas risiko dihitung secara dinamis dari Average True Range (1,5× ATR) guna mencegah
                  penutupan posisi prematur akibat noise volatilitas normal harian.
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-bg-primary/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                  3. Rasio Risk:Reward
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Hanya setup dengan potensi keuntungan yang sepadan terhadap risiko terukur yang layak dieksekusi.
                  Rasio minimal 1:1,5 memastikan pertumbuhan portofolio bertahan jangka panjang.
                </p>
              </div>
            </div>
          </div>
        </details>

        {/* ── Section Bukti Backtest ── */}
        <details className="group rounded-xl border border-border bg-bg-card p-6 sm:p-8">
          <summary className="cursor-pointer list-none flex items-center justify-between text-text-primary font-semibold text-lg [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                    Bukti Backtest Historis (Forward Return 20 Hari)
                  </h2>
                  <span className="text-xs font-bold tabular-nums text-bullish bg-bullish-bg border border-bullish/30 px-2 py-0.5 rounded-full">
                    Win Rate {formatPercentPlain(stats34.winRate, true)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Evaluasi empiris seluruh sinyal saham IDX selama 24 bulan terakhir tanpa look-ahead bias.
                </p>
              </div>
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
          <div className="mt-4 pt-4 border-t border-border space-y-6">

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Kartu Ambang P95 (0.34) */}
            <div className="rounded-xl border border-bullish/30 bg-bullish-bg/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div>
                  <span className="text-xs font-semibold text-bullish uppercase tracking-wider">
                    Tier Utama: Ambang P95 (Skor ≥ 0,34)
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary mt-0.5">
                    Setup Momentum Terkuat
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full border border-bullish/40 text-bullish font-medium">
                  {formatIntId(stats34.signals)} Sinyal
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-bg-card border border-border p-3.5">
                  <span className="text-xs text-text-tertiary">Win Rate (20 Hari)</span>
                  <div className="text-2xl font-bold tabular-nums text-bullish mt-1">
                    {formatPercentPlain(stats34.winRate, true)}
                  </div>
                  <span className="text-[11px] text-text-secondary">
                    Persentase sinyal ditutup profit
                  </span>
                </div>

                <div className="rounded-lg bg-bg-card border border-border p-3.5">
                  <span className="text-xs text-text-tertiary">Rata-rata Return</span>
                  <div className="text-2xl font-bold tabular-nums text-text-primary mt-1">
                    {formatPercentWithSign(stats34.avgReturn, true)}
                  </div>
                  <span className="text-[11px] text-text-secondary">
                    Median: {formatPercentWithSign(stats34.medianReturn, true)}
                  </span>
                </div>
              </div>

              {/* Breakdown per Label */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-text-secondary">
                  Performa Berdasarkan Label:
                </span>
                <div className="space-y-1.5">
                  {Object.entries(stats34.perLabelBreakdown).map(([label, s]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-bg-card/70 border border-border/70"
                    >
                      <span className="font-medium text-text-primary">{label}</span>
                      <div className="flex items-center gap-4 tabular-nums">
                        <span className="text-text-secondary">{formatIntId(s.signals)} sinyal</span>
                        <span className="text-bullish font-semibold">
                          Win: {formatPercentPlain(s.winRate, true)}
                        </span>
                        <span className="font-semibold text-text-primary">
                          Avg: {formatPercentWithSign(s.avgReturn, true)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kartu Ambang Pembanding (0.20) */}
            <div className="rounded-xl border border-border bg-bg-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    Pembanding: Ambang Selektif (Skor ≥ 0,20)
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary mt-0.5">
                    Cakupan Sinyal Lebih Luas
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full border border-border text-text-secondary font-medium">
                  {formatIntId(stats20.signals)} Sinyal
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-bg-primary/60 border border-border p-3.5">
                  <span className="text-xs text-text-tertiary">Win Rate (20 Hari)</span>
                  <div className="text-2xl font-bold tabular-nums text-text-primary mt-1">
                    {formatPercentPlain(stats20.winRate, true)}
                  </div>
                  <span className="text-[11px] text-text-secondary">
                    Persentase sinyal ditutup profit
                  </span>
                </div>

                <div className="rounded-lg bg-bg-primary/60 border border-border p-3.5">
                  <span className="text-xs text-text-tertiary">Rata-rata Return</span>
                  <div className="text-2xl font-bold tabular-nums text-text-primary mt-1">
                    {formatPercentWithSign(stats20.avgReturn, true)}
                  </div>
                  <span className="text-[11px] text-text-secondary">
                    Median: {formatPercentWithSign(stats20.medianReturn, true)}
                  </span>
                </div>
              </div>

              {/* Rangkuman Metrik */}
              <div className="p-3.5 rounded-lg bg-bg-primary/40 border border-border space-y-2 text-xs text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Rata-rata Periode Simpan:</span>
                  <span className="font-semibold text-text-primary tabular-nums">
                    {stats20.avgHoldDays} hari bursa
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Look-ahead Safety:</span>
                  <span className="font-semibold text-bullish flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Terproteksi
                  </span>
                </div>
                <p className="text-[11px] text-text-tertiary pt-1 border-t border-border/60">
                  Data dengan rekam jejak kurang dari 20 hari bursa setelah tanggal sinyal secara otomatis
                  dikecualikan dari perhitungan untuk mencegah distorsi probabilitas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>

        {/* ── Disclaimer Singkat ── */}
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:p-5 flex items-start gap-3.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary block">
              Bukan Nasihat Keuangan (Financial Advice)
            </span>
            <p>
              Seluruh kalkulasi sinyal, estimasi rasio Risk:Reward, dan statistik backtest disajikan murni untuk tujuan
              edukasi teknikal serta analisis kuantitatif independen. Horizon swing trading berkisar 2–8 minggu. Kinerja
              masa lalu tidak menjamin hasil di masa depan. Selalu tentukan toleransi risiko dan batasan modal sebelum
              mengambil keputusan investasi.
            </p>
          </div>
        </section>

        {/* Telegram Bot CTA */}
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Kabari saya kalau ada kandidat baru
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              Notifikasi setup swing trading otomatis saat sinyal baru terkonfirmasi
            </p>
          </div>
          <a
            href="https://t.me/TeknikalidAgentBot?start=web_swing"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 sm:mt-0 inline-flex items-center justify-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-xs font-semibold hover:bg-accent/90 transition-colors shrink-0"
          >
            Kabari saya kalau ada kandidat baru — TeknikalAgent di Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
