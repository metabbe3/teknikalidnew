# Chart Improvement Plan — TeknikalID

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade TeknikalID chart to show RSI & MACD subplots, Bollinger Bands, fix compare overlay, and enable indicators on intraday.

**Architecture:** Add 2 new panels below the main chart (RSI + MACD) using lightweight-charts' multi-pane pattern (separate chart instances synced via visibleTimeRange). Bollinger Bands overlaid on the main price chart. Compare overlay fixed to % change normalization.

**Tech Stack:** lightweight-charts v5 (existing), technicalindicators (existing backend), no new dependencies.

---

## Current State

- **Library:** lightweight-charts v5.2.0 (TradingView) ✅ good choice
- **Backend API** `/api/stocks/[ticker]/indicators` already returns: `rsi14[]`, `macd{line,signal,histogram}[]`, `bb{upper,middle,lower}[]` ✅
- **Hook** `useIndicators` already fetches all indicator data ✅
- **Chart component** `candlestick-chart.tsx` only renders: SMA 20/50/200, EMA 12/26, ZigZag, S/R, Volume, Compare
- **Missing:** RSI subplot, MACD subplot, Bollinger Bands overlay, broken compare normalization

---

## Task Breakdown

### Task 1: Add RSI Subplot Panel

**Objective:** Show RSI(14) as a separate synchronized panel below the main chart.

**Files:**
- Create: `src/components/chart/rsi-panel.tsx`
- Modify: `src/components/chart/candlestick-chart.tsx` (add RSI props)
- Modify: `src/components/chart/chart-section.tsx` (pass RSI data, add toggle)

**Approach:**
- Create a new lightweight-charts instance for RSI (height ~120px)
- Sync time scales between main chart and RSI chart using `visibleTimeRange` subscription
- Add horizontal reference lines at 30 (oversold) and 70 (overbought)
- Color fill: overbought zone (70-100) red tint, oversold zone (0-30) green tint
- New toggle button "RSI" in the overlay toolbar

**RSI Panel Props:**
```ts
interface RsiPanelProps {
  data: { date: string | number; value: number | null }[];
  isTimeVisible: boolean;
  onVisibleRangeChange?: (range: { from: number; to: number }) => void;
}
```

**Verification:** Navigate to any stock page, toggle RSI on, see subplot with RSI line + 30/70 zones.

---

### Task 2: Add MACD Subplot Panel

**Objective:** Show MACD (line + signal + histogram) as a synchronized panel below RSI.

**Files:**
- Create: `src/components/chart/macd-panel.tsx`
- Modify: `src/components/chart/candlestick-chart.tsx` (add MACD props)
- Modify: `src/components/chart/chart-section.tsx` (pass MACD data, add toggle)

**Approach:**
- New lightweight-charts instance (height ~120px)
- 3 series: MACD line (blue), Signal line (orange), Histogram (colored bars)
- Histogram: green when positive, red when negative
- Zero line reference
- Synced with main chart + RSI panel time scale

**MACD Panel Props:**
```ts
interface MacdPanelProps {
  dates: (string | number)[];
  macdLine: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
  isTimeVisible: boolean;
}
```

**Verification:** Toggle MACD on, see subplot with MACD line + signal + colored histogram bars.

---

### Task 3: Add Bollinger Bands Overlay

**Objective:** Render Bollinger Bands (upper, middle, lower) on the main price chart.

**Files:**
- Modify: `src/components/chart/candlestick-chart.tsx` (add BB series)
- Modify: `src/components/chart/chart-section.tsx` (add BB toggle + pass data)

**Approach:**
- 3 LineSeries on main chart: upper (dashed, semi-transparent), middle (solid), lower (dashed, semi-transparent)
- Color: blue tones (e.g., `rgba(59, 130, 246, 0.5)`)
- New toggle "BB" in toolbar
- Data already available from `indicators.bb` (no backend changes needed)

**Verification:** Toggle BB on, see 3 bands around the candlesticks on main chart.

---

### Task 4: Fix Compare Overlay (% Change Normalization)

**Objective:** Fix the broken compare feature — overlay should show % change, not raw prices.

**Files:**
- Modify: `src/components/chart/candlestick-chart.tsx` (lines 415-454, rewrite compare logic)

**Current Bug:** The normalization code is commented out (lines 421-448). Both series use raw price — comparing BBCA (Rp 8.000) with GOTO (Rp 50) is meaningless.

**Fix:**
- Normalize both main stock AND compare stock to % change from first visible data point
- Use a separate price scale (`priceScaleId: "compare"`) with % labels
- Show percentage on the right axis for compare, hide main price labels when compare is active
- Legend shows both stock names with current % change

**Verification:** Compare BBCA vs GOTO — both should start at 0% and diverge meaningfully.

---

### Task 5: Enable Indicators on Intraday Timeframes

**Objective:** Show MA, BB, and ZigZag on 1D and 5D timeframes.

**Files:**
- Modify: `src/components/chart/chart-section.tsx` (remove `isIntraday` guards for indicators)

**Current Issue:** Lines 227-241 block all indicators when `isIntraday === true`. This is unnecessarily restrictive.

**Fix:**
- Remove `isIntraday ? undefined : ...` guards for SMA/EMA/BB/ZigZag props
- Keep the toggle buttons visible for intraday (they're currently hidden)
- Note: indicator data is already fetched with `useIndicators(ticker, isIntraday ? "1mo" : range)` which provides enough data points

**Verification:** Switch to 1D or 5D, toggle SMA 20 on, see the moving average line on the intraday chart.

---

### Task 6: Layout Restructure — Multi-Pane Container

**Objective:** Create a wrapper component that manages the main chart + subplot panels with synchronized scrolling.

**Files:**
- Create: `src/components/chart/chart-pane-container.tsx`
- Modify: `src/components/chart/chart-section.tsx` (use new container)

**Approach:**
- Container manages a shared `visibleTimeRange` state
- Main chart, RSI panel, MACD panel all subscribe to this shared state
- When user scrolls/pans any chart, all others sync
- Panels are conditionally rendered based on toggle state
- Height: main chart ~400px, each subplot ~120px
- Each panel has a small label (e.g., "RSI (14)", "MACD (12,26,9)")

**Layout structure:**
```
┌─────────────────────────────┐
│  Main Chart (OHLCV + MA/BB) │  ~400px
├─────────────────────────────┤
│  RSI (14)         [toggle]  │  ~120px (conditional)
├─────────────────────────────┤
│  MACD (12,26,9)   [toggle]  │  ~120px (conditional)
└─────────────────────────────┘
```

**Verification:** Toggle RSI + MACD on, scroll main chart, see both subplots scroll in sync.

---

### Task 7: Build, Test & Deploy

**Objective:** Verify everything works and deploy.

**Steps:**
1. Run `docker compose build app` — ensure no build errors
2. Run `docker compose up -d app` — deploy
3. Test on production: navigate to `/stocks/BBCA.JK`
4. Verify: RSI toggle → subplot appears, MACD toggle → subplot appears, BB toggle → bands visible
5. Verify: Compare BBCA vs GOTO → % change overlay
6. Verify: Switch to 1D → indicators still visible
7. Verify: Mobile responsive — subplots stack properly
8. Git commit + push

---

## Risks & Considerations

1. **Performance:** 3 chart instances (main + RSI + MACD) = more memory. lightweight-charts is lightweight (~45KB per instance), should be fine.
2. **Time sync complexity:** Syncing visibleTimeRange across multiple chart instances needs careful implementation — subscribe to `visibleTimeRangeChange` on each chart and propagate.
3. **Intraday indicator accuracy:** MA values on intraday data use "1mo" fallback — not truly intraday MAs. Acceptable for now.
4. **Compare overlay UX:** % change mode means the right axis changes to percentage. Need clear visual indicator that it's showing % not price.
5. **Mobile height:** 3 panels = ~640px total. On mobile (320px chart + 2×120px = 560px), may need scroll. Consider collapsible panels.

## Dependencies

- No new npm packages needed — lightweight-charts v5 supports all required features
- Backend API already returns all indicator data (RSI, MACD, BB) ✅
- `technicalindicators` library already calculates everything server-side ✅
