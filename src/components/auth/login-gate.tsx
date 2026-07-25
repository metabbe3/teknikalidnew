import Link from "next/link";

/**
 * Server-rendered login gate. Replaces the leaky `GatedContent` blur on data-rich
 * sections: this renders a static placeholder + signup CTA and NEVER receives the
 * real data, so nothing sensitive lands in the anon HTML (bots/Google can't read it).
 *
 * Use for sections whose underlying data should require login (chart, detailed
 * indicators, fundamentals, trading plan, company detail).
 */
export function LoginGate({
  message,
  feature,
  className = "",
}: {
  message: string;
  /** Short label of what's locked, e.g. "Chart Interaktif". */
  feature?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dashed border-border bg-bg-card/60 p-6 text-center ${className}`}
    >
      {/* decorative lock strip — no real data */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden>
        <div className="h-full w-full" style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 14px)" }} />
      </div>
      <div className="relative z-10 mx-auto max-w-sm space-y-3">
        {feature && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">{feature}</p>
        )}
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors press-scale"
        >
          Daftar Gratis
        </Link>
        <p className="text-[11px] text-text-tertiary">Gratis · tidak perlu kartu kredit</p>
      </div>
    </div>
  );
}
