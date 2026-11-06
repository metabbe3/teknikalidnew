"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { stripJk } from "@/lib/utils";
import { tgDeepLink } from "@/lib/tg-deeplink";
import { signalBadge } from "@/lib/seo/signal-badge";

const DISMISSED_KEY = "bouncer_hook_dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface BouncerHookProps {
  ticker: string;
  signalScore?: number | null;
  signalLabel?: string | null;
  isAuthed?: boolean;
}

function checkIsDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) return false;
    if (Date.now() - timestamp < SEVEN_DAYS_MS) {
      return true;
    }
    localStorage.removeItem(DISMISSED_KEY);
    return false;
  } catch {
    return false;
  }
}

function setDismissedInStorage(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Ignore private browsing error
  }
}

export function BouncerHook({
  ticker,
  signalScore,
  signalLabel,
  isAuthed = false,
}: BouncerHookProps) {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(checkIsDismissed());

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 300);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // SSR-safe: hindari hydration mismatch (render null sampai mounted)
  if (!mounted || dismissed) return null;

  // Guest only: sembunyikan bila sudah login
  if (isAuthed || status === "authenticated") {
    return null;
  }

  const clean = stripJk(ticker);
  const botLink = tgDeepLink([ticker]);
  const scoreNum = signalScore !== undefined && signalScore !== null ? signalScore : null;
  const scoreStr = scoreNum !== null ? scoreNum.toFixed(2).replace(".", ",") : null;
  const badge = scoreNum !== null ? signalBadge(scoreNum) : null;

  const handleDismiss = () => {
    setDismissed(true);
    setDismissedInStorage();
  };

  return (
    <aside
      aria-label={`Aksi cepat harga saham ${clean}`}
      className={`md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg-card/95 backdrop-blur shadow-lg transition-transform duration-300 ${
        scrolled ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 h-14 max-h-16 overflow-hidden">
        {/* Left: Skor sinyal + micro-copy + micro-action inline alert */}
        <div className="flex items-center gap-2 min-w-0">
          {scoreStr !== null && badge && (
            <span
              className={`shrink-0 text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${badge.cls}`}
              title={`Skor Sinyal: ${scoreStr}${signalLabel ? ` (${signalLabel})` : ""}`}
            >
              {scoreStr}
            </span>
          )}
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-xs font-semibold text-text-primary truncate">
              Mau analisa {clean}?
            </span>
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              data-engagement="bouncer_hook_alert"
              className="text-[10px] text-text-tertiary hover:text-text-secondary underline decoration-border truncate transition-colors"
            >
              Pasang alert harga
            </a>
          </div>
        </div>

        {/* Right: Tombol Tanya AI + Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            data-engagement="bouncer_hook_tanya_ai"
            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-white hover:opacity-90 shadow-sm transition-opacity"
          >
            💬 Tanya AI
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 -mr-1 text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Tutup strip aksi"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default BouncerHook;
