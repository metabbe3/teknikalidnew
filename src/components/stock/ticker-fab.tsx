"use client";

/**
 * TickerFab (owner 26 Okt: FAB mobile-only di halaman saham).
 * Bottom action bar — muncul setelah user scroll melewati hero+harga (~300px),
 * hilang di desktop (md:hidden). Dua aksi dari data perjalanan user 30d:
 * 1. Bagikan — navigator.share (WA dkk, OG image per-saham sudah ada) + fallback copy-link
 * 2. Cari Saham — akselerasi loop browsing ticker→daftar yang memang dominan
 * (Simulasi Beli TIDAK dimasukkan: 44 PV/30d — data bilang bukan ini yang dicari.)
 * Filosofi warna: token teknikal.id (bg-card/border/accent/press-scale) — zero warna baru.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Search, Check } from "lucide-react";
import { stripJk } from "@/lib/utils";

const SHOW_AFTER_PX = 300;

export function TickerFab({ ticker }: { ticker: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = stripJk(ticker);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShown(window.scrollY > SHOW_AFTER_PX));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onShare = async () => {
    const url = `https://teknikal.id/stocks/${ticker}`;
    const title = `${base} — harga & skor sinyal hari ini`;
    const text = `Cek ${base} di teknikal.id — skor sinyal teknikal harian, gratis`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user cancel / share gagal → fallback copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard diblokir — biarkan diam, bukan error fatal */
    }
  };

  return (
    <div
      aria-hidden={!shown}
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-card/95 backdrop-blur transition-transform duration-300 ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <button
          onClick={onShare}
          data-engagement="fab_share_click"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white border border-transparent depth-shadow text-sm font-medium transition-all press-scale shadow-sm shadow-accent/20"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Link tersalin
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Bagikan
            </>
          )}
        </button>
        <Link
          href="/stocks"
          data-engagement="fab_search_click"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-card border border-border hover:border-accent/40 depth-shadow text-sm font-medium text-text-primary transition-all press-scale"
        >
          <Search className="h-4 w-4 text-accent" />
          Cari Saham
        </Link>
      </div>
    </div>
  );
}
