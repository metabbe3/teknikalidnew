import Link from "next/link";
import { ChannelCta } from "@/components/stock/channel-cta";

interface AlertPreviewCardProps {
  ticker: string;
  signalLabel?: string | null;
  hasSignal?: boolean;
}

/**
 * Alert preview CTA — anon only (register funnel: tunjukkan yang TERSEMBUNYI di balik login).
 * Muncul di halaman saham yang PUNYA sinyal aktif (golden cross / oversold / dsb).
 * Isi: preview alert yang "akan mereka dapat" + tombol daftar.
 * Pasca-login tidak dirender (tak perlu — alert asli ada di watchlist).
 */
export function AlertPreviewCard({ ticker, signalLabel, hasSignal }: AlertPreviewCardProps) {
  if (!hasSignal || !signalLabel) return null;
  const clean = ticker.replace(/\.JK$/, "");
  return (
    <section
      aria-label="Preview alert sinyal"
      className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4 sm:p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold text-text-primary">
              {clean} sedang mengirim sinyal
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {signalLabel}
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Member dapat <strong className="font-semibold text-text-primary">alert otomatis</strong> untuk sinyal seperti ini — golden cross, oversold, death cross — langsung ke watchlist, untuk 950+ saham IDX. Tanpa perlu cek manual tiap hari.
          </p>
          <div className="pt-1">
            <ChannelCta compact />
          </div>
        </div>
        <Link
          href="/auth/register"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-text-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity press-scale"
        >
          Daftar gratis — buka alert
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
