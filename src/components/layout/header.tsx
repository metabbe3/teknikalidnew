"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "@/components/community/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { useIhsg } from "@/hooks/use-ihsg";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/stocks", label: "Saham" },
  { href: "/community", label: "Komunitas" },
  { href: "/berita", label: "Berita" },
  { href: "/akademi", label: "Akademi" },
];

// Tools demoted from main nav (low use: compare 2 views, paper-trading 13). Kept reachable.
const toolLinks = [
  { href: "/compare", label: "Bandingkan Saham" },
  { href: "/paper-trading", label: "Latihan Trading" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: ihsg } = useIhsg();

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-text-primary press-scale">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-bright" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>TeknikalID</span>
          </Link>

          {/* IHSG badge */}
          {ihsg && ihsg.close !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-bg-surface text-xs">
              <span className="text-text-secondary font-medium">IHSG</span>
              <span className="font-mono font-semibold text-text-primary tabular-nums">{ihsg.close.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
              {ihsg.changePercent !== null && (
                <span className={`font-mono font-bold tabular-nums ${ihsg.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                  {ihsg.changePercent >= 0 ? "+" : ""}{ihsg.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
          {ihsg && ihsg.close === null && (
            <div className="hidden sm:block w-28 h-6 animate-pulse bg-bg-hover rounded-md" />
          )}

          {/* Mobile IHSG — compact */}
          {ihsg && ihsg.close !== null && (
            <div className="sm:hidden flex items-center gap-1 text-xs">
              <span className="text-text-secondary font-medium">IHSG</span>
              {ihsg.changePercent !== null && (
                <span className={`font-mono font-bold tabular-nums ${ihsg.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                  {ihsg.changePercent >= 0 ? "+" : ""}{ihsg.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 text-sm font-medium" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  active
                    ? "text-text-primary bg-bg-hover"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Tools dropdown (demoted: compare, paper-trading) */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen((v) => !v)}
              onBlur={() => setTimeout(() => setToolsOpen(false), 120)}
              className="px-3 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover/50 transition-colors duration-150 inline-flex items-center gap-1"
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
            >
              Tools
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {toolsOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[11rem] rounded-md border border-border bg-bg-surface shadow-lg py-1 z-50">
                {toolLinks.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setToolsOpen(false)}
                    className={`block px-3 py-2 text-sm rounded mx-1 transition-colors ${
                      pathname.startsWith(t.href)
                        ? "text-text-primary bg-bg-hover"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                    }`}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {session?.user && (
            <Link href="/watchlist" className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors" aria-label="Daftar Pantauan">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </Link>
          )}

          <NotificationBell />

          <div className="hidden sm:block">
            <UserMenu user={session?.user} />
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <nav
        className={`sm:hidden border-t border-border bg-bg-surface overflow-hidden transition-all duration-200 ease-out ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-t-0"
        }`}
        aria-label="Main navigation"
      >
        <div className="px-3 pb-3 pt-1 space-y-0.5">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "text-text-primary bg-bg-hover"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Tools</p>
          {toolLinks.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(t.href)
                  ? "text-text-primary bg-bg-hover"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {t.label}
            </Link>
          ))}
          {session?.user ? (
            <>
              <Link
                href={`/profile/${session.user.username}`}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                Profil Saya
              </Link>
              <Link
                href="/watchlist"
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                Daftar Pantauan
              </Link>
              <Link
                href="/portfolio"
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                Portofolio
              </Link>
              <Link
                href="/bottom-fishing"
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                Bottom Fishing
              </Link>
              <Link
                href="/trading-plan"
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                Trading Plan
              </Link>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                Keluar
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-primary bg-bg-hover transition-colors"
            >
              Masuk
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
