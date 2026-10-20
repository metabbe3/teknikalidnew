"use client";

/**
 * OnboardingWizard v1.1 — checklist non-blocking 3 langkah, kini dengan
 * AUTO-DETEKSI aktivitas nyata (pola "receipts per demo": langkah tercentang
 * karena USER benar-benar melakukannya, bukan hanya klik manual di kartu).
 *
 * Sinyal (dari storage existing, nol API baru):
 * - search: event global 'tek:search-focus' dari SearchBar
 * - score : mengunjungi halaman saham (stockVisits > 0 di teknikal:visitor)
 * - star  : guest watchlist terisi (guest_watchlist ≥ 1 ticker)
 *
 * Auto-dismiss saat 3/3 + persist. User lama (>3 pageviews) tetap di-skip.
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const WIZARD_KEY = "teknikal:wizard_done";

interface Done {
  search: boolean;
  score: boolean;
  star: boolean;
}

function readSignals(): Partial<Done> {
  const out: Partial<Done> = {};
  try {
    const v = JSON.parse(localStorage.getItem("teknikal:visitor") ?? "{}") as {
      totalPageViews?: number;
      stockVisits?: Record<string, number>;
    };
    if (Object.keys(v.stockVisits ?? {}).length > 0) out.score = true;
    const wl = JSON.parse(localStorage.getItem("guest_watchlist") ?? "[]") as unknown;
    if (Array.isArray(wl) && wl.length > 0) out.star = true;
  } catch {
    // ignore
  }
  return out;
}

export function OnboardingWizard() {
  const { status } = useSession();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState<Done>({ search: false, score: false, star: false });

  // Init: gate user baru + isi sinyal yang sudah terjadi sebelumnya
  useEffect(() => {
    try {
      if (localStorage.getItem(WIZARD_KEY)) return; // sekali seumur device
    } catch {
      return;
    }
    try {
      const raw = localStorage.getItem("teknikal:visitor");
      if (raw) {
        const v = JSON.parse(raw) as { totalPageViews?: number };
        if ((v.totalPageViews ?? 0) > 3) return; // bukan user baru — skip
      }
    } catch {
      // ignore
    }
    setDone((d) => ({ ...d, ...readSignals() }));
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Live signals: search focus + perubahan storage (score/star)
  useEffect(() => {
    if (!show) return;
    const onSearch = () => setDone((d) => (d.search ? d : { ...d, search: true }));
    window.addEventListener("tek:search-focus", onSearch);

    const onStorage = () => setDone((d) => ({ ...d, ...readSignals() }));
    window.addEventListener("teknikal:guest-watchlist-updated", onStorage);
    window.addEventListener("tek:visitor-updated", onStorage);
    const poll = setInterval(onStorage, 4000); // stockVisits di-hook lain tanpa event
    return () => {
      window.removeEventListener("tek:search-focus", onSearch);
      window.removeEventListener("teknikal:guest-watchlist-updated", onStorage);
      window.removeEventListener("tek:visitor-updated", onStorage);
      clearInterval(poll);
    };
  }, [show]);

  // 3/3 → auto-dismiss + persist (selesai natural, bukan di-skip)
  useEffect(() => {
    if (done.search && done.score && done.star) {
      try {
        localStorage.setItem(WIZARD_KEY, "1");
      } catch {
        // ignore
      }
      setDismissed(true);
    }
  }, [done]);

  const finish = () => {
    setDismissed(true);
    try {
      localStorage.setItem(WIZARD_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (status === "authenticated" || status === "loading" || dismissed) return null;

  const steps: { key: keyof Done; label: string; icon: string }[] = [
    { key: "search", label: "Cari saham apa pun di kolom pencarian", icon: "🔍" },
    { key: "score", label: "Lihat Skor Sinyal — 12 indikator dalam satu angka", icon: "📊" },
    { key: "star", label: "Tandai ⭐ saham favorit untuk disimpan", icon: "⭐" },
  ];
  const completed = steps.filter((s) => done[s.key]).length;

  return (
    <div
      className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 w-[300px] rounded-xl border border-border bg-card p-4 depth-shadow transition-all duration-500 ${
        show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
      role="region"
      aria-label="Panduan singkat"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {completed === 3 ? "Semua beres 🎉" : "Mulai dalam 3 langkah 👋"}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">Sekitar 30 detik</p>
        </div>
        <button
          onClick={finish}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
          aria-label="Tutup panduan"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.key}>
            <button
              onClick={() => setDone((d) => (d[s.key] ? d : { ...d, [s.key]: true }))}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                done[s.key] ? "text-text-tertiary line-through" : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done[s.key] ? "bg-bullish/15 text-bullish" : "border border-border text-text-tertiary"
                }`}
              >
                {done[s.key] ? "✓" : ""}
              </span>
              <span aria-hidden>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(completed / 3) * 100}%` }} />
        </div>
        <span className="text-[10px] tabular-nums font-medium text-text-tertiary">{completed}/3</span>
      </div>
    </div>
  );
}
