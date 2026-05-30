# Retail Investor Features Design

## Context

Indonesian retail investors (20M+, mostly under 35) are mobile-first, FOMO-driven, and frequently get trapped at the top ("nyangkut"). They want instant actionable answers but need objective validation and risk management tools. This spec covers three features that bridge the gap between what they want and what they need:

- **Feature D**: "Bahasa Sederhana" — translate technical indicators into plain Indonesian
- **Feature C**: "Kalkulator Trading Plan" — auto-generated Entry/TP/SL with OJK-compliant disclaimers
- **Feature A**: "Hype Alert" — warn when a stock shows FOMO behavior (social hype OR volume surge + overbought)

All three surface on the stock detail page (`/stocks/[ticker]`). No new data sources required — everything derives from existing StockIndicator, StockPrice, and Post data.

---

## Feature D: "Bahasa Sederhana" Indicator Translation

### What

A toggle button on the indicator panel that switches between raw numeric values and plain Indonesian text explanations. Client-side only — no API changes.

### Translation Rules

All functions in `src/lib/indicator-translations.ts`. Each returns `{ short: string; explanation: string; sentiment: "positif" | "negatif" | "netral" }`.

#### RSI (14)

| Range | Short | Explanation |
|-------|-------|-------------|
| 0-20 | Sangat Jenuh Jual | "Harga sudah turun sangat dalam. Bisa rebound, tapi tetap waspada." |
| 20-30 | Jenuh Jual | "Tekanan jual mulai berlebihan. Potensi rebound mendekati." |
| 30-45 | Netral Cenderung Lemah | "Momentum belum kuat, tapi pergerakan masih sehat." |
| 45-55 | Netral | "Pergerakan harga seimbang, tidak ada tekanan berlebih." |
| 55-70 | Netral Cenderung Kuat | "Momentum positif, pergerakan masih sehat." |
| 70-80 | Jenuh Beli | "Tekanan beli tinggi. Peluang koreksi mulai mengintai." |
| 80-100 | Sangat Jenuh Beli | "Risiko koreksi tinggi. Pertimbangkan untuk mengunci profit." |

#### MACD

| Condition | Short | Explanation |
|-----------|-------|-------------|
| Histogram > 0 | Momentum Naik | "Tekanan beli semakin kuat." |
| Histogram < 0 | Momentum Turun | "Tekanan jual mendominasi." |
| ~0 (near zero) | Momentum Netral | "Belum ada arah jelas." |

#### Stochastic (%K/%D)

| Condition | Short | Explanation |
|-----------|-------|-------------|
| %K > 80 | Jenuh Beli | "Harga di zona tertinggi. Risiko koreksi." |
| %K < 20 | Jenuh Jual | "Harga di zona terendah. Potensi rebound." |
| %K > %D | Bullish Cross | "Momentum naik." |
| %K < %D | Bearish Cross | "Momentum turun." |
| 20-80 | Zona Netral | "Pergerakan normal." |

#### Bollinger Bands

| Position | Short | Explanation |
|----------|-------|-------------|
| > 85% | Di Atas Band | "Volatilitas tinggi, waspadai koreksi." |
| 60-85% | Mendekati Batas Atas | "Harga mendekati resistance." |
| 40-60% | Di Tengah Band | "Harga bergerak normal." |
| 15-40% | Mendekati Batas Bawah | "Harga mendekati support." |
| < 15% | Di Bawah Band | "Bisa jadi oversold atau breakdown." |

#### ADX (14)

| Range | Short | Explanation |
|-------|-------|-------------|
| 0-20 | Tren Lemah | "Belum ada arah jelas. Harga bergerak sideways." |
| 20-25 | Tren Mulai Terbentuk | "Pergerakan mulai menunjukkan arah." |
| 25-50 | Tren Kuat | "Tren sedang berlangsung. Ikuti arah tren." |
| 50+ | Tren Sangat Kuat | "Tren sangat kuat. Waspadai potensi jenuh." |

#### VWAP

| Condition | Short | Explanation |
|-----------|-------|-------------|
| Price > VWAP | Di Atas VWAP | "Sentimen positif intraday." |
| Price < VWAP | Di Bawah VWAP | "Sentimen negatif intraday." |

#### ATR (as % of price)

| Range | Short | Explanation |
|-------|-------|-------------|
| < 1% | Volatilitas Rendah | "Pergerakan harian kecil." |
| 1-3% | Volatilitas Normal | "Pergerakan harian wajar." |
| 3-5% | Volatilitas Tinggi | "Perhatikan ukuran posisi." |
| > 5% | Volatilitas Sangat Tinggi | "Ekstra hati-hati." |

#### SMA/EMA Cross Signals

| Signal | Short | Explanation |
|--------|-------|-------------|
| golden_cross | Golden Cross | "SMA 50 memotong SMA 200 ke atas — sinyal bullish jangka panjang." |
| death_cross | Death Cross | "SMA 50 memotong SMA 200 ke bawah — sinyal bearish jangka panjang." |
| ema bullish | EMA Bullish Cross | "EMA 12 memotong EMA 26 ke atas — momentum naik." |
| ema bearish | EMA Bearish Cross | "EMA 12 memotong EMA 26 ke bawah — momentum turun." |

### Component Changes

**`src/components/stock/indicator-panel.tsx`**:
- Add `"use client"` directive
- Add `const [plainMode, setPlainMode] = useState(false)`
- Add toggle button: "Bahasa Sederhana" / "Lihat Angka"
- Each IndicatorCard conditionally renders translated text or existing numeric display
- New props: `smaCrossSignal`, `emaCrossSignal` (for cross signal translations)

**`src/app/stocks/[ticker]/page.tsx`**:
- Pass `smaCrossSignal` and `emaCrossSignal` to IndicatorPanel

### Files

1. **Create**: `src/lib/indicator-translations.ts`
2. **Modify**: `src/components/stock/indicator-panel.tsx` (add client directive, toggle, translation rendering, new props)
3. **Modify**: `src/app/stocks/[ticker]/page.tsx` (pass cross signal props)

---

## Feature C: Kalkulator Trading Plan

### What

Auto-generated trading plan card showing Entry zone, TP1/TP2, Stop Loss, and Risk/Reward ratio. Derived from pivot points, SMA levels, and ATR. Pure server-side computation.

### Regulatory Compliance (OJK/BEI)

- Card title: **"Kalkulator Trading Plan"** (tool, not advice)
- Prominent disclaimer at bottom:
  > "Perhitungan ini bersifat edukatif berdasarkan indikator teknikal. Bukan rekomendasi membeli atau menjual saham. Keputusan investasi sepenuhnya menjadi tanggung jawab Anda. Selalu pertimbangkan risiko dan konsultasikan dengan pihak berlisensi."
- Source attribution: "Sumber: Pivot Points & ATR"

### Calculation Logic

Function: `generateTradingPlan()` in `src/lib/trading-plan.ts`

Input: `{ currentPrice, high, low, close, atr, rsi14, sma20, sma50, sma200 }`

1. **Pivot Points**: Call `calculatePivotPoints(high, low, close)` from `indicators.ts` → S1, S2, R1, R2
2. **Entry**:
   - RSI 30-70: "Sekitar harga saat ini" (current price)
   - RSI > 70: "Tunggu pullback ke SMA20" (use sma20 value)
   - RSI < 30: "Potensi bottom, monitor dulu"
3. **TP1**: R1. If price > R1, use R2.
4. **TP2**: R2 if price < R1 (otherwise null)
5. **SL**: S1 if above pivot. S2 if below pivot. Cross-check: SL <= entry - 2*ATR (cap width)
6. **Risk/Reward**: `(TP1 - entry) / (entry - SL)`. Flag if < 1.5
7. **Confidence**: high (RSI neutral + R:R >= 2), medium (R:R >= 1.5), low (otherwise)
8. **Warnings** (Indonesian):
   - RSI > 70: "RSI menunjukkan kondisi jenuh beli."
   - Price > BB Upper: "Harga di atas Bollinger Band atas — volatilitas tinggi."
   - R:R < 1.5: "Rasio risk/reward kurang ideal."

### Card Layout

```
+------------------------------------------+
| Kalkulator Trading Plan   [HIGH/MED/LOW] |
|           Sumber: Pivot Points & ATR     |
|------------------------------------------|
| Entry      Rp 9,450   Sekitar harga      |
| TP 1       Rp 9,800   (R1)              |
| TP 2       Rp 10,100  (R2)              |
| Stop Loss  Rp 9,200   (S1)              |
|------------------------------------------|
| Risk : Reward    1 : 2.3                 |
|------------------------------------------|
| ⚠ RSI menunjukkan kondisi jenuh beli.   |
|------------------------------------------|
| Perhitungan ini bersifat edukatif...     |
| Bukan rekomendasi membeli/menjual...     |
+------------------------------------------+
```

Colors: TP = `text-bullish`, SL = `text-bearish`, Entry = `text-accent`, Confidence = green/amber/gray

### Files

1. **Create**: `src/lib/trading-plan.ts`
2. **Create**: `src/components/stock/trading-plan-card.tsx`
3. **Modify**: `src/app/stocks/[ticker]/page.tsx` (compute + render below FundamentalData in sidebar)

---

## Feature A: Hype Alert (Sentiment + Market Activity)

### What

Warn users when a stock shows FOMO behavior. Uses a hybrid approach combining community social data with price-based market activity signals. Works even when community is small because it can trigger on volume/price patterns alone.

### Hype Detection Logic

Two independent trigger paths, either one activates the warning:

**Path 1 — Social Hype (community-driven):**
- Social score = posts*1 + totalLikes*0.5 + totalComments*1 (last 7 days)
- Score >= 10 AND (RSI > 70 OR price within 2% of R1 resistance)

**Path 2 — Market FOMO (price-driven):**
- Volume today > 2x the 20-day average volume
- Price change > +5% today
- RSI > 70

If either path triggers → show Hype Alert.

### Data Sources

- **Social**: `prisma.post.aggregate()` on `tickerTag` for last 7 days
- **Volume**: `StockPrice` latest volume vs 20-day average (query `findMany` with `take: 20`, compute avg)
- **Price change**: already computed as `changePercent` in the stock detail page
- **RSI/Resistance**: from `StockIndicator`

### UI Surfaces

**Stock detail page header** (next to outlook badge):
- Amber badge: "Hype Alert"
- Tooltip/expandable: "X post 7 hari terakhir, RSI jenuh beli. Hati-hati FOMO."
- OR: "Volume 2.5x rata-rata + naik 6.2% + RSI jenuh beli. Hati-hati FOMO."

**Screener page** (`/screener`):
- New preset: "Hype Alert — Volume tinggi + jenuh beli"
- Filters all IDX40 stocks for the hype condition
- Shows social score + volume ratio + RSI in the table

### Files

1. **Create**: `src/components/stock/hype-warning-badge.tsx`
2. **Create**: `src/app/api/stocks/[ticker]/sentiment/route.ts` (for screener/API use)
3. **Modify**: `src/app/stocks/[ticker]/page.tsx` (add 4th query to Promise.all, compute hype, render badge)
4. **Modify**: `src/app/screener/page.tsx` (add preset)
5. **Modify**: `src/app/api/screener/route.ts` (add hype_warning handler)

---

## Implementation Order

1. **Phase 1 — Feature D** (Bahasa Sederhana): Quickest. One new file, two modified files. No data flow changes.
2. **Phase 2 — Feature C** (Trading Plan): Self-contained. One new lib, one new component, one page mod.
3. **Phase 3 — Feature A** (Hype Alert): Most changes. Depends on Feature D being in place.

## Performance Notes

- Feature D: Client-side toggle only. No re-fetch.
- Feature C: Server-side pure math from data already fetched. Zero extra queries.
- Feature A: Adds one `prisma.post.aggregate()` query to existing `Promise.all`. Uses indexed columns. Cached by ISR (5 min).
- Screener hype handler: Most expensive query. Follows existing `handleVolumeSpike()` pattern with raw SQL join.
