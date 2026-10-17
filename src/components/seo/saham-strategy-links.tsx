"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * Cross-link cluster to the screener-strategy landing pages (saham-oversold,
 * overbought, golden-cross, blue-chip, broker) plus the 3 fundamental landings
 * (saham-dividen, undervalued, value-growth — ux-2026-10-17-01, 0 views orphan).
 * These pages target commercial
 * keywords but were orphaned (only in sitemap, no inbound links) — which is why
 * they earned ~0 organic. Rendering this on high-traffic surfaces (home, screener)
 * passes link equity so Google indexes + ranks them.
 *
 * Descriptive anchor text (not "klik di sini") — each link carries the target keyword.
 */
const STRATEGY_PAGES = [
  {
    href: "/saham-dividen",
    title: "Saham Dividen Tinggi",
    desc: "Daftar saham dividen tinggi Indonesia — yield terbaru.",
  },
  {
    href: "/saham-undervalued",
    title: "Saham Undervalued",
    desc: "PE di bawah 15 & PB di bawah 1.5 — murah fundamental.",
  },
  {
    href: "/saham-value-growth",
    title: "Saham Value Growth",
    desc: "Murah sekaligus bertumbuh — screener fundamental.",
  },
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

/** 4 kartu tampil dulu — sisanya expand. Mengurangi overwhelm mobile tanpa
 * mengorbankan internal-link SEO (link tetap di DOM saat expand, crawlable). */
const VISIBLE = 4;

export function SahamStrategyLinks({ compact = false }: { compact?: boolean }) {
  const visible = STRATEGY_PAGES.slice(0, VISIBLE);
  const rest = STRATEGY_PAGES.slice(VISIBLE);
  return (
    <section aria-label="Screener strategi saham" className={compact ? "space-y-3" : "space-y-3"}>
      <SectionHeading
        className="mb-3"
        eyebrow="update real-time"
        title="Screener Strategi Saham"
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {visible.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group block rounded-xl border border-border bg-bg-card p-3 hover:depth-shadow-hover transition-all"
          >
            <p className="text-[13px] font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
              {p.title}
            </p>
            <p className="mt-0.5 text-[11px] text-text-tertiary leading-snug line-clamp-2">{p.desc}</p>
          </Link>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-text-tertiary">
          <span className="uppercase tracking-[0.1em] font-semibold">Lainnya</span>
          {rest.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-accent transition-colors">
              {p.title}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
