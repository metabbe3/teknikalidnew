import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/stocks", label: "Saham" },
  { href: "/screener", label: "Screener" },
  { href: "/berita", label: "Berita" },
  { href: "/akademi", label: "Akademi" },
];

const legalLinks = [
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Ketentuan" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-card">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-sm font-bold text-text-primary">TeknikalID</span>
            </div>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              Platform analisa teknikal saham BEI. Data bersumber dari Yahoo Finance dengan jeda ~5-10 menit. Bukan rekomendasi investasi.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Built for IDX traders</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">Navigasi</p>
            <div className="flex flex-col gap-1.5">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">Legal</p>
            <div className="flex flex-col gap-1.5">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-secondary">&copy; 2026 TeknikalID. All rights reserved.</p>
          <p className="text-[10px] text-text-tertiary">Data provided by Yahoo Finance. Not financial advice.</p>
        </div>
      </div>
    </footer>
  );
}
