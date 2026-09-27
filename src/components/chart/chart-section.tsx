"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useStockHistory } from "@/hooks/use-stock-history";
import { useIndicators } from "@/hooks/use-indicators";
import { RANGE_KEYS, INTRADAY_CONFIG, IDX_STOCKS, type DateRange } from "@/lib/constants";
import { calculateNearestSR } from "@/lib/indicators";
import { formatPrice } from "@/lib/utils";

const CandlestickChart = dynamic(
  () => import("@/components/chart/candlestick-chart").then((mod) => mod.CandlestickChart),
  { ssr: false, loading: () => <div className="w-full h-[450px] bg-bg-card rounded-xl animate-pulse" /> }
);

const RsiPanel = dynamic(
  () => import("@/components/chart/rsi-panel"),
  { ssr: false, loading: () => <div className="w-full h-[120px] bg-bg-card rounded-b-lg animate-pulse" /> }
);

const MacdPanel = dynamic(
  () => import("@/components/chart/macd-panel"),
  { ssr: false, loading: () => <div className="w-full h-[120px] bg-bg-card rounded-b-lg animate-pulse" /> }
);

interface ChartSectionProps {
  ticker: string;
}

// Hybrid freemium: anon chart caps at 3mo (server clamps API to ~90 days too).
const ANON_RANGES: DateRange[] = ["1D", "5D", "1mo", "3mo"];

export function ChartSection({ ticker }: ChartSectionProps) {
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const [range, setRange] = useState<DateRange>("6mo");
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showEma12, setShowEma12] = useState(false);
  const [showEma26, setShowEma26] = useState(false);
  const [showZigzag, setShowZigzag] = useState(false);
  const [showBb, setShowBb] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
  const [showMacd, setShowMacd] = useState(false);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareTicker, setCompareTicker] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);

  // Shared visible time range for multi-pane sync
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null);
  const handleVisibleRangeChange = useCallback((from: number, to: number) => {
    setVisibleRange({ from, to });
  }, []);

  const visibleRanges = isAuthed ? RANGE_KEYS : ANON_RANGES;
  const effectiveRange: DateRange = visibleRanges.includes(range) ? range : "3mo";
  const isIntraday = !!INTRADAY_CONFIG[effectiveRange];
  const { data: history, isLoading: historyLoading } = useStockHistory(ticker, effectiveRange);
  const { data: indicators, isLoading: indicatorsLoading } = useIndicators(ticker, isIntraday ? "1mo" : effectiveRange);

  // Compare data
  const { data: compareHistory } = useStockHistory(compareTicker ?? "", effectiveRange);
  const compareData = compareTicker && compareHistory
    ? compareHistory.map((d: { date: string; close: number }) => ({ date: d.date, value: d.close }))
    : undefined;
  const compareLabel = compareTicker ?? undefined;

  // Compare ticker search
  const filteredTickers = compareQuery.length >= 2
    ? IDX_STOCKS.filter((s) =>
        (s.ticker.toLowerCase().includes(compareQuery.toLowerCase()) || s.name.toLowerCase().includes(compareQuery.toLowerCase())) && s.ticker !== ticker
      ).slice(0, 8)
    : [];

  if (historyLoading || indicatorsLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-bg-card depth-shadow rounded-lg p-0.5">
            {RANGE_KEYS.map((r) => (
              <div key={r} className="px-3 py-1 text-xs rounded-md bg-bg-hover animate-pulse w-10 h-6" />
            ))}
          </div>
        </div>
        <div className="w-full h-[450px] bg-bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-bg-card depth-shadow rounded-xl p-8 text-center text-text-secondary">
        No price data available
      </div>
    );
  }

  const srLevels = (() => {
    if (!history || history.length === 0 || !history[history.length - 1]) return { support: null as number | null, resistance: null as number | null };
    const prices = history.slice(-20).map((h: { high: number; low: number; close: number }) => ({ high: h.high, low: h.low, close: h.close }));
    const sr = calculateNearestSR(prices, history[history.length - 1].close);
    return sr;
  })();

  // Build RSI data for panel
  const rsiPanelData = indicators?.rsi14 && indicators.dates
    ? indicators.dates.map((date: string | number, i: number) => ({ date, value: indicators.rsi14[i] ?? null }))
    : [];

  // Overlay menu — 10 toggles distilled into one grouped dropdown.
  const OVERLAYS = [
    {
      label: "Moving Average",
      items: [
        { name: "SMA 20", color: "#d97706", value: showSma20, toggle: () => setShowSma20(!showSma20) },
        { name: "SMA 50", color: "#8b5cf6", value: showSma50, toggle: () => setShowSma50(!showSma50) },
        { name: "SMA 200", color: "#0ea5e9", value: showSma200, toggle: () => setShowSma200(!showSma200) },
        { name: "EMA 12", color: "#06b6d4", value: showEma12, toggle: () => setShowEma12(!showEma12) },
        { name: "EMA 26", color: "#ec4899", value: showEma26, toggle: () => setShowEma26(!showEma26) },
      ],
    },
    {
      label: "Overlay",
      items: [
        { name: "Bollinger Bands", color: "#2563eb", value: showBb, toggle: () => setShowBb(!showBb) },
        { name: "ZigZag", color: "#f59e0b", value: showZigzag, toggle: () => setShowZigzag(!showZigzag) },
      ],
    },
    {
      label: "Panel",
      items: [
        { name: "RSI", color: "#8b5cf6", value: showRsi, toggle: () => setShowRsi(!showRsi) },
        { name: "MACD", color: "#2563eb", value: showMacd, toggle: () => setShowMacd(!showMacd) },
      ],
    },
  ];
  const overlayCount = OVERLAYS.flatMap((g) => g.items).filter((i) => i.value).length;
  const resetOverlays = () => {
    setShowSma20(false); setShowSma50(false); setShowSma200(false);
    setShowEma12(false); setShowEma26(false); setShowBb(false);
    setShowZigzag(false); setShowRsi(false); setShowMacd(false);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Range selector */}
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-card depth-shadow rounded-lg p-0.5">
            {visibleRanges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={effectiveRange === r}
                aria-label={`Show ${r} chart`}
                className={`px-3 py-1 min-h-11 sm:min-h-0 text-xs font-medium rounded-md transition-all duration-150 ${
                  effectiveRange === r
                    ? "bg-text-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {!isAuthed && (
            <Link
              href="/auth/register"
              className="inline-flex items-center text-xs px-2 py-1 min-h-11 sm:min-h-0 rounded-md border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium whitespace-nowrap"
              title="Rentang lebih panjang untuk member"
            >
              🔒 Buka 6mo+
            </Link>
          )}
        </div>

        {/* Chart type toggle */}
        <div className="flex bg-bg-card depth-shadow rounded-lg p-0.5">
          {([
            { key: "candlestick" as const, label: "Candle" },
            { key: "line" as const, label: "Line" },
            { key: "area" as const, label: "Area" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setChartType(t.key)}
              aria-pressed={chartType === t.key}
              className={`px-3 py-1 min-h-11 sm:min-h-0 text-xs font-medium rounded-md transition-all duration-150 ${
                chartType === t.key
                  ? "bg-text-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Compare */}
        <div className="relative">
          {compareTicker ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-muted border border-accent/20 text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span className="font-mono font-semibold text-accent">
                {compareTicker.replace(/\.JK$/, "")}
              </span>
              <button
                onClick={() => { setCompareTicker(null); setCompareQuery(""); }}
                className="ml-0.5 text-accent/60 hover:text-accent transition-colors"
                aria-label="Hapus perbandingan"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={compareQuery}
                onChange={(e) => {
                  setCompareQuery(e.target.value);
                  setShowDropdown(e.target.value.length >= 2);
                }}
                onFocus={() => setShowDropdown(compareQuery.length >= 2)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Bandingkan..."
                className="w-32 pl-7 pr-2 py-1 text-xs rounded-md border border-border bg-bg-card text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
            </div>
          )}

          {showDropdown && filteredTickers.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-56 bg-bg-card depth-shadow rounded-lg border border-border overflow-hidden z-20">
              {filteredTickers.map((s) => (
                <button
                  key={s.ticker}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCompareTicker(s.ticker);
                    setCompareQuery("");
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 min-h-11 sm:min-h-0 text-xs text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <span className="font-mono font-semibold">{s.ticker.replace(/\.JK$/, "")}</span>{" "}
                  <span className="text-text-tertiary">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Overlay selector — 10 toggles distilled into one grouped dropdown */}
        <div className="relative">
          {isAuthed ? (
            <>
              <button
                type="button"
                onClick={() => setShowOverlays((v) => !v)}
                aria-expanded={showOverlays}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 px-2.5 py-1 min-h-11 sm:min-h-0 text-xs font-medium rounded-md border border-border bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                Indikator
                {overlayCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-mono font-bold rounded-full bg-accent text-white">{overlayCount}</span>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${showOverlays ? "rotate-180" : ""}`} aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              {showOverlays && (
                <>
                  <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setShowOverlays(false)} className="fixed inset-0 z-30 cursor-default" />
                  <div role="menu" className="absolute top-full right-0 mt-1 w-60 bg-bg-card depth-shadow-strong rounded-lg border border-border overflow-hidden z-40 p-1.5">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-tertiary">Indikator</span>
                      {overlayCount > 0 && (
                        <button type="button" onClick={resetOverlays} className="text-[10px] text-accent hover:underline">Reset</button>
                      )}
                    </div>
                    {OVERLAYS.map((group) => (
                      <div key={group.label} className="pt-1">
                        <p className="px-2 py-0.5 text-[10px] font-medium text-text-tertiary">{group.label}</p>
                        {group.items.map((it) => (
                          <button
                            key={it.name}
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked={it.value}
                            onClick={it.toggle}
                            className="w-full flex items-center gap-2 px-2 py-1.5 min-h-11 sm:min-h-0 text-xs rounded-md text-text-primary hover:bg-bg-hover transition-colors text-left"
                          >
                            <span className={`flex items-center justify-center w-4 h-4 rounded border ${it.value ? "bg-text-primary border-text-primary" : "border-border"}`} aria-hidden="true">
                              {it.value && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: it.color }} aria-hidden="true" />
                            <span className="font-mono">{it.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <a href="/auth/signin" className="text-[11px] font-mono text-text-tertiary hover:text-accent transition-colors">
              Daftar untuk menambahkan indikator di chart &rarr;
            </a>
          )}
        </div>
      </div>

      {/* Chart container — multi-pane */}
      <div className="depth-shadow-strong rounded-xl overflow-hidden bg-bg-card">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" aria-hidden="true" />

        {/* Main chart */}
        <CandlestickChart
          data={history}
          chartType={chartType}
          sma20={indicators?.sma20}
          sma50={indicators?.sma50}
          sma200={indicators?.sma200}
          ema12={indicators?.ema12}
          ema26={indicators?.ema26}
          showSma20={showSma20}
          showSma50={showSma50}
          showSma200={showSma200}
          showEma12={showEma12}
          showEma26={showEma26}
          supportLevel={srLevels.support}
          resistanceLevel={srLevels.resistance}
          swingPoints={indicators?.swingPoints}
          unconfirmedLeg={indicators?.unconfirmedLeg ?? null}
          showZigzag={showZigzag}
          bbUpper={indicators?.bb?.upper}
          bbMiddle={indicators?.bb?.middle}
          bbLower={indicators?.bb?.lower}
          showBb={showBb}
          compareData={compareData}
          compareLabel={compareLabel}
          isTimeVisible={isIntraday}
          onVisibleTimeRangeChange={handleVisibleRangeChange}
          parentVisibleRange={visibleRange}
        />

        {/* RSI subplot */}
        {showRsi && rsiPanelData.length > 0 && (
          <div className="border-t border-border/50">
            <RsiPanel
              data={rsiPanelData}
              isTimeVisible={isIntraday}
              onVisibleTimeRangeChange={handleVisibleRangeChange}
              parentVisibleRange={visibleRange}
            />
          </div>
        )}

        {/* MACD subplot */}
        {showMacd && indicators?.macd && indicators.dates && (
          <div className="border-t border-border/50">
            <MacdPanel
              dates={indicators.dates}
              macdLine={indicators.macd.line}
              signal={indicators.macd.signal}
              histogram={indicators.macd.histogram}
              isTimeVisible={isIntraday}
              onVisibleTimeRangeChange={handleVisibleRangeChange}
              parentVisibleRange={visibleRange}
            />
          </div>
        )}
      </div>

      {/* S/R level indicators */}
      {srLevels.support !== null || srLevels.resistance !== null ? (
        <div className="flex items-center gap-4 text-[11px] bg-bg-card/60 depth-shadow rounded-lg px-3 py-2">
          {srLevels.support !== null && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-bullish/40 rounded" aria-hidden="true" style={{ borderBottom: '1px dashed', borderColor: 'rgba(13,148,136,0.4)' }} />
              <span className="text-text-tertiary">Support <span className="font-mono tabular-nums text-text-secondary">{formatPrice(srLevels.support)}</span></span>
            </div>
          )}
          {srLevels.resistance !== null && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-bearish/40 rounded" aria-hidden="true" style={{ borderBottom: '1px dashed', borderColor: 'rgba(220,38,38,0.4)' }} />
              <span className="text-text-tertiary">Resistance <span className="font-mono tabular-nums text-text-secondary">{formatPrice(srLevels.resistance)}</span></span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
