"use client";

import { useState } from "react";
import { formatPercentPlain } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "@/components/community/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { useIhsg } from "@/hooks/use-ihsg";

// Focused nav (2026-09-07 data cut): users only touch Saham + Berita. Crypto hidden
// behind NEXT_PUBLIC_CRYPTO_ENABLED=false; Komunitas reachable via footer + stock
// discussion tabs (needs user critical mass before it earns a nav slot).
const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/stocks", label: "Saham" },
  { href: "/berita", label: "Berita" },
  { href: "/akademi", label: "Akademi" },
];

// Tools demoted from main nav (low use: compare 2 views, paper-trading 13). Kept reachable.
const toolLinks = [
  { href: "/pasar", label: "Koran Pasar Live" },
  { href: "/track-record", label: "Track Record" },
  { href: "/trading-plan", label: "Trading Plan" },
  { href: "/market-structure", label: "Market Structure" },
  { href: "/bottom-fishing", label: "Bottom Fishing" },
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
              <span data-live-price="^JKSE" className="font-mono font-semibold text-text-primary tabular-nums">{ihsg.close.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
              {ihsg.changePercent !== null && (
                <span data-live-percent="^JKSE" className={`font-mono font-bold tabular-nums ${ihsg.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                  {ihsg.changePercent >= 0 ? "+" : "-"}{formatPercentPlain(ihsg.changePercent)}%
                </span>
              )}
              {ihsg?.date && (() => {
                const d = new Date(ihsg.date);
                const eod = `EOD ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
                return (
                  <span data-live-fresh data-fresh-eod={eod} className="font-mono text-[10px] text-text-tertiary border-l border-border pl-1.5 ml-0.5 whitespace-nowrap">{eod}</span>
                );
              })()}
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
                <span data-live-percent="^JKSE" className={`font-mono font-bold tabular-nums ${ihsg.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                  {ihsg.changePercent >= 0 ? "+" : "-"}{formatPercentPlain(ihsg.changePercent)}%
                </span>
              )}
              {ihsg?.date && (() => {
                const d = new Date(ihsg.date);
                const eod = `EOD ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
                return (
                  <span data-live-fresh data-fresh-eod={eod} className="font-mono text-[10px] text-text-tertiary">{eod}</span>
                );
              })()}
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
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  active
                    ? "text-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                }`}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-2 right-2 -bottom-[7px] h-[2.5px] rounded-full bg-accent"
                  />
                )}
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
                      t.href === "/paper-trading"
                        ? "font-semibold text-accent hover:bg-accent/10"
                        : pathname.startsWith(t.href)
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
          <NotificationBell />

          <div className="hidden sm:block">
            <UserMenu user={session?.user} />
          </div>

          {/* Mobile: always-visible sign-in entry (menu dropdown used to clip it away) */}
          {!session?.user && (
            <Link
              href="/auth/signin"
              className="sm:hidden inline-flex items-center bg-text-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-text-primary/90 transition-colors press-scale"
            >
              Masuk
            </Link>
          )}

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
        className={`sm:hidden border-t border-border bg-bg-surface overflow-y-auto transition-all duration-200 ease-out ${
          menuOpen ? "max-h-[calc(100dvh-3.5rem)] opacity-100" : "max-h-0 opacity-0 border-t-0"
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
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border-l-[3px] ${
                  active
                    ? "text-accent font-semibold bg-accent/10 border-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover border-transparent"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          {session?.user ? (
            <>
              <Link
                href={`/profile/${session.user.username}`}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
Tools
              </Link>
          {toolLinks.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 px-3 pl-6 rounded-lg text-sm text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              {t.label}
            </Link>
          ))}
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
            <div className="pt-2 mt-1 border-t border-border grid grid-cols-2 gap-2">
              <Link
                href="/auth/signin"
                onClick={() => setMenuOpen(false)}
                className="text-center py-2.5 px-3 rounded-lg text-sm font-medium text-text-primary bg-bg-hover transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMenuOpen(false)}
                className="text-center py-2.5 px-3 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent/90 transition-colors"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
