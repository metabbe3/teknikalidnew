"use client";

/**
 * TickerFab v2 (owner 26 Okt: nempel bawah + share multi-mode).
 * Bottom bar mobile-only — md:hidden, fixed bottom-0 tanpa gap (owner: "nempel ke bawah").
 * Share = bottom sheet 4 mode:
 *  1. Gambar — snapshot OG 1080×1920 (/api/og/stock-story, sudah ada) + teks summary via navigator.share files
 *  2. Link — halaman saham via navigator.share / fallback copy
 *  3. Teks — summary singkat kondisi ticker saat itu (harga, %, sinyal, skor)
 *  4. Story IG — buka snapshot 1080×1920 di tab baru (long-press simpan → add to story)
 * Filosofi warna: token teknikal.id semua — zero warna baru.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Search, Image as ImageIcon, Link2, Type, Camera, X } from "lucide-react";


const SHOW_AFTER_PX = 300;

interface Props {
  ticker: string;
  base: string;
  price: string | null;
  changePercent: number | null;
  signalLabel: string | null;
  signalScore: number | null;
}

export function TickerFab({ ticker, base, price, changePercent, signalLabel, signalScore }: Props) {
  const [shown, setShown] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const storyUrl = `https://teknikal.id/api/og/stock-story?ticker=${encodeURIComponent(base)}`;
  const pageUrl = `https://teknikal.id/stocks/${base}`;

  const chg = changePercent !== null ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "";
  const summaryText =
    `${base} ${price ?? ""} ${chg}`.trim() +
    (signalLabel ? ` · Sinyal ${signalLabel}` : "") +
    (signalScore !== null ? ` (skor ${signalScore}/100)` : "") +
    ` — chart & 9 indikator gratis di ${pageUrl}`;

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

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const shareImage = async () => {
    try {
      const res = await fetch(storyUrl);
      const blob = await res.blob();
      const file = new File([blob], `teknikal-${base}.png`, { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: summaryText });
        return;
      }
    } catch {
      /* fallthrough ke story tab */
    }
    setSheet(false);
    window.open(storyUrl, "_blank");
    flash("Gambar dibuka — long-press untuk simpan");
  };

  const shareLink = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${base} — teknikal.id`, text: summaryText, url: pageUrl });
        return;
      } catch {
        /* cancel → fallback copy */
      }
    }
    try {
      await navigator.clipboard.writeText(pageUrl);
      flash("Link tersalin ✓");
    } catch {
      flash("Salin manual: " + pageUrl);
    }
  };

  const shareText = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: summaryText });
        return;
      } catch {
        /* cancel → fallback copy */
      }
    }
    try {
      await navigator.clipboard.writeText(summaryText);
      flash("Teks tersalin ✓");
    } catch {
      /* diam */
    }
  };

  const items = [
    { icon: ImageIcon, label: "Gambar", desc: "Snapshot share-card", fn: shareImage },
    { icon: Link2, label: "Link", desc: "Halaman saham", fn: shareLink },
    { icon: Type, label: "Teks", desc: "Summary kondisi", fn: shareText },
    { icon: Camera, label: "Story IG", desc: "Buka gambar 1080×1920", fn: () => { window.open(storyUrl, "_blank"); } },
  ];

  return (
    <>
      <div
        aria-hidden={!shown}
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-card/95 backdrop-blur transition-transform duration-300 ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="grid grid-cols-2 gap-3 px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}>
          <button
            onClick={() => setSheet(true)}
            data-engagement="fab_share_click"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white border border-transparent depth-shadow text-sm font-medium transition-all press-scale shadow-sm shadow-accent/20"
          >
            <Share2 className="h-4 w-4" />
            Bagikan
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

      {toast && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-bg-primary border border-border text-xs text-text-primary depth-shadow">{toast}</span>
        </div>
      )}

      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSheet(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Bagikan saham"
        >
          <div
            className="w-full max-w-md bg-bg-card border border-border rounded-t-2xl depth-shadow p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-text-primary">Bagikan {base}</h3>
                <p className="text-xs text-text-tertiary">{[price, chg, signalLabel].filter(Boolean).join(" · ")}</p>
              </div>
              <button onClick={() => setSheet(false)} aria-label="Tutup" className="text-text-tertiary hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((it) => (
                <button
                  key={it.label}
                  onClick={it.fn}
                  data-engagement={`fab_share_${it.label.toLowerCase().replace(/\s/g, "_")}`}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-bg-primary border border-border hover:border-accent/50 text-left transition-colors press-scale"
                >
                  <it.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">{it.label}</span>
                    <span className="block text-[11px] text-text-tertiary">{it.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-text-tertiary">
              Gambar & story memakai snapshot teknikal.id — data tertunda ~5 mnt, bukan rekomendasi.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
