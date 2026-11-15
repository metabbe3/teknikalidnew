"use client";

/**
 * WatchlistPresets — preset kurasi 1-klik utk empty-state watchlist guest
 * (prd-2026-11-15-01 AC2). Data dari getWatchlistPresets() server-side
 * (passing via props page.tsx); klik = addMany batch localStorage + event
 * pantau_tambah batch label preset_<nama> — panel terisi TANPA reload
 * (CustomEvent GUEST_WATCHLIST_EVENT didengar hook guest).
 *
 * Guest-only: parent hanya merender utk pengunjung tanpa akun.
 */
import { useGuestWatchlist } from "@/hooks/use-guest-watchlist";
import { getAnonIdSafe } from "@/lib/anon-id-safe";
import { stripJk } from "@/lib/utils";
import type { WatchlistPreset } from "@/lib/watchlist-presets";

export function WatchlistPresets({ presets }: { presets: WatchlistPreset[] }) {
  const { addMany, enabled } = useGuestWatchlist();
  if (!enabled) return null;

  const handlePreset = (preset: WatchlistPreset) => {
    const result = addMany(preset.tickers);
    // event batch: satu beacon utk seluruh preset (label cap-64 kolom DB)
    if (result && result.addedCount > 0) {
      try {
        const body = JSON.stringify({
          anonId: getAnonIdSafe(),
          events: [
            {
              type: "cta_click",
              label: `preset_${preset.key}`.slice(0, 64),
              path: "/watchlist",
            },
          ],
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/public/engagement", new Blob([body], { type: "application/json" }));
        }
      } catch {
        /* silent — beacon tak boleh gagalkan simpanan */
      }
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Mulai dari kurasi — satu ketukan
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p)}
            disabled={p.tickers.length === 0}
            className="text-left bg-bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:depth-shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed press-scale min-h-11"
            aria-label={`Isi pantauan dengan ${p.label}: ${p.tickers.map(stripJk).join(", ")}`}
          >
            <span className="block text-sm font-semibold text-text-primary">{p.label}</span>
            <span className="block mt-1 text-xs text-text-secondary leading-snug">{p.description}</span>
            <span className="block mt-2 font-mono text-xs text-text-tertiary">
              {p.tickers.map(stripJk).join(" · ")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
