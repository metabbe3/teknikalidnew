import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/stocks", label: "Saham" },
  { href: "/stocks?view=screener", label: "Screener" },
  { href: "/berita", label: "Berita" },
  { href: "/akademi", label: "Akademi" },
  // Demoted from nav 2026-09-07 (27 views all-time) — still reachable here.
  { href: "/community", label: "Komunitas" },
  { href: "/compare", label: "Bandingkan Saham" },
  { href: "/paper-trading", label: "Latihan Trading" },
  { href: "/laporan-pasar", label: "Laporan Pasar Mingguan" },
  { href: "/pasar", label: "Koran Pasar Live" },
  { href: "/track-record", label: "Track Record" },
];

const legalLinks = [
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Ketentuan" },
  { href: "/metodologi", label: "Metodologi" },
  { href: "/about", label: "Tentang Kami" },
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
              Analisa teknikal untuk trader Indonesia — saham IDX dan aset lainnya. Data bersumber dari Yahoo Finance dengan jeda ~5-10 menit. Bukan rekomendasi investasi.
            </p>
            <a
              href="https://t.me/teknikalid"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-accent/60 hover:text-accent"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Brief &amp; sinyal harian di Telegram
            </a>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://instagram.com/teknikal.id"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram teknikal.id"
                className="inline-flex items-center justify-center rounded-md border border-border bg-surface p-2 text-text-secondary transition-colors hover:border-accent/60 hover:text-accent"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://www.threads.net/@teknikal.id"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Threads teknikal.id"
                className="inline-flex items-center justify-center rounded-md border border-border bg-surface p-2 text-text-secondary transition-colors hover:border-accent/60 hover:text-accent"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.47 12.186v-.011c.03-3.4.88-6.253 2.525-8.305C5.845 1.565 8.598.384 12.18.36h.007c2.796.02 5.09.743 6.818 2.148 1.678 1.364 2.791 3.35 3.212 5.743l-2.292.472c-.332-1.931-1.203-3.443-2.586-4.495-1.347-1.02-3.16-1.545-5.16-1.56-2.918.022-5.083 1.003-6.607 2.994-1.303 1.704-1.979 4.154-2.01 6.996.031 2.842.707 5.292 2.01 6.995 1.525 1.991 3.69 2.972 6.608 2.995 2.304-.016 4.213-.648 5.676-1.878 1.638-1.378 2.493-3.44 2.543-6.127l-3.869-.004.002-2.351 6.293.006-.002 1.177c-.03 4.392-1.384 7.67-3.918 9.481C18.174 23.057 15.446 23.976 12.186 24z" />
                </svg>
              </a>
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Bahasa chart untuk trader Indonesia</span>
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
