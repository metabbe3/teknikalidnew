"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { TradingStyle, TradingStyleDef, PresetDef, CustomFilter } from "./screener-types";
import { stylesForAssetClass, customFiltersForAssetClass } from "./screener-types";
import { PresetIcon } from "./screener-icons";

// ── Tab Navigation ──

export function ScreenerTabs({ activeStyle, onStyleChange, accentHex, assetClass }: { activeStyle: TradingStyle; onStyleChange: (s: TradingStyle) => void; accentHex: string; assetClass?: "EQUITY" | "CRYPTO" }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5" style={{ scrollbarWidth: "none" }}>
      {stylesForAssetClass(assetClass).map((style) => {
        const isActive = activeStyle === style.id;
        return (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.id)}
            className="screener-pill"
            data-active={isActive ? "true" : undefined}
            style={isActive ? { "--screener-accent": accentHex } as React.CSSProperties : undefined}
            role="tab"
            aria-selected={isActive}
          >
            {style.shortLabel ?? style.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Preset Card ──

export function PresetCard({
  preset,
  styleDef,
  isActive,
  onClick,
  sliderValues,
  onSliderChange,
}: {
  preset: PresetDef;
  styleDef: TradingStyleDef;
  isActive: boolean;
  onClick: () => void;
  sliderValues: Record<string, number>;
  onSliderChange: (key: string, param: string, value: number) => void;
}) {
  return (
    <div
      className="screener-preset-card cursor-pointer"
      data-active={isActive ? "true" : undefined}
      style={{ "--card-accent": styleDef.accentHex } as React.CSSProperties}
    >
      <button
        onClick={onClick}
        className={`w-full text-left p-4 cursor-pointer transition-colors ${isActive ? styleDef.accentBg : "hover:bg-bg-hover/50"}`}
        aria-pressed={isActive}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
            isActive
              ? `${styleDef.accentSolid} shadow-sm`
              : "bg-bg-hover"
          }`}>
            <PresetIcon type={preset.icon} className={`w-4.5 h-4.5 ${isActive ? styleDef.accentIcon : "text-text-tertiary"} transition-colors`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold leading-tight ${isActive ? styleDef.accent : "text-text-primary"}`}>{preset.label}</h3>
            <p className={`text-[11px] mt-0.5 font-mono ${isActive ? "text-text-secondary" : "text-text-tertiary"}`}>{preset.desc}</p>
          </div>
        </div>
      </button>

      {/* Tweak Sliders */}
      {isActive && preset.sliders && preset.sliders.length > 0 && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {preset.sliders.map((slider) => (
            <div key={slider.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-secondary">{slider.label}</span>
                <span className="text-xs font-mono font-semibold tabular-nums">{sliderValues[slider.key] ?? slider.default}</span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={1}
                value={sliderValues[slider.key] ?? slider.default}
                onChange={(e) => onSliderChange(slider.key, slider.param, Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-current"
                aria-label={slider.label}
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-text-tertiary">{slider.min}</span>
                <span className="text-[9px] text-text-tertiary">{slider.max}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom Filter Builder ──

export function CustomBuilder({
  onFilterChange,
  assetClass,
}: {
  onFilterChange: (params: Record<string, string>) => void;
  assetClass?: "EQUITY" | "CRYPTO";
}) {
  const [filters, setFilters] = useState<CustomFilter[]>(() => customFiltersForAssetClass(assetClass));
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const toggleFilter = (id: string) => {
    setFilters((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const updateParam = (filterId: string, paramKey: string, value: number | boolean) => {
    setFilters((prev) => prev.map((f) =>
      f.id === filterId ? { ...f, params: { ...f.params, [paramKey]: value } } : f
    ));
  };

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {};
    for (const f of filters) {
      if (!f.enabled) continue;
      for (const [k, v] of Object.entries(f.params)) {
        if (typeof v === "boolean") {
          params[k] = String(v);
        } else {
          const apiMap: Record<string, string> = {
            rsiMax: "rsi_max", rsiMin: "rsi_min",
            stochKMax: "stoch_k_max", stochKMin: "stoch_k_min",
            adxMin: "adx_min",
            signalScoreMin: "signal_score_min", signalScoreMax: "signal_score_max",
          };
          params[apiMap[k] ?? k] = String(v);
        }
      }
    }
    return params;
  }, [filters]);

  const enabledCount = filters.filter((f) => f.enabled).length;

  const prevParams = useMemo(() => JSON.stringify(buildParams()), [filters]);
  useEffect(() => {
    if (enabledCount > 0) {
      onFilterChange(buildParams());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevParams]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <span className="text-xs text-text-tertiary">{enabledCount} filter{enabledCount !== 1 ? "s" : ""} aktif</span>
      </div>
      <div className="space-y-5">
        {["Momentum", "Tren", "Volatilitas", "Kualitas"].map((groupName) => {
          const groupFilters = filters.filter((f) => f.group === groupName);
          if (groupFilters.length === 0) return null;
          return (
            <div key={groupName}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">{groupName}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupFilters.map((filter, i) => {
          // Auth gate: show login prompt for auth-required filters
          if (filter.authRequired && !isAuthenticated) {
            return (
              <div
                key={filter.id}
                className="screener-preset-card p-4 opacity-60"
                style={{ "--card-accent": "#64748b" } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">{filter.label}</span>
                  <svg className="w-4 h-4 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <Link
                  href="/auth/signin"
                  className="mt-3 block text-xs text-accent hover:underline"
                >
                  Daftar untuk filter lanjutan
                </Link>
              </div>
            );
          }

          return (
          <div
            key={filter.id}
            className="screener-preset-card p-4"
            data-active={filter.enabled ? "true" : undefined}
            style={{ "--card-accent": "#64748b" } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleFilter(filter.id)}
                className={`flex items-center gap-2 cursor-pointer min-h-11 ${filter.enabled ? "text-text-primary" : "text-text-secondary"}`}
                aria-pressed={filter.enabled}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  filter.enabled ? "bg-accent border-accent" : "border-border-light bg-bg-card"
                }`}>
                  {filter.enabled && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{filter.label}</span>
              </button>
            </div>

            {filter.enabled && filter.paramDefs.map((def) => (
              <div key={def.key} className="mt-3">
                {def.type === "range" ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-text-secondary">{def.label}</span>
                      <span className="text-[11px] font-mono font-semibold tabular-nums">{filter.params[def.key] as number}</span>
                    </div>
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step ?? 1}
                      value={filter.params[def.key] as number}
                      onChange={(e) => updateParam(filter.id, def.key, Number(e.target.value))}
                      className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer"
                      aria-label={def.label}
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-text-tertiary">{def.min}</span>
                      <span className="text-[9px] text-text-tertiary">{def.max}</span>
                    </div>
                  </>
                ) : (
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <span className="text-xs text-text-secondary">{def.label}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        );
        })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}