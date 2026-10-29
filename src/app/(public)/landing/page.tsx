import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BarChart3, Bot, LineChart, ScanSearch, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "TeknikalID — Landing",
  description: "Halaman landing pilihan fitur TeknikalID.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/stocks",
    icon: LineChart,
    title: "Analisa Saham",
    desc: "Chart interaktif, 12 indikator teknikal, dan Skor Sinyal untuk 950+ saham IDX.",
    accent: "text-bullish",
  },
  {
    href: "/screener",
    icon: ScanSearch,
    title: "Screener",
    desc: "Saring ribuan saham sesuai kriteria teknikal & fundamental dalam hitungan detik.",
    accent: "text-accent",
  },
  {
    href: "/pasar",
    icon: BarChart3,
    title: "Pasar Hari Ini",
    desc: "Koran saham IHSG: movers, breadth, skor sinyal top-20, dan rekap sesi.",
    accent: "text-warning",
  },
  {
    href: "/screener?ai=1",
    icon: Bot,
    title: "Screener AI",
    desc: "Deskripsikan kriteria dalam bahasa manusia — AI susun filternya untukmu.",
    accent: "text-accent-bright",
  },
  {
    href: "/paper-trading",
    icon: TrendingUp,
    title: "Paper Trading",
    desc: "Latihan eksekusi tanpa risiko — simulasi portofolio dengan data pasar nyata.",
    accent: "text-bullish",
  },
  {
    href: "/auth/register",
    icon: ShieldCheck,
    title: "Daftar Gratis",
    desc: "Simpan watchlist, trading plan, dan portofolio. Gratis, tanpa kartu kredit.",
    accent: "text-text-primary",
  },
];

export default function LandingPage() {
  return (
    <div className="fade-in min-h-screen bg-bg-primary">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border bg-bg-card">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #1c1917 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border text-bullish bg-bullish/10 border-bullish/20">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Gratis untuk 950+ saham IDX
          </div>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-text-primary">
            Trading <span className="text-bullish">tanpa nebak-nebak.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            TeknikalID menggabungkan chart profesional, screener cepat, dan Skor
            Sinyal berbasis data — semua dalam satu platform buatan Indonesia.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/stocks"
              className="inline-flex items-center gap-2 bg-text-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-text-primary/90 transition-colors press-scale"
            >
              Mulai Analisa <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href="/screener"
              className="inline-flex items-center gap-2 bg-bg-primary text-text-primary border border-border px-6 py-3 rounded-xl font-semibold hover:border-accent/40 transition-colors press-scale"
            >
              Coba Screener
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group flex flex-col gap-3 bg-bg-card border border-border rounded-xl p-6 hover:border-accent/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-lg bg-bg-hover ${c.accent}`}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                  </span>
                  <ArrowRight
                    className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                    aria-hidden
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {c.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-text-tertiary">
          Sudah punya akun?{" "}
          <Link
            href="/auth/signin"
            className="font-semibold text-accent hover:underline"
          >
            Masuk di sini
          </Link>{" "}
          ·{" "}
          <Link href="/" className="text-text-secondary hover:underline">
            Kembali ke beranda
          </Link>
        </p>
      </section>
    </div>
  );
}
