// ── Trading Style Definitions ──

export type TradingStyle = "bottom-fishing" | "swing-trade" | "momentum" | "long-term" | "custom";

export interface PresetDef {
  key: string;
  label: string;
  desc: string;
  icon: "radar" | "rsi" | "stoch" | "bb" | "vol" | "macd" | "cross" | "trend" | "super" | "obv" | "hype" | "adx" | "ema" | "fund" | "sliders";
  params?: Record<string, string>;
  sliders?: { key: string; label: string; min: number; max: number; default: number; param: string }[];
  equityOnly?: boolean;
}

export interface TradingStyleDef {
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

export const STYLES: TradingStyleDef[] = [
  {
    id: "bottom-fishing",
    label: "Bottom Fishing",
    shortLabel: "Bottom",
    description: "Temukan aset oversold dengan potensi reversal",
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
    description: "Aset dengan momentum kuat",
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
      { key: "undervalued", label: "Undervalued", desc: "P/E < 15 & P/B < 1.5", icon: "fund", equityOnly: true },
      { key: "above_sma200", label: "Above SMA 200", desc: "Harga di atas rata-rata 200 hari", icon: "trend" },
      { key: "high_dividend", label: "High Dividend", desc: "Dividend yield > 3%", icon: "fund", equityOnly: true },
      { key: "blue_chip", label: "Blue Chip", desc: "Market cap > Rp 50T", icon: "fund", equityOnly: true },
      { key: "value_growth", label: "Value + Growth", desc: "P/E < 20 & EPS positif", icon: "fund", equityOnly: true },
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

// ── Custom Filter Types ──

export interface CustomFilter {
  id: string;
  label: string;
  group: string;
  enabled: boolean;
  params: Record<string, number | boolean>;
  paramDefs: { key: string; label: string; type: "range" | "toggle"; min?: number; max?: number; default?: number | boolean; step?: number }[];
  authRequired?: boolean;
  equityOnly?: boolean;
}

export const CUSTOM_FILTERS: CustomFilter[] = [
  {
    id: "rsi", label: "RSI (14)", group: "Momentum", enabled: false, params: { rsiMax: 30 },
    paramDefs: [
      { key: "rsiMax", label: "RSI Maks", type: "range", min: 10, max: 90, default: 30, step: 1 },
    ],
  },
  {
    id: "stoch", label: "Stochastic %K", group: "Momentum", enabled: false, params: { stochKMax: 20 },
    paramDefs: [
      { key: "stochKMax", label: "%K Maks", type: "range", min: 5, max: 95, default: 20, step: 1 },
    ],
  },
  {
    id: "macd", label: "MACD Bullish", group: "Momentum", enabled: false, params: { macdBullish: true },
    paramDefs: [{ key: "macdBullish", label: "MACD Histogram > 0", type: "toggle", default: true }],
  },
  {
    id: "adx", label: "ADX (Trend Strength)", group: "Tren", enabled: false, params: { adxMin: 25 },
    paramDefs: [
      { key: "adxMin", label: "ADX Minimum", type: "range", min: 10, max: 50, default: 25, step: 1 },
    ],
  },
  {
    id: "sma200", label: "SMA 200 Position", group: "Tren", enabled: false, params: { aboveSma200: true },
    paramDefs: [{ key: "aboveSma200", label: "Above SMA 200", type: "toggle", default: true }],
  },
  {
    id: "bb", label: "Bollinger Squeeze", group: "Volatilitas", enabled: false, params: { bbSqueeze: true },
    paramDefs: [{ key: "bbSqueeze", label: "Band width < 5%", type: "toggle", default: true }],
  },
  {
    id: "signalScore", label: "Signal Score", group: "Kualitas", enabled: false, params: { signalScoreMin: -0.2 },
    paramDefs: [
      { key: "signalScoreMin", label: "Minimum Score", type: "range", min: -1, max: 1, default: -0.2, step: 0.1 },
    ],
    authRequired: true,
  },
  {
    id: "gorengan", label: "Exclude Gorengan", group: "Kualitas", enabled: false, params: { excludeGorengan: true },
    paramDefs: [{ key: "excludeGorengan", label: "Buang saham gorengan", type: "toggle", default: true }],
    authRequired: true,
    equityOnly: true,
  },
];

// ── Asset-class curation ──
// Crypto screener shows only technical presets/filters; IDX-only fundamentals
// (undervalued/dividend/blue_chip/value_growth) + gorengan are equityOnly.
export function stylesForAssetClass(assetClass?: "EQUITY" | "CRYPTO"): TradingStyleDef[] {
  if (assetClass !== "CRYPTO") return STYLES;
  return STYLES
    .map((s) => ({ ...s, presets: s.presets.filter((p) => !p.equityOnly) }))
    .filter((s) => s.presets.length > 0 || s.id === "custom");
}

export function customFiltersForAssetClass(assetClass?: "EQUITY" | "CRYPTO"): CustomFilter[] {
  if (assetClass !== "CRYPTO") return CUSTOM_FILTERS;
  return CUSTOM_FILTERS.filter((f) => !f.equityOnly);
}

// ── Results Types ──

export interface ScreenerStock {
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
  signalScore?: number | null;
  signalLabel?: string | null;
}

export type ViewMode = "table" | "cards";
export type SortField = "signalScore" | "rsi14" | "volume" | "changePercent" | "close" | "";
export type SortOrder = "asc" | "desc";

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "", label: "Default" },
  { value: "signalScore", label: "Signal Score" },
  { value: "rsi14", label: "RSI" },
  { value: "volume", label: "Volume" },
  { value: "changePercent", label: "Change %" },
  { value: "close", label: "Price" },
];

// ── Helper Functions ──

export function signalLabelColor(label: string | null | undefined): string {
  if (!label) return "";
  switch (label) {
    case "Strong Bullish":
    case "Bullish":
      return "bg-bullish-bg text-bullish";
    case "Netral":
      return "bg-bg-hover text-text-secondary";
    case "Bearish":
    case "Strong Bearish":
      return "bg-bearish-bg text-bearish";
    default:
      return "bg-bg-hover text-text-secondary";
  }
}