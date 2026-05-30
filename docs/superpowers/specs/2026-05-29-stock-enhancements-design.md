# TeknikalID — Stock Page Enhancement Design

## Context

TeknikalID currently provides basic technical analysis (RSI, MACD, Bollinger Bands, SMA) for IDX40 stocks with candlestick charts. Research across TradingView, Stockbit, and academic literature on Southeast Asian markets shows significant gaps in the platform. Retail traders on IDX need more indicators, signal overlays, fundamental data, and a technical screener to discover stocks by technical conditions.

This spec covers 4 phases of enhancements to the stock ticker pages.

---

## Phase 1: More Indicators + Support/Resistance + Signals

### 1.1 New Technical Indicators

Add to `StockIndicator` model (prisma/schema.prisma):

```
stochK    Decimal? @db.Decimal(8, 2)   // Stochastic %K
stochD    Decimal? @db.Decimal(8, 2)   // Stochastic %D
adx       Decimal? @db.Decimal(8, 2)   // Average Directional Index
vwap      Decimal? @db.Decimal(12, 2)  // Volume Weighted Average Price
atr       Decimal? @db.Decimal(12, 2)  // Average True Range
```

Add to `src/lib/indicators.ts`:

- `calculateStochastic(closes, highs, lows, period=14, signalPeriod=3)` → `{ k: (number|null)[], d: (number|null)[] }`
- `calculateADX(highs, lows, closes, period=14)` → `(number|null)[]`
- `calculateVWAP(closes, volumes, highs, lows)` → `(number|null)[]`
- `calculateATR(highs, lows, closes, period=14)` → `(number|null)[]`

**Key change**: Current `calculateIndicatorsForStock()` in `src/services/technical-analysis.service.ts` only passes `closes[]` to indicator functions. Must also extract and pass `highs[]`, `lows[]`, `volumes[]` arrays from `StockPrice` records.

Update `src/app/api/stocks/[ticker]/indicators/route.ts` to include new indicators in API response.

Update indicator display in `src/components/stock/indicator-panel.tsx`:
- Stochastic: %K/%D values with crossover highlight
- ADX: value with trend strength label (Weak < 20, Strong > 25, Very Strong > 50)
- VWAP: single value with price position indicator (above/below)
- ATR: value with volatility context

### 1.2 Support/Resistance Levels

Calculated on-the-fly from price data (not stored in DB):

In `src/lib/indicators.ts`:
- `calculatePivotPoints(high, low, close)` → `{ pivot, s1, s2, r1, r2 }`
- `calculateNearestSR(prices, currentPrice)` → `{ support: number, resistance: number }`

Display on chart (`src/components/chart/chart-section.tsx`):
- Horizontal dashed lines for nearest S1/R1
- Light green (#4ade80 at 30% opacity) for support
- Light red (#f87171 at 30% opacity) for resistance

Display in indicator panel:
- Current price position vs nearest S/R

### 1.3 MA Crossover Signals

Store latest crossover event per stock. Add to `StockIndicator` model:

```
smaCrossSignal  String?  @db.VarChar(20)   // "golden_cross" | "death_cross" | null
smaCrossDate    DateTime? @db.Date          // when the crossover happened
emaCrossSignal  String?  @db.VarChar(20)   // "bullish" | "bearish" | null
emaCrossDate    DateTime? @db.Date
```

Detection logic in indicator recalculation:
- Compare SMA50 and SMA200 for current vs previous day
- If prev SMA50 < prev SMA200 AND curr SMA50 >= curr SMA200 → golden_cross
- If prev SMA50 > prev SMA200 AND curr SMA50 <= curr SMA200 → death_cross
- Same logic for EMA12/EMA26

Display:
- Badge near stock price: "Golden Cross detected 5 days ago" or "Death Cross detected 3 days ago"
- Triangle markers on chart at crossover date points

### 1.4 Technical Outlook Badge

Calculated on-the-fly (not stored). Logic:

- **Bullish**: RSI < 70 AND MACD histogram > 0 AND price > SMA50
- **Bearish**: RSI > 30 AND MACD histogram < 0 AND price < SMA50
- **Neutral**: everything else

Display as a colored pill badge next to the stock price:
- Bullish: green background
- Bearish: red background
- Neutral: gray background

### Files to modify:
- `prisma/schema.prisma` — add 7 new columns to StockIndicator
- `src/lib/indicators.ts` — add 6 new calculation functions
- `src/lib/serialize.ts` — update serializeIndicator for new fields
- `src/services/technical-analysis.service.ts` — pass highs/lows/volumes, call new calculations
- `src/app/api/stocks/[ticker]/indicators/route.ts` — include new indicators
- `src/components/stock/indicator-panel.tsx` — display new indicators
- `src/components/chart/chart-section.tsx` — S/R lines + crossover markers
- `src/app/stocks/[ticker]/page.tsx` — add outlook badge, S/R data
- `scripts/recalculate-indicators.ts` — recalculate with new indicators

---

## Phase 2: Fundamental Data from Yahoo Finance

### 2.1 Extend Yahoo Finance Wrapper

In `src/lib/yahoo-finance.ts`, extend `fetchQuote()` return type to include:
- `marketCap` (number | null)
- `trailingPE` (number | null)
- `forwardPE` (number | null)
- `priceToBook` (number | null)
- `trailingEps` (number | null)
- `dividendYield` (number | null, as percentage)
- `averageDailyVolume3Month` (number | null)

Cache in existing `CachedApiCall` table with 24-hour key. No new DB model needed.

### 2.2 Fundamental Data Component

Create `src/components/stock/fundamental-data.tsx`:
- Server component, fetches via cached Yahoo Finance call
- Collapsible section below Key Statistics
- Grid layout:
  - Market Cap | P/E (TTM)
  - Forward P/E | P/B Ratio
  - EPS (TTM) | Dividend Yield
  - Avg Volume | (reserved)

### 2.3 Update Stock Page

In `src/app/stocks/[ticker]/page.tsx`:
- Import and render `<FundamentalData ticker={ticker} />` below Key Statistics
- Fetch in parallel with existing data (Promise.all)

### Files to modify:
- `src/lib/yahoo-finance.ts` — extract fundamental fields from quote
- `src/components/stock/fundamental-data.tsx` — new component
- `src/app/stocks/[ticker]/page.tsx` — add fundamental section

---

## Phase 3: Technical Screener

### 3.1 Preset Filters

Create `src/app/screener/page.tsx` — server component with preset filter buttons.

Presets and their Prisma query logic:

| Preset | Query |
|--------|-------|
| RSI Oversold | `StockIndicator.rsi14 < 30` |
| RSI Overbought | `StockIndicator.rsi14 > 70` |
| Volume Spike | Raw SQL: compare latest volume vs 20-day AVG(volume) from StockPrice (Prisma doesn't support window functions, use `$queryRaw`) |
| Golden Cross | `StockIndicator.smaCrossSignal = "golden_cross"` |
| Death Cross | `StockIndicator.smaCrossSignal = "death_cross"` |
| MACD Bullish | `StockIndicator.macdHist > 0` |
| Above SMA 200 | `StockPrice.close > StockIndicator.sma200` |
| Below SMA 200 | `StockPrice.close < StockIndicator.sma200` |
| Bollinger Squeeze | `(StockIndicator.bbUpper - StockIndicator.bbLower) / StockIndicator.bbMiddle < 0.05` |

### 3.2 Screener API

Create `src/app/api/screener/route.ts`:
- GET with `?preset=rsi_oversold` query param
- Returns array of matching stocks with ticker, name, sector, price, change, indicator values
- Reuse serialization from stocks API

### 3.3 Screener Results Display

Reuse `StockTable` component from stocks page with adjusted columns:
- Ticker, Name, Sector, Price, Change, relevant indicator column (varies by preset)

Add "Screener" link to header navigation.

### Files to create:
- `src/app/screener/page.tsx`
- `src/app/api/screener/route.ts`

### Files to modify:
- `src/components/layout/header.tsx` — add Screener nav link

---

## Phase 4: Chart Enhancements

### 4.1 Additional Chart Overlays

In `src/components/chart/chart-section.tsx`:
- Add EMA 12/26 overlay toggles
- Add VWAP overlay toggle
- Add SMA 200 overlay toggle (currently only SMA 20/50)

### 4.2 Signal Markers

On the candlestick chart:
- Triangle up (green) at golden cross / bullish EMA crossover dates
- Triangle down (red) at death cross / bearish EMA crossover dates
- Use Lightweight Charts `markers` API

### 4.3 IHSG Comparison (Future)

Normalize stock and IHSG to percentage change from start of selected range. Display as secondary line. Requires fetching IHSG data from Yahoo Finance (^JKSE ticker).

### Files to modify:
- `src/components/chart/chart-section.tsx` — overlays + markers
- `src/app/api/stocks/[ticker]/history/route.ts` — include EMA/VWAP in response

---

## Execution Order

1. Phase 1 (indicators + S/R + signals) — DB migration + recalc required
2. Phase 2 (fundamentals) — independent, Yahoo Finance extension
3. Phase 3 (screener) — depends on Phase 1 indicator data
4. Phase 4 (chart enhancements) — depends on Phase 1 signals

Phases 1 and 2 can partially overlap (different data sources).

---

## Verification

1. Run `npx prisma migrate dev` — new columns added
2. Run recalculate-indicators script — new indicator values populated
3. Visit `/stocks/BBCA.JK` — see Stochastic, ADX, VWAP, ATR in indicator panel
4. See S/R lines on chart
5. See Technical Outlook badge (Bullish/Bearish/Neutral)
6. See MA crossover signals if applicable
7. See Fundamental data section with P/E, market cap, etc.
8. Visit `/screener` — click "RSI Oversold" preset — see matching stocks
9. Chart shows signal markers at crossover dates
