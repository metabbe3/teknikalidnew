import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-card">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">TeknikalID</span>
            </div>
            <p className="text-[11px] text-text-tertiary max-w-xs leading-relaxed">
              Platform analisa teknikal saham BEI. Data bersumber dari Yahoo Finance dengan jeda ~5-10 menit.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-secondary">
            <Link href="/" className="hover:text-text-primary transition-colors">Beranda</Link>
            <Link href="/stocks" className="hover:text-text-primary transition-colors">Saham</Link>
            <Link href="/screener" className="hover:text-text-primary transition-colors">Screener</Link>
            <Link href="/disclaimer" className="hover:text-text-primary transition-colors">Disclaimer</Link>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">Privasi</Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors">Ketentuan</Link>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-text-tertiary">&copy; 2026 TeknikalID. Bukan rekomendasi investasi.</p>
        </div>
      </div>
    </footer>
  );
}
