# Screener Redesign: Tabbed Trading Styles

**Date**: 2026-05-30
**Status**: Approved

## Context

The screener page has 22 preset filters across 6 technical categories. With 900+ IDX stocks now available, the current flat card layout feels cluttered and intimidating — especially for retail investors who think in terms of trading strategies ("I want bottom fishing plays"), not indicator names ("RSI < 30").

**Goal**: Reorganize the screener around 4 trading styles with a guided preset experience for beginners and a custom filter builder for advanced users. Make filtering intuitive and results visually informative.

## Target Users

- **Beginners** (default): Guided presets per trading style, plain-language labels, one-click results
- **Advanced** (Custom tab): Full filter builder with adjustable thresholds, multi-condition AND logic

## Trading Style Tabs

5 tabs at the top of the screener page, horizontally scrollable on mobile:

### 1. Bottom Fishing (default tab)
Hero feature for finding oversold bounce plays.
- **Bottom Fishing Radar** (smart scan — existing algorithm combining RSI + Stochastic + Volume)
- RSI Oversold (RSI < 30)
- Stochastic Oversold (K & D < 20)
- Bollinger Lower Touch (price near lower band)
- Volume Spike at Low (high volume + price drop)

### 2. Swing Trade
For 1-2 week holds.
- MACD Bullish Crossover
- Golden Cross (SMA 20 crosses above SMA 50)
- Supertrend Bullish
- OBV Accumulation
- Pullback to SMA 20

### 3. Momentum
Quick plays and scalping.
- RSI Overbought (RSI > 70)
- Hype Alert (2x volume + 5% gain)
- ADX Trending Strong
- Stochastic Overbought Breakout
- EMA Crossover (12/26)

### 4. Long-Term Investing
Fundamental + technical filters for buy-and-hold.
- Undervalued (low PE, low PB)
- Above SMA 200 (long-term uptrend)
- High Dividend Yield
- Blue Chip (large cap + profitable)
- Value Growth (reasonable PE + EPS growth)

### 5. Custom (Advanced)
- Toggleable indicator chips (RSI, MACD, SMA, Volume, etc.)
- Each chip expands to a range slider when active
- Multiple conditions combine with AND logic
- Reset button clears all filters
- Saved filters in localStorage

## Preset Card UX

Each preset appears as a card in a responsive grid (1 col mobile, 2 tablet, 3 desktop). Cards show:
- Strategy-relevant icon
- Preset name (plain language)
- One-line description
- Match count badge (fetched on tab load)

**Expandable tweak panel**: Clicking a preset card:
1. Highlights the card as active
2. Loads results below
3. Expands the card to reveal 2-4 threshold sliders

Sliders allow adjusting the preset parameters (e.g., RSI threshold from 30 to 20-40). Results update live with 300ms debounce.

## Results View

Two display modes with toggle buttons in results header:

### Table View (compact, default on desktop)
- Virtual-scrolling table (reuse pattern from `/stocks`)
- Columns: Ticker, Name, Sector, Price, Change%, Volume, RSI, Strategy Metric
- Sortable columns
- Click row → stock detail page
- Color-coded change and RSI values

### Card View (visual, default on mobile)
- Responsive grid (1/2/3 columns by breakpoint)
- Each card shows:
  - Ticker + Name
  - Price + Change% (color-coded)
  - Mini sparkline (7-day)
  - 2-3 strategy-specific metrics (e.g., Bottom Fishing shows RSI + Support + Upside to SMA20)
  - Quick "Add to Watchlist" button
  - Strategy badges (Deep Oversold, Volume Spike, etc.)

### Results Header
- Match count: "23 stocks found"
- Sort dropdown (RSI, Change%, Volume)
- Table/Card toggle icons
- Sector filter pills (narrow results further)

## Mobile Experience

- Tab bar scrolls horizontally
- Preset cards stack 1 per row
- Sliders go full-width
- Card view is default (better touch targets)
- Table view shows fewer columns on mobile

## Data Flow & API

### Existing (no changes needed)
- Preset queries: `GET /api/screener?preset=<key>` (existing 22 presets)
- Bottom Fishing Radar: `GET /api/stocks/radar`
- Sparklines: `GET /api/stocks/sparkline`

### New
- `GET /api/screener/custom?rsi_max=30&volume_min=2&sma200_above=true&...`
  - New service method: `technicalAnalysisService.customScreenerQuery(filters)`
  - Returns same shape as existing screener results
  - Used by both the preset tweak sliders (modified thresholds) and the Custom tab

When a user tweaks a preset slider, the preset name maps to a set of custom filter parameters with the slider value overriding the default threshold. This reuses the custom endpoint.

## Files to Modify/Create

| File | Change |
|------|--------|
| `src/app/(public)/screener/page.tsx` | Rewrite with tabbed layout |
| `src/components/screener/screener-tabs.tsx` | New: tab navigation component |
| `src/components/screener/preset-card.tsx` | New: expandable preset card with tweak sliders |
| `src/components/screener/screener-results.tsx` | Enhance: add table/card toggle, strategy-specific metrics |
| `src/components/screener/custom-builder.tsx` | New: advanced filter builder for Custom tab |
| `src/components/screener/results-table.tsx` | New: virtual-scrolling results table |
| `src/components/screener/results-cards.tsx` | New: card grid results view |
| `src/app/api/screener/route.ts` | Add custom query parameter support |
| `src/domains/stock/technical-analysis.service.ts` | Add `customScreenerQuery()` method |
| `src/domains/stock/stock.repository.ts` | Add `findStocksWithCustomFilters()` query |

## Verification

1. Load `/screener` — Bottom Fishing tab shows with radar + 4 preset cards
2. Click "RSI Oversold" — results load, card expands to show RSI threshold slider
3. Drag slider to 35 — results update live
4. Switch to "Swing Trade" tab — new presets appear, previous results clear
5. Click "Custom" tab — all indicator chips visible, toggle RSI chip → slider appears
6. Toggle between table and card view — both display correctly
7. Mobile viewport — tabs scroll, card view is default, sliders full-width
8. Sector pills in results header filter correctly
