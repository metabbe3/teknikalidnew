"use client";

/**
 * GuestOverlimitBanner — v2 (prd-2026-11-16-01 FASE-A, plan 2026-11-17):
 * Wall kuota freemium dengan framing VALUE-FIRST (at-the-blocked-action):
 * - Progress "X dari 3 saham gratis hari ini sudah dibuka" (bukan framing
 *   hukuman "telah digunakan/habis").
 * - 1 baris preview spesifik ticker yang digate (nama + konteks sinyal,
 *   tanpa membuka angka premium).
 * - DUAL-CTA SETARA berdampingan: "Daftar gratis" (solid) + "Tanya Bot Agent"
 *   (outline) — jalur tanpa-akun kini sekelas tombol, bukan baris kecil.
 *
 * Instrumentasi cta_click (label TIDAK berubah — baseline comparability):
 * - CTA daftar : `reg_free_banner`
 * - CTA bot    : `agent_deeplink_banner` (deeplink kanonik src_gate_{ticker})
 *
 * Rules:
 * - Tanpa harga/paket; tanpa emoji (ikon = lucide svg, pola ux-2026-11-16-02).
 * - WhatsApp dilarang, semua bot CTA ke @TeknikalidAgentBot.
 * - FASE-B (?next= return-to-context) = defer sampai ACK owner area auth.
 */

import { useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  normalizeTicker,
  isGuestStockGated,
  readGuestStocksQuota,
  MAX_FREE_GUEST_STOCKS,
} from "@/lib/guest-quota";
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

  const snapshot = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (forceShow) return "show";
      if (status === "authenticated" || status === "loading") return "hide";
      const isGatedV1 = ticker ? isGuestStockGated(ticker) : false;
      const isOldMeterOver = readGuestQuota().count > 5;
      return isGatedV1 || isOldMeterOver ? "show" : "hide";
    },
    () => (forceShow ? "show" : "hide")
  );

  const openedCount = useSyncExternalStore(
    emptySubscribe,
    () => readGuestStocksQuota().tickers.length,
    () => 0
  );

  // Logged in atau belum overlimit -> jangan tampilkan banner
  if (status === "authenticated" || snapshot !== "show") return null;

  const cleanTicker = ticker ? normalizeTicker(ticker) : "";
  const botHref = `https://t.me/TeknikalidAgentBot?start=src_gate_${cleanTicker}`;
  // Kuota terpakai di-cap display 3 (mode old-meter legacy > 5 tetap terbaca penuh)
  const used = Math.min(openedCount, MAX_FREE_GUEST_STOCKS);

  return (
    <div
      className={`rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 depth-shadow ${className}`}
      data-testid="guest-overlimit-banner"
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {used} dari {MAX_FREE_GUEST_STOCKS} saham gratis hari ini sudah dibuka
          </p>
          <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">
            {cleanTicker
              ? `Analisa penuh ${cleanTicker} — rencana trading, batas cut loss, dan rincian skor sinyal — sudah menunggu di akun gratis.`
              : "Rencana trading, batas cut loss, dan rincian skor sinyal penuh sudah menunggu di akun gratis."}
          </p>
        </div>

        {/* Dual-CTA setara: daftar (solid) + bot agent (outline) berdampingan */}
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <Link
            href="/auth/register"
            data-engagement="reg_free_banner"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-accent/90 transition-colors press-scale text-center"
          >
            Daftar gratis — buka {cleanTicker || "skor penuh"} sekarang
          </Link>
          <a
            href={botHref}
            target="_blank"
            rel="noopener noreferrer"
            data-engagement="agent_deeplink_banner"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/5 px-5 py-2 text-sm font-semibold text-accent hover:bg-accent/15 hover:border-accent/70 transition-colors press-scale"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Tanya Bot Agent tentang {cleanTicker || "saham ini"}
          </a>
        </div>

        <p className="text-[11px] text-text-tertiary">
          Akun gratis membuka semua saham tanpa batas harian. Tanpa kartu kredit.
        </p>
      </div>
    </div>
  );
}
