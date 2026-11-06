"use client";

import { useEffect, useState } from "react";
import { X, Gauge, Target, Bell, ArrowUpRight } from "lucide-react";

const DISMISS_KEY = "promo_founding_banner_dismissed";
const BOT_URL = "https://t.me/TeknikalidAgentBot";

export function PromoBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const val = localStorage.getItem(DISMISS_KEY);
      const isDismissed = val === "true" || val === "1";
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    } finally {
      setMounted(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (!mounted || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Promo Founding Member"
      className="relative rounded-xl border border-accent/20 bg-accent/[0.04] p-4 text-text-primary space-y-3"
    >
      {/* Header: Badge & Dismiss Button */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse" aria-hidden />
          FOUNDING MEMBER — 10 SLOT
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup promo"
          className="rounded-md p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors -mr-1"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Judul Singkat & Subjudul */}
      <div>
        <h2 className="text-sm font-bold text-text-primary leading-snug">
          Asisten Analisa Saham di Telegram
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
          Pantau pasar dan pergerakan teknikal saham langsung dari chat.
        </p>
      </div>

      {/* Bullet Value */}
      <ul className="space-y-1.5 text-xs text-text-secondary">
        <li className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-bullish shrink-0" aria-hidden />
          <span>Skor sinyal otomatis & ringkasan teknikal</span>
        </li>
        <li className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-bullish shrink-0" aria-hidden />
          <span>Level pantau otomatis (support & resistance)</span>
        </li>
        <li className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-bullish shrink-0" aria-hidden />
          <span>Alert harga instan via bot Telegram</span>
        </li>
      </ul>

      {/* Harga Founding Member & Tombol CTA */}
      <div className="pt-2 border-t border-border/60 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] font-medium text-text-tertiary block">
              Paket Night Trader
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xs text-text-tertiary line-through">Rp29.900</span>
              <span className="text-base font-bold text-text-primary">Rp14.900</span>
              <span className="text-xs text-text-tertiary">/bln</span>
            </div>
          </div>
          <span className="inline-flex items-center rounded-md bg-bullish-bg px-2 py-0.5 text-[10px] font-semibold text-bullish">
            Hemat 50%
          </span>
        </div>

        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent/90"
        >
          <span>Coba Gratis 3x</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>

        <p className="text-[10px] text-text-tertiary text-center leading-tight">
          bukan rekomendasi investasi
        </p>
      </div>
    </aside>
  );
}
