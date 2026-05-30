"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "@/components/community/notification-bell";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/stocks", label: "Saham" },
  { href: "/screener", label: "Screener" },
  { href: "/compare", label: "Bandingkan" },
  { href: "/community", label: "Komunitas" },
  { href: "/berita", label: "Berita" },
  { href: "/akademi", label: "Akademi" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setUserMenuOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [userMenuOpen]);

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-base font-bold text-text-primary press-scale">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>TeknikalID</span>
        </Link>

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

          {session?.user ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-bg-hover transition-colors"
                aria-expanded={userMenuOpen}
                aria-label="Menu pengguna"
              >
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                    {session.user.username?.[0]?.toUpperCase() || session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-bg-card depth-shadow rounded-xl border border-border py-1 z-50">
                    <Link
                      href={`/profile/${session.user.username}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      Profil Saya
                    </Link>
                    <Link
                      href="/watchlist"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      Daftar Pantauan
                    </Link>
                    <Link
                      href="/profile/edit"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      Pengaturan
                    </Link>
                    {session.user.role === "ADMIN" && (
                      <Link
                        href="/admin/reports"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-accent hover:bg-bg-hover transition-colors"
                      >
                        Moderasi
                      </Link>
                    )}
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut(); }}
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="hidden sm:inline-flex items-center bg-text-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-text-primary/90 transition-colors press-scale"
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
