"use client";

/**
 * RepeatVisitHint — nudge pasif non-blocking utk guest yang sering balik ke saham yang sama.
 * Owner 27 Okt: "kalau user suka check saham tertentu, kasih pop up tambahkan ke watchlist?"
 * → keputusan: BUKAN popup (annoying), tapi hint kecil sekali-muncul dekat bintang.
 *
 * Mekanisme: counter visit per ticker di localStorage (key teknikal_visits_<TICKER>).
 * Visit ke-3 saham yang sama → tampil label "Sering kembali ke BBCA? Simpan biar cepat" + bintang ⭐.
 * Hilang otomatis 8 detik / saat diklik / selamanya setelah diklik (flag dismissed).
 * Gayanya = micro-feedback pasif (👍/👎 verdict), bukan modal.
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { readGuestWatchlist } from "@/lib/guest-storage";

const VISITS_KEY = (ticker: string) => `teknikal_visits_${ticker}`;
const DISMISS_KEY = (ticker: string) => `teknikal_visits_dismissed_${ticker}`;
const TRIGGER_AT = 3; // kunjungan ke-3
const AUTO_HIDE_MS = 8000;

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string) {
  try { window.localStorage.setItem(key, val); } catch { /* private mode */ }
}

export function RepeatVisitHint({ ticker }: { ticker: string }) {
  const { status } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    // Sudah di watchlist → tidak perlu nudge
    try {
      if (readGuestWatchlist().includes(ticker)) return;
    } catch { /* storage bermasalah → diam */ }
    if (safeGet(DISMISS_KEY(ticker))) return;

    const raw = safeGet(VISITS_KEY(ticker));
    const n = Number(raw || "0") + 1;
    if (!Number.isFinite(n)) return;
    safeSet(VISITS_KEY(ticker), String(n));

    if (n === TRIGGER_AT) {
      setShow(true);
      const t = window.setTimeout(() => setShow(false), AUTO_HIDE_MS);
      return () => window.clearTimeout(t);
    }
  }, [ticker, status]);

  if (!show) return null;

  const handleStar = () => {
    safeSet(DISMISS_KEY(ticker), "1");
    setShow(false);
    // Klik label = fokus ke bintang StockActionBadge di sebelah (scrollIntoView + highlight ring)
    const btn = document.querySelector<HTMLElement>(
      'button[aria-label*="Pantau ' + ticker + '"]',
    );
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      btn.animate(
        [
          { boxShadow: "0 0 0 0 rgba(56,189,248,0)" },
          { boxShadow: "0 0 0 6px rgba(56,189,248,0.35)" },
          { boxShadow: "0 0 0 0 rgba(56,189,248,0)" },
        ],
        { duration: 1200, iterations: 2 },
      );
    }
  };

  return (
    <button
      onClick={handleStar}
      className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1.5 text-[11px] font-medium text-sky-700 transition-all cursor-pointer animate-[fadeIn_200ms_ease-out]"
      aria-label={`Sering kembali ke ${ticker}? Ketuk untuk lihat tombol simpan pantauan`}
    >
      <span aria-hidden="true">⭐</span>
      <span>
        Sering kembali ke {ticker}? Simpan biar cepat — ketuk bintang di samping
      </span>
      <span className="text-sky-400" aria-hidden="true">✕</span>
    </button>
  );
}
