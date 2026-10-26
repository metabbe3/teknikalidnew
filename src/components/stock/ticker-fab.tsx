"use client";

/**
 * TickerFab v3 (owner 26 Okt sore: modal full-bawah + search in-page + merge gambar/story).
 * - Bottom bar mobile-only nempel viewport (inline margin/padding 0 — kalahkan rule margin eksternal).
 * - Bagikan → bottom sheet FULL sampai bawah (margin-bottom 0 inline), 3 mode:
 *   1. Gambar / Story — snapshot OG 1080×1920 (/api/og/stock-story): share image+teks via
 *      navigator.share files (pilih IG Story / WA di share sheet OS); fallback buka tab baru utk
 *      long-press simpan (owner: "gambar dan story IG sama saja" — digabung satu tombol).
 *   2. Link — halaman saham
 *   3. Teks — summary kondisi ticker saat itu (harga, %, sinyal, skor)
 * - Cari Saham → modal search IN-PAGE (reuse logika HeroSearch: /api/stocks, filter, keyboard nav)
 *   — frictionless, tidak pindah halaman.
 * Filosofi warna: token teknikal.id semua — zero warna baru.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Search, Image as ImageIcon, Link2, Type, X } from "lucide-react";
import { StockLogo } from "@/components/stock/stock-logo";
import type { StockRow } from "@/components/stock/stock-table";

const SHOW_AFTER_PX = 300;
const MIN_CHARS = 1;
const MAX_RESULTS = 8;

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
  const [search, setSearch] = useState(false);
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
      /* fallthrough */
    }
    setSheet(false);
    window.open(storyUrl, "_blank");
    flash("Gambar dibuka — long-press simpan / Add to Story");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${base} — teknikal.id`, text: summaryText, url: pageUrl });
        return;
      } catch {
        /* cancel */
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
    if (navigator.share) {
      try {
        await navigator.share({ text: summaryText });
        return;
      } catch {
        /* cancel */
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
    { icon: ImageIcon, label: "Gambar / Story", desc: "Snapshot 1080×1920 — share ke WA atau IG Story", fn: shareImage },
    { icon: Link2, label: "Link", desc: "Halaman saham", fn: shareLink },
    { icon: Type, label: "Teks", desc: "Summary kondisi ticker", fn: shareText },
  ];

  return (
    <>
      <div
        aria-hidden={!shown}
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-card/95 backdrop-blur transition-transform duration-300 ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "0px", marginBottom: "0px" }}
      >
        <div className="grid grid-cols-2 gap-3 px-4 pt-3" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <button
            onClick={() => setSheet(true)}
            data-engagement="fab_share_click"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white border border-transparent depth-shadow text-sm font-medium transition-all press-scale shadow-sm shadow-accent/20"
          >
            <Share2 className="h-4 w-4" />
            Bagikan
          </button>
          <button
            onClick={() => setSearch(true)}
            data-engagement="fab_search_click"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-card border border-border hover:border-accent/40 depth-shadow text-sm font-medium text-text-primary transition-all press-scale"
          >
            <Search className="h-4 w-4 text-accent" />
            Cari Saham
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-bg-primary border border-border text-xs text-text-primary depth-shadow">{toast}</span>
        </div>
      )}

      {/* ── Share sheet — full sampai bawah ── */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSheet(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Bagikan saham"
        >
          <div
            className="w-full max-w-md bg-bg-card border border-border rounded-t-2xl depth-shadow px-5 pt-5"
            style={{ marginBottom: "0px", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
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
            <div className="grid grid-cols-1 gap-3">
              {items.map((it) => (
                <button
                  key={it.label}
                  onClick={it.fn}
                  data-engagement={`fab_share_${it.label.toLowerCase().replace(/[^a-z]/g, "")}`}
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
              Snapshot teknikal.id — data tertunda ~5 mnt, bukan rekomendasi.
            </p>
          </div>
        </div>
      )}

      {/* ── Search modal — in-page, frictionless ── */}
      {search && <TickerSearchModal onClose={() => setSearch(false)} currentTicker={ticker} />}
    </>
  );
}

/** Modal cari saham — reuse logika HeroSearch (/api/stocks + filter + keyboard nav). */
function TickerSearchModal({ onClose, currentTicker }: { onClose: () => void; currentTicker: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [all, setAll] = useState<StockRow[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stocks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: StockRow[]) => {
        if (!cancelled) setAll(rows);
      })
      .catch(() => {
        /* silent — search tak tersedia */
      });
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toUpperCase();
    if (!all || needle.length < MIN_CHARS) return [];
    const starts: StockRow[] = [];
    const contains: StockRow[] = [];
    for (const s of all) {
      if (s.ticker === currentTicker) continue;
      const t = s.ticker.replace(".JK", "");
      if (t.startsWith(needle)) starts.push(s);
      else if (s.name.toUpperCase().includes(needle)) contains.push(s);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [q, all, currentTicker]);

  const go = (ticker: string) => {
    onClose();
    router.push(`/stocks/${ticker}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].ticker);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cari saham lain"
    >
      <div
        className="w-full max-w-md bg-bg-card border border-border rounded-t-2xl depth-shadow px-5 pt-5"
        style={{ marginBottom: "0px", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary">Cari saham lain</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-xl px-4 py-3 mb-3 focus-within:border-accent/50">
          <Search className="h-5 w-5 text-text-tertiary shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Ketik ticker atau nama… (mis. BBRI, bank)"
            aria-label="Cari saham"
            className="w-full bg-transparent text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
            autoComplete="off"
            enterKeyHint="go"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-text-tertiary hover:text-text-primary text-sm" aria-label="Hapus">
              ✕
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {q.trim().length >= MIN_CHARS && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-tertiary text-center">
              {all === null ? "Memuat daftar saham…" : `Tidak ada hasil untuk "${q}"`}
            </p>
          )}
          {results.map((s, i) => (
            <button
              key={s.ticker}
              onClick={() => go(s.ticker)}
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors ${
                i === active ? "bg-accent/10" : "hover:bg-bg-hover"
              }`}
            >
              <span className="min-w-0 flex items-center gap-2.5">
                <StockLogo name={s.name} ticker={s.ticker} size={24} />
                <span className="min-w-0">
                  <span className="font-mono font-semibold text-sm text-text-primary">{s.ticker.replace(".JK", "")}</span>
                  <span className="ml-2 text-xs text-text-secondary truncate">{s.name}</span>
                </span>
              </span>
              {s.changePercent !== null && (
                <span className={`font-mono text-xs font-medium tabular-nums shrink-0 ${s.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                  {s.changePercent >= 0 ? "+" : "−"}
                  {Math.abs(s.changePercent).toFixed(2)}%
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-text-tertiary">↑↓ navigasi · Enter buka · Esc tutup</p>
      </div>
    </div>
  );
}
