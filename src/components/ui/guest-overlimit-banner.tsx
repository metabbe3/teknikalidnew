"use client";

/**
 * GuestOverlimitBanner (W1b, plan 2026-11-07):
 * Banner dua lapis saat kuota freemium 3 saham habis:
 * - Lapis 1 (utama, tombol solid): "Daftar gratis — simpan watchlist & skor penuh" -> /auth/register
 * - Lapis 2 (baris kecil di bawah): "atau tanya apa saja ke Bot Agent →" -> deeplink Telegram
 *
 * Instrumentasi cta_click:
 * - Lapis 1: `reg_free_banner`
 * - Lapis 2: `agent_deeplink_banner`
 *
 * Rules:
 * - Tanpa harga/paket (cukup "tanya apa saja, gratis mulai").
 * - WhatsApp dilarang, semua bot CTA ke @TeknikalidAgentBot.
 */

import { useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { normalizeTicker, isGuestStockGated } from "@/lib/guest-quota";
import { readGuestQuota } from "./guest-quota-meter";

const emptySubscribe = () => () => {};

export function GuestOverlimitBanner({
  ticker,
  forceShow = false,
  className = "",
}: {
  ticker?: string;
  forceShow?: boolean;
  className?: string;
}) {
  const { status } = useSession();

  const isOver = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (forceShow) return true;
      if (status === "authenticated" || status === "loading") return false;
      const isGatedV1 = ticker ? isGuestStockGated(ticker) : false;
      const isOldMeterOver = readGuestQuota().count > 5;
      return isGatedV1 || isOldMeterOver;
    },
    () => forceShow
  );

  // Logged in atau belum overlimit -> jangan tampilkan banner
  if (status === "authenticated" || !isOver) return null;

  const cleanTicker = ticker ? normalizeTicker(ticker) : "";
  const botHref = cleanTicker
    ? `https://t.me/TeknikalidAgentBot?start=src_stock_${cleanTicker}`
    : "https://t.me/TeknikalidAgentBot?start=src_stock";

  return (
    <div
      className={`rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 depth-shadow ${className}`}
      data-testid="guest-overlimit-banner"
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Kuota 3 saham gratis hari ini telah digunakan
          </p>
          <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">
            {cleanTicker
              ? `Buka rencana trading, batas cut loss, dan rincian skor sinyal penuh ${cleanTicker}.`
              : "Buka rencana trading, batas cut loss, dan rincian skor sinyal penuh."}
          </p>
        </div>

        {/* Lapis 1 (utama, tombol solid) */}
        <div>
          <Link
            href="/auth/register"
            data-engagement="reg_free_banner"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90 transition-colors press-scale text-center"
          >
            Daftar gratis — simpan watchlist &amp; skor penuh
          </Link>
        </div>

        {/* Lapis 2 (baris kecil di bawah) */}
        <div className="pt-0.5">
          <a
            href={botHref}
            target="_blank"
            rel="noopener noreferrer"
            data-engagement="agent_deeplink_banner"
            className="text-xs text-text-secondary hover:text-accent transition-colors inline-flex items-center gap-1 font-medium"
          >
            atau tanya apa saja ke Bot Agent →
          </a>
        </div>
      </div>
    </div>
  );
}
