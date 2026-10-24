"use client";

/**
 * TickerFunnelActions (owner 24 Okt: "Lakukan semua sekarang" — funnel ticker →
 * compare + paper-trading). Dua tombol aksi cepat di halaman saham:
 * 1. Bandingkan — modal pilih pembanding (dari watchlist-likuid top 30) → /compare?s=A&s=B
 * 2. Simulasi Beli — /paper-trading?ticker=X (fitur sudah prefill ticker)
 */

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, Rocket, X, ArrowRight } from "lucide-react";
import { stripJk } from "@/lib/utils";

/** Likuid + dikenal — daftar pembanding yang wajar utk mayoritas saham. */
const LIQUID_POOL = [
  "BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK", "TLKM.JK", "ASII.JK",
  "GOTO.JK", "BUMI.JK", "ADRO.JK", "PTBA.JK", "UNVR.JK", "ICBP.JK",
  "AMMN.JK", "MDKA.JK", "ANTM.JK", "INCO.JK", "KLBF.JK", "SIDO.JK",
  "JPFA.JK", "CPIN.JK", "EXCL.JK", "ISAT.JK", "PGAS.JK", "JSMR.JK",
  "WIKA.JK", "WSKT.JK", "ERAA.JK", "MAPI.JK", "MIKA.JK", "SILO.JK",
];

export function TickerFunnelActions({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const base = stripJk(ticker);

  const pool = useMemo(
    () => LIQUID_POOL.filter((t) => t !== ticker).map(stripJk),
    [ticker]
  );
  const filtered = useMemo(
    () => (q ? pool.filter((t) => t.toLowerCase().includes(q.toLowerCase())) : pool).slice(0, 12),
    [q, pool]
  );

  const goCompare = (other: string) => {
    setOpen(false);
    setQ("");
    router.push(`/compare?s=${encodeURIComponent(ticker)}&s=${encodeURIComponent(other)}.JK&range=6mo`);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOpen(true)}
          data-engagement="funnel_compare_open"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-card border border-border hover:border-accent/40 depth-shadow text-sm font-medium text-text-primary transition-all press-scale"
        >
          <Scale className="h-4 w-4 text-accent" />
          Bandingkan
        </button>
        <Link
          href={`/paper-trading?ticker=${encodeURIComponent(base)}`}
          data-engagement="funnel_paper_click"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/[0.08] border border-accent/25 hover:border-accent/50 text-sm font-medium text-accent transition-all press-scale"
        >
          <Rocket className="h-4 w-4" />
          Simulasi Beli
        </Link>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Bandingkan saham"
        >
          <div
            className="w-full max-w-md bg-bg-card border border-border rounded-2xl depth-shadow p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-text-primary">
                Bandingkan {base} dengan…
              </h3>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="text-text-tertiary hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-text-tertiary mb-4">Pilih saham pembanding — grafik performa berdampingan.</p>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value.toUpperCase())}
              placeholder="Cari ticker… (mis. BBRI)"
              className="w-full mb-3 px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/60"
            />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {filtered.map((t) => (
                <button
                  key={t}
                  onClick={() => goCompare(t)}
                  data-engagement="funnel_compare_pick"
                  className="px-2 py-2.5 rounded-lg bg-bg-primary border border-border hover:border-accent/50 hover:bg-accent/[0.06] font-mono text-sm font-semibold text-text-secondary hover:text-accent transition-colors"
                >
                  {t}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-3 text-xs text-text-tertiary text-center py-4">
                  Tidak ada — coba ticker lain dari daftar likuid.
                </p>
              )}
            </div>
            <p className="mt-3 text-[10px] text-text-tertiary">
              {base} otomatis jadi pembanding pertama.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
