"use client";

/**
 * StockPortfolioCta — CTA "Tambah ke Portofolio" di halaman saham (ux-2026-10-30-01).
 * Reuse AddHoldingForm + API portofolio existing (nol endpoint baru) dengan prefill
 * ticker = halaman saham tempat tombol diklik → user langsung isi harga/lot saja.
 * - Login: tombol buka form bottom-sheet (toast konfirmasi via ToastProvider lokal).
 * - Guest: varian register-adjacent (utm portfolio_cta) — jangan minta login paksa.
 * Pilar STICKY: loop nilai "catat punyaku → kembali cek untung/rugi".
 */
import { useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { AddHoldingForm } from "@/components/portfolio/add-holding-form";
import { ToastProvider } from "@/components/paper-trading/toast";

export function StockPortfolioCta({ ticker, isAuthed }: { ticker: string; isAuthed: boolean }) {
  const [open, setOpen] = useState(false);
  const bare = ticker.replace(/\.JK$/, "");

  if (!isAuthed) {
    const onGuestClick = () => {
      // pola save-screen-prompt: simpan intent, register → complete-profile memulangkan
      try {
        sessionStorage.setItem(
          "pending_post_register",
          JSON.stringify({ type: "portfolio_cta", ticker, next: `/stocks/${ticker}` }),
        );
      } catch {
        // storage blocked — tetap ke register
      }
    };
    return (
      <Link
        href="/auth/register?utm_source=stockpage&utm_medium=portfolio_cta"
        data-engagement="portfolio_cta_guest"
        onClick={onGuestClick}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-hover transition-colors"
      >
        <Briefcase className="h-4 w-4" aria-hidden />
        Catat di portofolio — gratis
      </Link>
    );
  }

  return (
    <ToastProvider>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-engagement="portfolio_cta_open"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-hover transition-colors"
      >
        <Briefcase className="h-4 w-4" aria-hidden />
        Tambah ke Portofolio
      </button>
      <AddHoldingForm open={open} onClose={() => setOpen(false)} prefillTicker={bare ? `${bare}.JK` : ticker} />
    </ToastProvider>
  );
}
