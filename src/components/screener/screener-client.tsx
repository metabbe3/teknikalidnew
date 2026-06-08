"use client";

import { useState, useCallback, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { BottomFishingRadar } from "@/components/stock/bottom-fishing-radar";
import { formatPrice, formatPercent, formatVolume, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

// ── Trading Style Definitions ──

type TradingStyle = "bottom-fishing" | "swing-trade" | "momentum" | "long-term" | "custom";

interface PresetDef {
  key: string;
  label: string;
  desc: string;
  icon: "radar" | "rsi" | "stoch" | "bb" | "vol" | "macd" | "cross" | "trend" | "super" | "obv" | "hype" | "adx" | "ema" | "fund" | "sliders";
  params?: Record<string, string>;
  sliders?: { key: string; label: string; min: number; max: number; default: number; param: string }[];
}

interface TradingStyleDef {
  id: TradingStyle;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentSolid: string;
  accentIcon: string;
  accentLeftBorder: string;
  accentRgb: string;
  accentHex: string;
  presets: PresetDef[];
}

const STYLES: TradingStyleDef[] = [
  {
    id: "bottom-fishing",
    label: "Bottom Fishing",
    shortLabel: "Bottom",
    description: "Temukan saham oversold dengan potensi reversal",
    accent: "text-blue-600",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentSolid: "bg-blue-500",
    accentIcon: "text-white",
    accentLeftBorder: "border-l-blue-500",
    accentRgb: "59, 130, 246",
    accentHex: "#3b82f6",
    presets: [
      { key: "radar", label: "Radar Pantulan", desc: "Smart scan: RSI + Stochastic + Volume Spike", icon: "radar" },
      { key: "rsi_oversold", label: "RSI Oversold", desc: "RSI(14) < 30", icon: "rsi", sliders: [
        { key: "rsiMax", label: "RSI Maks", min: 15, max: 45, default: 30, param: "rsi_max" },
      ]},
      { key: "stoch_oversold", label: "Stochastic Oversold", desc: "%K & %D < 20", icon: "stoch" },
      { key: "bb_lower_touch", label: "Bollinger Lower Touch", desc: "Harga menyentuh lower band", icon: "bb" },
      { key: "volume_spike_low", label: "Volume Spike + Turun", desc: "Volume tinggi saat harga turun", icon: "vol" },
    ],
  },
  {
    id: "swing-trade",
    label: "Swing Trade",
    shortLabel: "Swing",
    description: "Sinyal untuk hold 1-2 minggu",
    accent: "text-emerald-600",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200",
    accentSolid: "bg-emerald-500",
    accentIcon: "text-white",
    accentLeftBorder: "border-l-emerald-500",
    accentRgb: "16, 185, 129",
    accentHex: "#10b981",
    presets: [
      { key: "macd_bullish", label: "MACD Bullish", desc: "Histogram MACD > 0", icon: "macd" },
      { key: "golden_cross", label: "Golden Cross", desc: "SMA 20 cross above SMA 50", icon: "cross" },
      { key: "supertrend_bullish", label: "Supertrend Bullish", desc: "Harga di atas Supertrend", icon: "super" },
      { key: "obv_accumulation", label: "OBV Accumulation", desc: "Volume beli dominan", icon: "obv" },
      { key: "pullback_sma20", label: "Pullback ke SMA 20", desc: "Harga dekat SMA 20 dalam uptrend", icon: "trend" },
    ],
  },
  {
    id: "momentum",
    label: "Momentum",
    shortLabel: "Momentum",
    description: "Saham dengan momentum kuat",
    accent: "text-amber-600",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    accentSolid: "bg-amber-500",
    accentIcon: "text-white",
    accentLeftBorder: "border-l-amber-500",
    accentRgb: "245, 158, 11",
    accentHex: "#f59e0b",
    presets: [
      { key: "rsi_overbought", label: "RSI Overbought", desc: "RSI(14) > 70 — momentum kuat", icon: "rsi" },
      { key: "hype_alert", label: "Hype Alert", desc: "Volume 2x + kenaikan > 5%", icon: "hype" },
      { key: "adx_trending", label: "ADX Trending Strong", desc: "ADX > 25 — tren kuat", icon: "adx" },
      { key: "stoch_overbought_breakout", label: "Stoch Breakout", desc: "Stochastic overbought + ADX kuat", icon: "stoch" },
      { key: "ema_cross", label: "EMA Crossover", desc: "EMA 12/26 bullish crossover", icon: "ema" },
    ],
  },
  {
    id: "long-term",
    label: "Long-Term",
    shortLabel: "Long",
    description: "Fundamental + teknikal untuk jangka panjang",
    accent: "text-violet-600",
    accentBg: "bg-violet-50",
    accentBorder: "border-violet-200",
    accentSolid: "bg-violet-500",
    accentIcon: "text-white",
    accentLeftBorder: "border-l-violet-500",
    accentRgb: "139, 92, 246",
    accentHex: "#8b5cf6",
    presets: [
      { key: "undervalued", label: "Undervalued", desc: "P/E < 15 & P/B < 1.5", icon: "fund" },
      { key: "above_sma200", label: "Above SMA 200", desc: "Harga di atas rata-rata 200 hari", icon: "trend" },
      { key: "high_dividend", label: "High Dividend", desc: "Dividend yield > 3%", icon: "fund" },
      { key: "blue_chip", label: "Blue Chip", desc: "Market cap > Rp 50T", icon: "fund" },
      { key: "value_growth", label: "Value + Growth", desc: "P/E < 20 & EPS positif", icon: "fund" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    shortLabel: "Custom",
    description: "Bangun filter sendiri dengan indikator pilihan",
    accent: "text-slate-600",
    accentBg: "bg-slate-50",
    accentBorder: "border-slate-200",
    accentSolid: "bg-slate-500",
    accentIcon: "text-white",
    accentLeftBorder: "border-l-slate-500",
    accentRgb: "100, 116, 139",
    accentHex: "#64748b",
    presets: [],
  },
];

// ── Icon Components ──

function PresetIcon({ type, className }: { type: PresetDef["icon"]; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (type) {
    case "radar":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      );
    case "rsi":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 20 C4 20 8 4 12 12 C16 20 20 4 20 4" />
        </svg>
      );
    case "stoch":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h6v12H4zM14 6h6v12h-6z" /><line x1="7" y1="10" x2="7" y2="18" /><line x1="17" y1="6" x2="17" y2="14" />
        </svg>
      );
    case "bb":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M2 12 Q6 4 12 12 Q18 20 22 12" /><path d="M2 12 Q6 18 12 12 Q18 6 22 12" />
        </svg>
      );
    case "vol":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="10" width="5" height="12" rx="1" /><rect x="9.5" y="6" width="5" height="16" rx="1" /><rect x="17" y="2" width="5" height="20" rx="1" />
        </svg>
      );
    case "macd":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <line x1="6" y1="18" x2="6" y2="10" /><line x1="10" y1="18" x2="10" y2="6" /><line x1="14" y1="18" x2="14" y2="12" /><line x1="18" y1="18" x2="18" y2="4" />
          <path d="M3 14 Q9 8 15 12 Q21 16 22 10" strokeWidth="1.5" />
        </svg>
      );
    case "cross":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M2 20 L8 14 L12 18 L22 4" /><circle cx="8" cy="14" r="2.5" strokeWidth="1.5" />
        </svg>
      );
    case "trend":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case "super":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 14 Q8 8 12 14 Q16 20 20 10" /><path d="M4 16 Q8 10 12 16 Q16 22 20 12" strokeDasharray="3 3" />
        </svg>
      );
    case "obv":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <polyline points="2 18 6 14 10 16 14 10 18 12 22 6" />
        </svg>
      );
    case "hype":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "adx":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "ema":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M3 18 Q8 6 12 12 Q16 18 21 6" /><path d="M3 16 Q8 10 12 14 Q16 18 21 4" strokeDasharray="3 3" />
        </svg>
      );
    case "fund":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="18" rx="2" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
        </svg>
      );
    case "sliders":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Tab Navigation ──

function ScreenerTabs({ activeStyle, onStyleChange, accentHex }: { activeStyle: TradingStyle; onStyleChange: (s: TradingStyle) => void; accentHex: string }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5" style={{ scrollbarWidth: "none" }}>
      {STYLES.map((style) => {
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

function PresetCard({
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
      className={`screener-preset-card depth-shadow cursor-pointer ${
        isActive ? "border-l-[3px] " + styleDef.accentLeftBorder : ""
      }`}
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
          {isActive && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styleDef.accentBg} ${styleDef.accent}`}>
              Active
            </span>
          )}
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

interface CustomFilter {
  id: string;
  label: string;
  enabled: boolean;
  params: Record<string, number | boolean>;
  paramDefs: { key: string; label: string; type: "range" | "toggle"; min?: number; max?: number; default?: number | boolean; step?: number }[];
}

const CUSTOM_FILTERS: CustomFilter[] = [
  {
    id: "rsi", label: "RSI (14)", enabled: false, params: { rsiMax: 30 },
    paramDefs: [
      { key: "rsiMax", label: "RSI Maks", type: "range", min: 10, max: 90, default: 30, step: 1 },
    ],
  },
  {
    id: "stoch", label: "Stochastic %K", enabled: false, params: { stochKMax: 20 },
    paramDefs: [
      { key: "stochKMax", label: "%K Maks", type: "range", min: 5, max: 95, default: 20, step: 1 },
    ],
  },
  {
    id: "adx", label: "ADX (Trend Strength)", enabled: false, params: { adxMin: 25 },
    paramDefs: [
      { key: "adxMin", label: "ADX Minimum", type: "range", min: 10, max: 50, default: 25, step: 1 },
    ],
  },
  {
    id: "macd", label: "MACD Bullish", enabled: false, params: { macdBullish: true },
    paramDefs: [{ key: "macdBullish", label: "MACD Histogram > 0", type: "toggle", default: true }],
  },
  {
    id: "sma200", label: "SMA 200 Position", enabled: false, params: { aboveSma200: true },
    paramDefs: [{ key: "aboveSma200", label: "Above SMA 200", type: "toggle", default: true }],
  },
  {
    id: "bb", label: "Bollinger Squeeze", enabled: false, params: { bbSqueeze: true },
    paramDefs: [{ key: "bbSqueeze", label: "Band width < 5%", type: "toggle", default: true }],
  },
];

function CustomBuilder({
  onFilterChange,
}: {
  onFilterChange: (params: Record<string, string>) => void;
}) {
  const [filters, setFilters] = useState<CustomFilter[]>(CUSTOM_FILTERS);

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
          };
          params[apiMap[k] ?? k] = String(v);
        }
      }
    }
    return params;
  }, [filters]);

  const enabledCount = filters.filter((f) => f.enabled).length;

  useState(() => {
    // Will be handled by effect
  });

  const prevParams = useMemo(() => JSON.stringify(buildParams()), [filters]);
  useMemo(() => {
    if (enabledCount > 0) {
      onFilterChange(buildParams());
    }
  }, [prevParams]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <span className="text-xs text-text-tertiary">{enabledCount} filter{enabledCount !== 1 ? "s" : ""} aktif</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-grid">
        {filters.map((filter, i) => (
          <div
            key={filter.id}
            className={`screener-preset-card depth-shadow p-4 ${
              filter.enabled ? "border-l-[3px] border-l-slate-400" : ""
            }`}
            data-active={filter.enabled ? "true" : undefined}
            style={{ "--stagger-i": i, "--card-accent": "#64748b" } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleFilter(filter.id)}
                className={`flex items-center gap-2 cursor-pointer ${filter.enabled ? "text-text-primary" : "text-text-secondary"}`}
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
        ))}
      </div>
    </div>
  );
}

// ── Results Components ──

interface ScreenerStock {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  sma20: number | null;
  pe?: number | null;
  pb?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
}

type ViewMode = "table" | "cards";

function ResultsHeader({
  count,
  viewMode,
  onViewChange,
}: {
  count: number;
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center justify-between flex-1">
      <div className="flex items-center gap-2.5">
        <h3 className="text-lg font-semibold tracking-tight">Hasil</h3>
        <span className="text-xs text-text-tertiary tabular-nums font-mono">{count} saham</span>
      </div>
      <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg p-0.5">
        <button
          onClick={() => onViewChange("table")}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "table" ? "bg-bg-hover text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}
          aria-label="Table view"
          aria-pressed={viewMode === "table"}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => onViewChange("cards")}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "cards" ? "bg-bg-hover text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}
          aria-label="Card view"
          aria-pressed={viewMode === "cards"}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ResultsTable({ stocks }: { stocks: ScreenerStock[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 49;

  const virtualizer = useVirtualizer({
    count: stocks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const gridCols = "grid-cols-[100px_200px_130px_90px_80px_90px_80px_1fr]";

  if (stocks.length === 0) {
    return (
      <div className="card-gradient depth-shadow rounded-xl p-8 text-center border border-border">
        <p className="text-text-secondary text-sm">Tidak ada saham yang cocok dengan filter ini.</p>
        <p className="text-text-tertiary text-xs mt-1">Coba filter lain atau cek lagi nanti.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl depth-shadow-strong bg-bg-card relative">
      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
        <div className={`glass-header sticky top-0 z-10 grid ${gridCols} text-text-tertiary text-[11px] uppercase tracking-wider min-w-[870px]`}>
          <div className="px-4 py-3 font-medium">Ticker</div>
          <div className="px-4 py-3 font-medium">Name</div>
          <div className="px-4 py-3 font-medium">Sector</div>
          <div className="px-4 py-3 text-right font-medium">Price</div>
          <div className="px-4 py-3 text-right font-medium">Change</div>
          <div className="px-4 py-3 text-right font-medium">Volume</div>
          <div className="px-4 py-3 text-right font-medium">RSI</div>
          <div className="px-4 py-3 text-right font-medium">SMA 20</div>
        </div>
        <div className="relative min-w-[870px]" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const stock = stocks[virtualRow.index];
            return (
              <div
                key={stock.ticker}
                className={`absolute top-0 left-0 w-full grid ${gridCols} items-center border-b border-border/40 cursor-pointer transition-colors ${
                  virtualRow.index % 2 === 0 ? "bg-bg-card/40" : ""
                } hover:bg-accent/[0.04]`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => { window.location.href = `/stocks/${stock.ticker}`; }}
              >
                <div className="px-4 py-3">
                  <Link href={`/stocks/${stock.ticker}`} className="font-semibold text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                    {stripJk(stock.ticker)}
                  </Link>
                </div>
                <div className="px-4 py-3 text-text-secondary truncate text-xs">{stock.name}</div>
                <div className="px-4 py-3 text-text-tertiary text-[11px]">{stock.sector}</div>
                <div className="px-4 py-3 text-right font-mono tabular-nums text-xs">{stock.close !== null ? formatPrice(stock.close) : "—"}</div>
                <div className={`px-4 py-3 text-right font-mono tabular-nums text-xs ${changeColor(stock.changePercent)}`}>
                  {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
                </div>
                <div className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary text-xs">
                  {stock.volume !== null ? formatVolume(stock.volume) : "—"}
                </div>
                <div className={`px-4 py-3 text-right font-mono tabular-nums text-xs ${rsiColor(stock.rsi14)}`}>
                  {stock.rsi14 !== null ? stock.rsi14.toFixed(1) : "—"}
                </div>
                <div className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary text-xs">
                  {stock.sma20 !== null ? formatPrice(stock.sma20) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultsCards({ stocks, styleDef }: { stocks: ScreenerStock[]; styleDef: TradingStyleDef }) {
  if (stocks.length === 0) {
    return (
      <div className="card-gradient depth-shadow rounded-xl p-8 text-center border border-border">
        <p className="text-text-secondary text-sm">Tidak ada saham yang cocok.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stocks.map((stock) => {
        const isUp = (stock.changePercent ?? 0) >= 0;
        return (
          <Link
            key={stock.ticker}
            href={`/stocks/${stock.ticker}`}
            className="card-gradient depth-shadow rounded-xl border border-border p-4 hover:depth-shadow-hover transition-all duration-200 press-scale group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-accent group-hover:underline">{stripJk(stock.ticker)}</span>
                <p className="text-[11px] text-text-secondary mt-0.5 truncate max-w-[180px]">{stock.name}</p>
              </div>
              {stock.rsi14 !== null && (
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                  stock.rsi14 < 30 ? "bg-blue-50 text-blue-600" : stock.rsi14 > 70 ? "bg-amber-50 text-amber-600" : "bg-bg-hover text-text-secondary"
                }`}>
                  RSI {stock.rsi14.toFixed(0)}
                </span>
              )}
            </div>

            <div className="flex items-end justify-between mt-3">
              <div>
                <span className="text-lg font-bold font-mono tabular-nums">{stock.close !== null ? formatPrice(stock.close) : "—"}</span>
                {stock.changePercent !== null && (
                  <span className={`ml-2 text-xs font-mono font-semibold ${changeColor(stock.changePercent)}`}>
                    {formatPercent(stock.changePercent)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-text-tertiary">{stock.sector}</span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-[10px] text-text-tertiary font-mono">
              {stock.volume !== null && <span>Vol {formatVolume(stock.volume)}</span>}
              {stock.sma20 !== null && stock.close !== null && (
                <span className={Math.abs((stock.close - stock.sma20) / stock.sma20 * 100) < 3 ? "text-emerald-500" : ""}>
                  SMA20 {formatPrice(stock.sma20)}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Main Page Component ──

export { STYLES };
export type { TradingStyle, TradingStyleDef, PresetDef, ScreenerStock };

function ScreenerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeStyle, setActiveStyle] = useState<TradingStyle>(
    () => {
      const tab = searchParams.get("tab");
      return (STYLES.find((s) => s.id === tab)?.id ?? "bottom-fishing") as TradingStyle;
    }
  );
  const [activePreset, setActivePreset] = useState<string | null>(() => searchParams.get("preset"));
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [customParams, setCustomParams] = useState<Record<string, string>>({});

  const styleDef = STYLES.find((s) => s.id === activeStyle)!;

  // Determine fetch URL
  const fetchUrl = useMemo(() => {
    if (activeStyle === "custom") {
      if (Object.keys(customParams).length === 0) return null;
      const qs = new URLSearchParams(customParams).toString();
      return `/api/screener?${qs}`;
    }
    if (!activePreset || activePreset === "radar") return null;
    const presetDef = STYLES.flatMap((s) => s.presets).find((p) => p.key === activePreset);
    if (presetDef?.sliders && presetDef.sliders.length > 0) {
      const params = new URLSearchParams();
      const modifiedFilters: Record<string, string> = {};
      for (const slider of presetDef.sliders) {
        const val = sliderValues[slider.key] ?? slider.default;
        modifiedFilters[slider.param] = String(val);
      }
      const isDefault = presetDef.sliders.every((s) => (sliderValues[s.key] ?? s.default) === s.default);
      if (!isDefault) {
        const qs = new URLSearchParams(modifiedFilters).toString();
        return `/api/screener?${qs}`;
      }
    }
    return `/api/screener?preset=${activePreset}`;
  }, [activeStyle, activePreset, sliderValues, customParams]);

  const { data: stocks = [], isLoading } = useQuery<ScreenerStock[]>({
    queryKey: ["screener", fetchUrl],
    queryFn: async () => {
      if (!fetchUrl) return [];
      const res = await fetch(fetchUrl);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.data ?? [];
    },
    enabled: !!fetchUrl,
    staleTime: 5 * 60 * 1000,
  });

  const handleStyleChange = useCallback((style: TradingStyle) => {
    setActiveStyle(style);
    setActivePreset(null);
    setSliderValues({});
    const params = new URLSearchParams();
    params.set("tab", style);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname]);

  const handlePresetClick = useCallback((presetKey: string) => {
    setActivePreset((prev) => prev === presetKey ? null : presetKey);
    setSliderValues({});
    const params = new URLSearchParams();
    params.set("tab", activeStyle);
    if (presetKey !== "radar") {
      params.set("preset", presetKey);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeStyle, router, pathname]);

  const handleSliderChange = useCallback((key: string, param: string, value: number) => {
    setSliderValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const showRadar = activeStyle === "bottom-fishing" && (activePreset === "radar" || activePreset === null);

  return (
    <div className="fade-in">
      {/* Hero Header — dark terminal style */}
      <section
        className="screener-hero"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", "--screener-accent-rgb": styleDef.accentRgb, "--screener-accent": styleDef.accentHex } as React.CSSProperties}
      >
        <div className="relative z-[1] max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-5">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/10" style={{ color: styleDef.accentHex }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: styleDef.accentHex }} aria-hidden="true" />
              {styleDef.label}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono uppercase tracking-[0.15em]">
                Screener
              </h1>
              <p className="text-gray-400 max-w-lg text-sm sm:text-base mt-2 leading-relaxed">
                <span className="text-gray-500 font-mono text-xs mr-2">&gt;</span>
                {styleDef.description}
              </p>
            </div>
          </div>
          <ScreenerTabs activeStyle={activeStyle} onStyleChange={handleStyleChange} accentHex={styleDef.accentHex} />
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Preset Cards */}
        {activeStyle !== "custom" && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ background: styleDef.accentHex }} aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Pilih Filter</h2>
                <p className="text-xs text-text-tertiary">{styleDef.presets.length} preset tersedia</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-grid">
              {styleDef.presets.map((preset, i) => (
                <div key={preset.key} style={{ "--stagger-i": i } as React.CSSProperties}>
                  <PresetCard
                    preset={preset}
                    styleDef={styleDef}
                    isActive={activePreset === preset.key}
                    onClick={() => handlePresetClick(preset.key)}
                    sliderValues={sliderValues}
                    onSliderChange={handleSliderChange}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Radar (bottom fishing only) — below preset cards */}
        {showRadar && (
          <section>
            <BottomFishingRadar />
          </section>
        )}

        {/* Custom Builder */}
        {activeStyle === "custom" && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-slate-500" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Filter Builder</h2>
                <p className="text-xs text-text-tertiary">Kombinasikan indikator sesuai strategi Anda</p>
              </div>
            </div>
            <CustomBuilder
              onFilterChange={(params) => setCustomParams(params)}
            />
          </section>
        )}

        {/* Results */}
        {fetchUrl && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ background: styleDef.accentHex }} aria-hidden="true" />
              <ResultsHeader
                count={isLoading ? 0 : stocks.length}
                viewMode={viewMode}
                onViewChange={setViewMode}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-text-tertiary text-sm">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Memuat hasil...
              </div>
            ) : (
              viewMode === "table"
                ? <ResultsTable stocks={stocks} />
                : <ResultsCards stocks={stocks} styleDef={styleDef} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ScreenerPageSkeleton() {
  return (
    <div className="fade-in animate-pulse min-h-[70vh]">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-5">
          <div className="h-8 w-64 bg-bg-hover rounded-lg" />
          <div className="h-4 w-96 bg-bg-hover rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 bg-bg-hover rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-bg-hover rounded-xl" />
          ))}
        </div>
        <div className="h-[50vh] bg-bg-hover rounded-xl" />
      </div>
    </div>
  );
}

export default function ScreenerClient() {
  return (
    <Suspense fallback={<ScreenerPageSkeleton />}>
      <ScreenerPageContent />
    </Suspense>
  );
}
