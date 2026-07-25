"use client";

import { useState } from "react";
import {
  useSavedScreeners,
  useSaveScreener,
  useDeleteScreener,
  type SavedScreenerItem,
} from "@/hooks/use-saved-screeners";
import {
  useScreenerAlerts,
  useCreateAlert,
  useToggleAlert,
} from "@/hooks/use-screener-alerts";

interface SavedScreenerBarProps {
  currentFilters: Record<string, string>;
  onLoadScreener: (filters: Record<string, string>) => void;
  tradingStyle?: string;
}

export function SavedScreenerBar({
  currentFilters,
  onLoadScreener,
  tradingStyle,
}: SavedScreenerBarProps) {
  const { data: screeners = [], isLoading } = useSavedScreeners();
  const saveMutation = useSaveScreener();
  const deleteMutation = useDeleteScreener();
  const { data: alerts = [] } = useScreenerAlerts();
  const createAlert = useCreateAlert();
  const toggleAlert = useToggleAlert();

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Build a map of screenerId -> alert for quick lookup
  const alertMap = new Map(alerts.map((a) => [a.savedScreenerId, a]));

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    saveMutation.mutate(
      { name, filters: currentFilters, tradingStyle },
      {
        onSuccess: () => {
          setSaveName("");
          setShowSaveForm(false);
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const handleToggleBell = (screenerId: string) => {
    const existing = alertMap.get(screenerId);
    if (existing) {
      toggleAlert.mutate({ id: existing.id, isEnabled: !existing.isEnabled });
    } else {
      createAlert.mutate({ savedScreenerId: screenerId });
    }
  };

  const hasFilters = Object.keys(currentFilters).length > 0;

  // Empty state when no saved screeners
  if (!isLoading && screeners.length === 0 && !showSaveForm) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-bg-card/50">
        <div className="flex items-center gap-2 text-text-tertiary text-xs">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Simpan filter untuk akses cepat</span>
        </div>
        {hasFilters && (
          <button
            onClick={() => setShowSaveForm(true)}
            className="text-xs font-medium text-accent hover:underline cursor-pointer whitespace-nowrap"
          >
            + Simpan
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Screener chips */}
      {(screeners.length > 0 || isLoading) && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5" style={{ scrollbarWidth: "none" }}>
          {isLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 bg-bg-hover rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            screeners.map((screener: SavedScreenerItem) => {
              const alert = alertMap.get(screener.id);
              const bellActive = alert?.isEnabled ?? false;

              return (
                <div
                  key={screener.id}
                  className="group relative flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg border border-border bg-bg-card hover:bg-bg-hover transition-colors cursor-pointer whitespace-nowrap text-sm"
                  onClick={() => {
                    const filters = (typeof screener.filters === "object" && screener.filters !== null)
                      ? screener.filters as Record<string, string>
                      : {};
                    onLoadScreener(filters);
                  }}
                >
                  <span className="text-text-primary font-medium text-xs">
                    {screener.name}
                  </span>

                  {/* Result count badge */}
                  {screener.lastResultCount !== null && screener.lastResultCount !== undefined && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-mono font-semibold rounded-full bg-accent/10 text-accent">
                      {screener.lastResultCount}
                    </span>
                  )}

                  {/* Bell icon — toggle alert */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBell(screener.id);
                    }}
                    className={`p-0.5 rounded transition-colors cursor-pointer ${
                      bellActive
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-text-tertiary/70 hover:text-text-tertiary"
                    }`}
                    aria-label={bellActive ? "Nonaktifkan notifikasi" : "Aktifkan notifikasi"}
                    title={bellActive ? "Notifikasi aktif — klik untuk menonaktifkan" : "Aktifkan notifikasi harian"}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill={bellActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </button>

                  {/* Delete button */}
                  {deleteConfirmId === screener.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(screener.id);
                      }}
                      className="flex items-center justify-center w-5 h-5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer"
                      aria-label="Confirm delete"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(screener.id);
                        setTimeout(() => setDeleteConfirmId(null), 3000);
                      }}
                      className="flex items-center justify-center w-5 h-5 rounded text-text-tertiary/0 group-hover:text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      aria-label={`Delete ${screener.name}`}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Save button */}
          {hasFilters && !showSaveForm && (
            <button
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border text-text-tertiary hover:text-accent hover:border-accent/30 transition-colors cursor-pointer text-xs whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Simpan
            </button>
          )}
        </div>
      )}

      {/* Inline save form */}
      {showSaveForm && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setShowSaveForm(false); setSaveName(""); }
            }}
            placeholder="Nama screener..."
            maxLength={100}
            className="flex-1 max-w-[200px] px-3 py-1.5 text-xs rounded-lg border border-border bg-bg-card text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/30"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim() || saveMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? "..." : "Simpan"}
          </button>
          <button
            onClick={() => { setShowSaveForm(false); setSaveName(""); }}
            className="px-2 py-1.5 text-xs text-text-tertiary hover:text-text-secondary cursor-pointer"
          >
            Batal
          </button>
          {saveMutation.error && (
            <span className="text-xs text-red-500">{saveMutation.error.message}</span>
          )}
        </div>
      )}
    </div>
  );
}
