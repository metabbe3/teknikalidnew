"use client";

/**
 * GuestStar — toggle bintang watchlist untuk guest (localStorage), PRD idea-2026-10-09-1 AC3.
 * Dipakai di stock-action-badge (halaman detail) & screener-results (list).
 * SSR-safe: state aktif hanya dirender pasca-mount.
 */
import { useEffect, useState } from "react";
import { useGuestWatchlist } from "@/hooks/use-guest-watchlist";

export function GuestStar({ ticker, compact = false }: { ticker: string; compact?: boolean }) {
  const { tickers, toggle, mounted } = useGuestWatchlist();
  const [justToggled, setJustToggled] = useState(false);

  useEffect(() => {
    setJustToggled(false);
  }, [ticker]);

  if (!mounted) {
    return compact ? (
      <span className="inline-flex w-8 h-8 items-center justify-center opacity-30" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </span>
    ) : null;
  }

  const active = tickers.includes(ticker);

  const handleClick = () => {
    const result = toggle(ticker);
    if (result) setJustToggled(true);
  };

  return (
    <button
      onClick={handleClick}
      className={compact ? "p-1.5 rounded-md transition-colors cursor-pointer" : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 min-h-11 sm:min-h-0 text-xs font-medium transition-all press-scale cursor-pointer"}
      aria-pressed={active}
      aria-label={active ? `Hapus ${ticker} dari pantauan` : `Pantau ${ticker} (disimpan di perangkat)`}
      title={active ? "Ada di pantauan perangkat ini" : "Simpan ke pantauan di perangkat ini (tanpa akun)"}
    >
      {active ? (
        <svg width={compact ? 16 : 14} height={compact ? 16 : 14} viewBox="0 0 24 24" fill="currentColor" className="text-accent" aria-hidden="true">
          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg width={compact ? 16 : 14} height={compact ? 16 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      )}
      {!compact && (active ? "Dipantau" : "Pantau")}
      {!compact && justToggled && !active && (
        <span className="text-[10px] text-text-tertiary">(tersimpan di perangkat)</span>
      )}
    </button>
  );
}
