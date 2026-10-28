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
                  <path d="M16.555 12.555c-.06-.38-.13-.72-.22-1.05.3-.34.52-.73.6-1.17.22-1.2-.55-2.42-1.83-2.92-.16-.06-.33-.1-.5-.13-.36-1.02-1.3-1.78-2.53-1.95-1.6-.22-3.2.36-4.05 1.47-.3.4-.47.85-.5 1.32-1.05.2-1.8 1.02-1.8 2 0 .37.1.72.28 1.02-.7.62-1.13 1.5-1.13 2.46 0 1.66 1.3 3.05 3.1 3.55-.1.75.13 1.5.68 2.08.65.68 1.62 1.02 2.63 1.02 1.52 0 2.68-.72 3.32-1.98.2-.4.32-.82.37-1.25 1.1-.5 1.83-1.5 1.98-2.62.1-.75-.05-1.5-.4-2.15.1-.02.2-.04.3-.07zM12.3 8.9c.5.07.9.3 1.13.62-.42.06-.87.18-1.32.36-.6.24-1.13.56-1.56.93-.03-.13-.05-.27-.05-.4 0-.87.8-1.63 1.8-1.5zm-3.9 3.03c.03-.06.07-.12.11-.18.35.42.85.78 1.45 1.05.32.15.65.26.98.34-.3.3-.68.55-1.12.72-1.05.4-2.03.14-2.36-.5-.2-.4-.14-.97.94-1.43zm2.94 5.7c-.9.13-1.7-.35-1.85-1.06-.06-.3 0-.6.17-.86.27.08.56.12.86.12.32 0 .64-.04.95-.13.13.24.33.44.6.57-.13.75-.83 1.24-1.73 1.36zm3.6-2.92c-.08.6-.5 1.06-1.13 1.3-.1-.2-.24-.38-.42-.53.28-.24.5-.52.64-.84-.24.06-.5.1-.77.1-.3 0-.6-.04-.88-.12.35-.28.62-.62.78-1.02.75.1 1.5.35 2.1.72.02.13.02.26 0 .4z" opacity=".95" />
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
