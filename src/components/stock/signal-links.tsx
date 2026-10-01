import Link from "next/link";

/**
 * "Jelajahi sinyal lain" chip row for /stocks — pure SSR, guest-visible,
 * static constants (no queries, no gating). Context: the weekly-signal widget
 * (prod-19-01) centralizes clicks onto GC/DC anchors only; 10/12 topical
 * signal pages get ~0 views (CTO 30 Sep: widget anchor CTR = 0, signal pages
 * 0v 6 days straight). This row feeds them internal links from the highest-
 * traffic surface (78% of nobot views). See wid-2026-09-27-1.
 *
 * NOTE: PRD also lists a hub "/saham" — that route 404s (no page.tsx), so it
 * is intentionally NOT linked here (soft-404 risk on an SEO moat page).
 */
const SIGNAL_PAGES = [
  { href: "/saham-golden-cross", label: "Golden Cross" },
  { href: "/saham-death-cross", label: "Death Cross" },
  { href: "/saham-oversold", label: "Oversold (RSI)" },
  { href: "/saham-overbought", label: "Overbought (RSI)" },
  { href: "/saham-pullback-sma20", label: "Pullback SMA20" },
  { href: "/saham-ema-cross", label: "EMA Cross" },
  { href: "/saham-macd-bullish", label: "MACD Bullish" },
  { href: "/saham-stochastic-oversold", label: "Stochastic Oversold" },
  { href: "/saham-volume-spike", label: "Volume Spike" },
  { href: "/saham-blue-chip", label: "Blue Chip" },
] as const;

export function SignalLinks() {
  return (
    <section className="mt-6" aria-label="Jelajahi sinyal lain">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
        Jelajahi sinyal lain
      </p>
      <div className="flex flex-wrap gap-2">
        {SIGNAL_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="inline-flex items-center rounded-full border border-border bg-bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
          >
            {p.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
