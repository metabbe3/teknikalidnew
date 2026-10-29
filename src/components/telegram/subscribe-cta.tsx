"use client";

import { useEffect, useState } from "react";

/**
 * TelegramSubscribeCta (retention-2026-10-28) — CTA subscribe bot TIDAK annoying:
 * - dismissible via localStorage 7 hari (inline variant)
 * - copy halus, bahasa awam, tap target ≥44px, bukan-rekomendasi vibes
 * - SATU PINTU deep-link t.me/TeknikalidBot?start=KODE_JK (identik stock page)
 * - footer variant: 1 baris kecil, tanpa dismiss (statis, di server component juga bisa
 *   jika tanpa ticker — tapi dipakai di client parent)
 */
const LS_KEY = "tgcta_dismissed_until";

export function TelegramSubscribeCta({
  variant = "inline",
  ticker,
}: {
  variant?: "inline" | "footer";
  ticker?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const until = Number(localStorage.getItem(LS_KEY) || 0);
      if (until > Date.now()) setDismissed(true);
    } catch {
      /* private mode — biarkan tampil */
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(LS_KEY, String(Date.now() + 7 * 86400_000));
    } catch {
      /* ignore */
    }
  };

  const start = ticker ? `?start=${encodeURIComponent(ticker.replace(/\.JK$/, "") + "_JK")}` : "";
  const href = `https://t.me/TeknikalidBot${start}`;

  if (variant === "footer") {
    return (
      <p className="border-t border-border pt-3 text-xs text-text-tertiary">
        Mau update tiap hari tanpa buka browser?{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent hover:underline"
        >
          Pantau lewat Telegram (gratis, tanpa login)
        </a>
        .
      </p>
    );
  }

  if (!mounted || dismissed) return null;

  return (
    <aside
      className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/5 to-transparent p-4"
      aria-label="Langganan pantauan Telegram"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">
            Suka lihat radar &amp; sinyal tiap hari?
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Pilih saham favoritmu — ringkasan harga, sinyal, dan riset baru
            dikirim ke Telegram kamu setiap sore. Gratis, tanpa login, berhenti
            kapan saja.
          </p>
        </div>
        <button
          type="button"
          aria-label="Tutup ajakan ini"
          className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-bg-primary hover:text-text-secondary"
          onClick={dismiss}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-engagement="tg_subscribe_click"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        🔔 Pantau via Telegram
      </a>
    </aside>
  );
}
