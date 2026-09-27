import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * Cross-link cluster to the screener-strategy landing pages (saham-oversold,
 * overbought, golden-cross, blue-chip, broker). These pages target commercial
 * keywords but were orphaned (only in sitemap, no inbound links) — which is why
 * they earned ~0 organic. Rendering this on high-traffic surfaces (home, screener)
 * passes link equity so Google indexes + ranks them.
 *
 * Descriptive anchor text (not "klik di sini") — each link carries the target keyword.
 */
const STRATEGY_PAGES = [
  {
    href: "/saham-oversold",
    title: "Saham Oversold Hari Ini",
    desc: "RSI dibawah 30 — berpotensi rebound.",
  },
  {
    href: "/saham-overbought",
    title: "Saham Overbought Hari Ini",
    desc: "RSI diatas 70 — waspadai koreksi.",
  },
  {
    href: "/saham-golden-cross",
    title: "Saham Golden Cross Hari Ini",
    desc: "SMA50 menembus SMA200 — sinyal bullish.",
  },
  {
    href: "/saham-volume-spike",
    title: "Saham Volume Spike Hari Ini",
    desc: "Volume melonjak — uang besar masuk.",
  },
  {
    href: "/saham-pullback-sma20",
    title: "Saham Pullback ke SMA20",
    desc: "Tren naik yang koreksi — momen entry.",
  },
  {
    href: "/saham-death-cross",
    title: "Saham Death Cross Hari Ini",
    desc: "SMA50 di bawah SMA200 — waspadai bearish.",
  },
  {
    href: "/saham-ema-cross",
    title: "Saham EMA Cross Hari Ini",
    desc: "EMA12/EMA26 crossover — momentum cepat.",
  },
  {
    href: "/saham-blue-chip",
    title: "Saham Blue Chip IDX",
    desc: "Large-cap likuid untuk portofolio inti.",
  },
  {
    href: "/broker-saham-terbaik",
    title: "Broker Saham Terbaik",
    desc: "Perbandingan broker BEI terpercaya.",
  },
  {
    href: "/laporan-pasar",
    title: "Laporan Pasar Mingguan",
    desc: "Ringkasan IHSG, breadth & sinyal dari data asli.",
  },
] as const;

export function SahamStrategyLinks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      <SectionHeading
        className={compact ? "mb-3" : "mb-4"}
        eyebrow="update real-time"
        title="Screener Strategi Saham"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STRATEGY_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group block rounded-xl border border-border bg-bg-card p-4 hover:depth-shadow-hover transition-all"
          >
            <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
              {p.title}
            </p>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">{p.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
