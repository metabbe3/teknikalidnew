"use client";

/**
 * SavedScreensPanel — "Simpananku": daftar preset screener guest dari localStorage.
 * Retention Loop v1 — PRD idea-2026-10-09-1 AC2. Render client-only (useEffect gate) — SSR-safe.
 */
import { useSavedScreens } from "@/hooks/use-saved-screens";

export function SavedScreensPanel() {
  const { screens, remove, mounted } = useSavedScreens();

  if (!mounted || screens.length === 0) return null;

  return (
    <div className="px-4 py-3 rounded-xl border border-border bg-bg-card/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary">Simpananku ({screens.length})</p>
        <p className="text-[10px] text-text-tertiary">tersimpan di perangkat ini</p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {screens.map((s) => (
          <li key={s.key + s.createdAt} className="group relative">
            <a
              href={`/stocks?${s.queryString}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
            >
              {s.label}
            </a>
            <button
              onClick={() => remove(s.queryString)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-card border border-border text-text-tertiary hover:text-bearish hover:border-bearish/40 transition-colors cursor-pointer flex items-center justify-center text-[10px] leading-none"
              aria-label={`Hapus preset ${s.label}`}
              title="Hapus dari Simpananku"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
