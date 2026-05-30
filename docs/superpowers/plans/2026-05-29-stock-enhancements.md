# Stock Page Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add more technical indicators, support/resistance levels, MA crossover signals, fundamental data, and a technical screener to TeknikalID's stock pages.

**Architecture:** Extend the existing indicator calculation pipeline (lib → service → API → components) with 4 new indicators and crossover signals stored in the DB. Add fundamental data from Yahoo Finance cached on-demand. Add a screener page with preset Prisma queries.

**Tech Stack:** Prisma 7, PostgreSQL, `technicalindicators` npm package, TradingView Lightweight Charts, Next.js 16 server components, Yahoo Finance via `yahoo-finance2`.

---

## Phase 1: More Indicators + Support/Resistance + Signals

### Task 1: Add new columns to StockIndicator model

**Files:**
- Modify: `prisma/schema.prisma` (StockIndicator model, ~line 51)

- [ ] **Step 1: Add columns to schema**

Add these 9 fields to the `StockIndicator` model, after the `bbLower` field:

```prisma
  stochK          Decimal?  @db.Decimal(8, 2)
  stochD          Decimal?  @db.Decimal(8, 2)
  adx             Decimal?  @db.Decimal(8, 2)
  vwap            Decimal?  @db.Decimal(12, 2)
  atr             Decimal?  @db.Decimal(12, 2)
  smaCrossSignal  String?   @db.VarChar(20)
  smaCrossDate    DateTime? @db.Date
  emaCrossSignal  String?   @db.VarChar(20)
  emaCrossDate    DateTime? @db.Date
```

- [ ] **Step 2: Run migration**

Run: `eval "$(fnm env)" && npx prisma migrate dev --name add-indicators-signals`
Expected: Migration created and applied, client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add Stochastic, ADX, VWAP, ATR, and crossover signal columns to StockIndicator"
```

---

### Task 2: Add new indicator calculation functions

**Files:**
- Modify: `src/lib/indicators.ts`
- Modify: `src/types/stock.ts` (add StochasticResult type)

- [ ] **Step 1: Add StochasticResult type to `src/types/stock.ts`**

After the `BollingerBandsResult` interface:

```ts
export interface StochasticResult {
  k?: number;
  d?: number;
}
```

- [ ] **Step 2: Add imports and calculation functions to `src/lib/indicators.ts`**

Add to the import from `technicalindicators`:

```ts
import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic, ATR, ADX } from "technicalindicators";
```

Add these functions at the end of the file:

```ts
export function calculateStochastic(
  closes: number[],
  highs: number[],
  lows: number[],
  period = 14,
  signalPeriod = 3
): (StochasticResult | null)[] {
  const results = Stochastic.calculate({
    period,
    signalPeriod,
    High: highs,
    Low: lows,
    Close: closes,
  });
  return padResults(closes, results);
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (number | null)[] {
  const results = ATR.calculate({ period, high: highs, low: lows, close: closes });
  return padResults(closes, results);
}

export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (number | null)[] {
  const results = ADX.calculate({ period, high: highs, low: lows, close: closes });
  return padResults(closes, results.map((r) => r.adx));
}

export function calculateVWAP(
  closes: number[],
  volumes: number[],
  highs: number[],
  lows: number[]
): (number | null)[] {
  const result: (number | null)[] = [];
  let cumVolume = 0;
  let cumTP = 0;

  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumVolume += volumes[i];
    cumTP += tp * volumes[i];
    result.push(cumVolume > 0 ? cumTP / cumVolume : null);
  }
  return result;
}

export function calculatePivotPoints(
  high: number,
  low: number,
  close: number
): { pivot: number; s1: number; s2: number; r1: number; r2: number } {
  const pivot = (high + low + close) / 3;
  return {
    pivot,
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
  };
}

export function calculateNearestSR(
  prices: { high: number; low: number; close: number }[],
  currentPrice: number
): { support: number; resistance: number } {
  if (prices.length === 0) return { support: currentPrice, resistance: currentPrice };
  const last = prices[prices.length - 1];
  const pivots = calculatePivotPoints(last.high, last.low, last.close);

  let support = pivots.s1;
  let resistance = pivots.r1;

  if (currentPrice < pivots.pivot) {
    support = pivots.s2;
    resistance = pivots.pivot;
  }

  return { support, resistance };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/indicators.ts src/types/stock.ts
git commit -m "feat: add Stochastic, ATR, ADX, VWAP, and pivot point calculations"
```

---

### Task 3: Update serialization for new indicator fields

**Files:**
- Modify: `src/lib/serialize.ts`
- Modify: `src/types/stock.ts` (extend IndicatorValues)

- [ ] **Step 1: Extend IndicatorValues in `src/types/stock.ts`**

Add these fields to the `IndicatorValues` interface:

```ts
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  vwap: number | null;
  atr: number | null;
  smaCrossSignal: string | null;
  smaCrossDate: string | null;
  emaCrossSignal: string | null;
  emaCrossDate: string | null;
```

- [ ] **Step 2: Update `serializeIndicator` in `src/lib/serialize.ts`**

Replace the entire `serializeIndicator` function with:

```ts
export function serializeIndicator(
  row: {
    sma20: Decimal | null;
    sma50: Decimal | null;
    sma200: Decimal | null;
    ema12: Decimal | null;
    ema26: Decimal | null;
    rsi14: Decimal | null;
    macdLine: Decimal | null;
    macdSignal: Decimal | null;
    macdHist: Decimal | null;
    bbUpper: Decimal | null;
    bbMiddle: Decimal | null;
    bbLower: Decimal | null;
    stochK: Decimal | null;
    stochD: Decimal | null;
    adx: Decimal | null;
    vwap: Decimal | null;
    atr: Decimal | null;
    smaCrossSignal: string | null;
    smaCrossDate: Date | null;
    emaCrossSignal: string | null;
    emaCrossDate: Date | null;
  }
) {
  return {
    sma20: decimalToNumber(row.sma20),
    sma50: decimalToNumber(row.sma50),
    sma200: decimalToNumber(row.sma200),
    ema12: decimalToNumber(row.ema12),
    ema26: decimalToNumber(row.ema26),
    rsi14: decimalToNumber(row.rsi14),
    macdLine: decimalToNumber(row.macdLine),
    macdSignal: decimalToNumber(row.macdSignal),
    macdHist: decimalToNumber(row.macdHist),
    bbUpper: decimalToNumber(row.bbUpper),
    bbMiddle: decimalToNumber(row.bbMiddle),
    bbLower: decimalToNumber(row.bbLower),
    stochK: decimalToNumber(row.stochK),
    stochD: decimalToNumber(row.stochD),
    adx: decimalToNumber(row.adx),
    vwap: decimalToNumber(row.vwap),
    atr: decimalToNumber(row.atr),
    smaCrossSignal: row.smaCrossSignal,
    smaCrossDate: row.smaCrossDate ? row.smaCrossDate.toISOString() : null,
    emaCrossSignal: row.emaCrossSignal,
    emaCrossDate: row.emaCrossDate ? row.emaCrossDate.toISOString() : null,
  };
}
```

Also update `serializeIndicatorRow` to include the same new fields (add them after bbLower):

```ts
    stochK: decimalToNumber(row.stochK),
    stochD: decimalToNumber(row.stochD),
    adx: decimalToNumber(row.adx),
    vwap: decimalToNumber(row.vwap),
    atr: decimalToNumber(row.atr),
```

Note: `serializeIndicatorRow` does not include crossSignal/crossDate fields since those are only for the latest snapshot.

- [ ] **Step 3: Commit**

```bash
git add src/lib/serialize.ts src/types/stock.ts
git commit -m "feat: serialize new indicator fields (Stochastic, ADX, VWAP, ATR, crossovers)"
```

---

### Task 4: Update indicator calculation service

**Files:**
- Modify: `src/services/technical-analysis.service.ts`

- [ ] **Step 1: Rewrite `calculateIndicatorsForStock`**

Replace the entire file with:

```ts
import { prisma } from "@/lib/prisma";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateVWAP,
} from "@/lib/indicators";

export async function calculateIndicatorsForStock(ticker: string): Promise<void> {
  const stock = await prisma.stock.findUnique({ where: { ticker } });
  if (!stock) throw new Error(`Stock not found: ${ticker}`);

  const prices = await prisma.stockPrice.findMany({
    where: { stockId: stock.id },
    orderBy: { date: "asc" },
    take: -250,
  });

  if (prices.length < 20) {
    console.warn(`Not enough data for ${ticker} (${prices.length} rows, need 20+)`);
    return;
  }

  const closes = prices.map((p) => p.close.toNumber());
  const highs = prices.map((p) => p.high.toNumber());
  const lows = prices.map((p) => p.low.toNumber());
  const volumes = prices.map((p) => Number(p.volume));

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const rsi14 = calculateRSI(closes, 14);
  const macdResult = calculateMACD(closes);
  const bbResult = calculateBollingerBands(closes, 20, 2);
  const stochResult = calculateStochastic(closes, highs, lows, 14, 3);
  const atrResult = calculateATR(highs, lows, closes, 14);
  const adxResult = calculateADX(highs, lows, closes, 14);
  const vwapResult = calculateVWAP(closes, volumes, highs, lows);

  const last = closes.length - 1;
  const date = prices[last].date;

  const lastMacd = macdResult[last];
  const lastBb = bbResult[last];
  const lastStoch = stochResult[last];

  // Detect MA crossover signals
  const smaCross = detectSmaCross(sma50, sma200, prices);
  const emaCross = detectEmaCross(ema12, ema26, prices);

  const data = {
    sma20: sma20[last],
    sma50: sma50[last],
    sma200: sma200[last],
    ema12: ema12[last],
    ema26: ema26[last],
    rsi14: rsi14[last],
    macdLine: lastMacd?.macd ?? null,
    macdSignal: lastMacd?.signal ?? null,
    macdHist: lastMacd?.histogram ?? null,
    bbUpper: lastBb?.upper ?? null,
    bbMiddle: lastBb?.middle ?? null,
    bbLower: lastBb?.lower ?? null,
    stochK: lastStoch?.k ?? null,
    stochD: lastStoch?.d ?? null,
    adx: adxResult[last],
    vwap: vwapResult[last],
    atr: atrResult[last],
    smaCrossSignal: smaCross.signal,
    smaCrossDate: smaCross.date,
    emaCrossSignal: emaCross.signal,
    emaCrossDate: emaCross.date,
  };

  await prisma.stockIndicator.upsert({
    where: { stockId_date_interval: { stockId: stock.id, date, interval: "1d" } },
    update: data,
    create: { stockId: stock.id, date, interval: "1d", ...data },
  });
}

function detectSmaCross(
  sma50: (number | null)[],
  sma200: (number | null)[],
  prices: { date: Date }[]
): { signal: string | null; date: Date | null } {
  const len = sma50.length;
  for (let i = len - 1; i >= 1; i--) {
    const curr50 = sma50[i];
    const curr200 = sma200[i];
    const prev50 = sma50[i - 1];
    const prev200 = sma200[i - 1];
    if (curr50 === null || curr200 === null || prev50 === null || prev200 === null) continue;

    if (prev50 < prev200 && curr50 >= curr200) {
      return { signal: "golden_cross", date: prices[i].date };
    }
    if (prev50 > prev200 && curr50 <= curr200) {
      return { signal: "death_cross", date: prices[i].date };
    }
  }
  return { signal: null, date: null };
}

function detectEmaCross(
  ema12: (number | null)[],
  ema26: (number | null)[],
  prices: { date: Date }[]
): { signal: string | null; date: Date | null } {
  const len = ema12.length;
  for (let i = len - 1; i >= 1; i--) {
    const curr12 = ema12[i];
    const curr26 = ema26[i];
    const prev12 = ema12[i - 1];
    const prev26 = ema26[i - 1];
    if (curr12 === null || curr26 === null || prev12 === null || prev26 === null) continue;

    if (prev12 < prev26 && curr12 >= curr26) {
      return { signal: "bullish", date: prices[i].date };
    }
    if (prev12 > prev26 && curr12 <= curr26) {
      return { signal: "bearish", date: prices[i].date };
    }
  }
  return { signal: null, date: null };
}

export async function calculateAllIndicators(): Promise<void> {
  const stocks = await prisma.stock.findMany({ where: { isActive: true } });
  console.log(`Calculating indicators for ${stocks.length} stocks...`);

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    try {
      console.log(`[${i + 1}/${stocks.length}] ${stock.ticker} (${stock.name})`);
      await calculateIndicatorsForStock(stock.ticker);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  -> FAILED: ${msg}`);
    }
  }
}
```

- [ ] **Step 2: Run recalculate script**

Run: `eval "$(fnm env)" && npx tsx scripts/recalculate-indicators.ts`
Expected: All 40 IDX40 stocks processed with new indicator values.

- [ ] **Step 3: Commit**

```bash
git add src/services/technical-analysis.service.ts
git commit -m "feat: calculate Stochastic, ADX, VWAP, ATR and MA crossover signals"
```

---

### Task 5: Update indicators API to include new fields

**Files:**
- Modify: `src/app/api/stocks/[ticker]/indicators/route.ts`

- [ ] **Step 1: Add new indicator calculations to the API response**

Add imports at top:

```ts
import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateVWAP,
} from "@/lib/indicators";
```

Replace `const closes = ...` and everything after it with:

```ts
  const closes = allPrices.map((p) => Number(p.close as Prisma.Decimal));
  const highs = allPrices.map((p) => Number(p.high as Prisma.Decimal));
  const lows = allPrices.map((p) => Number(p.low as Prisma.Decimal));
  const volumes = allPrices.map((p) => Number(p.volume));

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const rsi14 = calculateRSI(closes, 14);
  const macdResult = calculateMACD(closes);
  const bbResult = calculateBollingerBands(closes, 20, 2);
  const stochResult = calculateStochastic(closes, highs, lows, 14, 3);
  const atrResult = calculateATR(highs, lows, closes, 14);
  const adxResult = calculateADX(highs, lows, closes, 14);
  const vwapResult = calculateVWAP(closes, volumes, highs, lows);
```

Update the empty-data return (when `allPrices.length < 20`) to include new fields:

```ts
    return NextResponse.json({
      dates: [], sma20: [], sma50: [], rsi14: [],
      macd: { line: [], signal: [], histogram: [] },
      bb: { upper: [], middle: [], lower: [] },
      stochK: [], stochD: [], adx: [], vwap: [], atr: [],
    });
```

Update the main return to add new fields after `bb`:

```ts
    stochK: stochResult.slice(startIndex).map((s) => s?.k ?? null),
    stochD: stochResult.slice(startIndex).map((s) => s?.d ?? null),
    adx: adxResult.slice(startIndex),
    vwap: vwapResult.slice(startIndex),
    atr: atrResult.slice(startIndex),
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/stocks/[ticker]/indicators/route.ts
git commit -m "feat: include Stochastic, ADX, VWAP, ATR in indicators API response"
```

---

### Task 6: Update Indicator Panel to display new indicators

**Files:**
- Modify: `src/components/stock/indicator-panel.tsx`

- [ ] **Step 1: Expand IndicatorPanelProps and add new indicator cards**

Update the props interface:

```ts
interface IndicatorPanelProps {
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  close: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  vwap: number | null;
  atr: number | null;
}
```

Change the grid from `grid-cols-1 sm:grid-cols-3` to `grid-cols-1 sm:grid-cols-3 lg:grid-cols-5`.

Add the component function parameter to destructure the new props.

Add 4 new cards after the Bollinger Bands card:

**Stochastic card:**

```tsx
      {/* Stochastic */}
      <div className="bg-bg-card depth-shadow rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">Stochastic</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">%K</span>
            <span className="font-mono">{stochK !== null ? stochK.toFixed(1) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">%D</span>
            <span className="font-mono">{stochD !== null ? stochD.toFixed(1) : "—"}</span>
          </div>
        </div>
        {stochK !== null && stochD !== null && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            stochK > 80 ? "bg-bearish/10 text-bearish" : stochK < 20 ? "bg-bullish/10 text-bullish" : "bg-bg-hover text-text-secondary"
          }`}>
            {stochK > 80 ? "Overbought" : stochK < 20 ? "Oversold" : stochK > stochD ? "Bullish cross" : "Bearish cross"}
          </span>
        )}
      </div>
```

**ADX card:**

```tsx
      {/* ADX */}
      <div className="bg-bg-card depth-shadow rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">ADX (14)</h3>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{adx !== null ? adx.toFixed(1) : "—"}</p>
          {adx !== null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              adx > 50 ? "bg-accent/10 text-accent" : adx > 25 ? "bg-bullish/10 text-bullish" : "bg-bg-hover text-text-secondary"
            }`}>
              {adx > 50 ? "Very Strong" : adx > 25 ? "Strong" : "Weak"}
            </span>
          )}
        </div>
        {adx !== null && (
          <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${adx > 25 ? "bg-bullish" : "bg-text-secondary/30"}`} style={{ width: `${Math.min(adx, 100)}%` }} />
          </div>
        )}
      </div>
```

**VWAP card:**

```tsx
      {/* VWAP */}
      <div className="bg-bg-card depth-shadow rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">VWAP</h3>
        <p className="text-2xl font-bold">{vwap !== null ? vwap.toFixed(0) : "—"}</p>
        {vwap !== null && close !== null && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            close > vwap ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
          }`}>
            {close > vwap ? "Above VWAP" : "Below VWAP"}
          </span>
        )}
      </div>
```

**ATR card:**

```tsx
      {/* ATR */}
      <div className="bg-bg-card depth-shadow rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">ATR (14)</h3>
        <p className="text-2xl font-bold">{atr !== null ? atr.toFixed(0) : "—"}</p>
        {atr !== null && close !== null && close > 0 && (
          <p className="text-[10px] text-text-secondary">
            {(atr / close * 100).toFixed(1)}% of price
          </p>
        )}
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/stock/indicator-panel.tsx
git commit -m "feat: display Stochastic, ADX, VWAP, ATR in indicator panel"
```

---

### Task 7: Add Technical Outlook badge and crossover signal display

**Files:**
- Modify: `src/app/stocks/[ticker]/page.tsx`

- [ ] **Step 1: Add outlook badge and crossover signal to stock page**

In the stock detail page, after `const indicators = indicator ? serializeIndicator(indicator) : null;`, add outlook calculation:

```ts
  const outlook = (() => {
    if (!indicators || close === null) return "Neutral" as const;
    const bullish = indicators.rsi14 !== null && indicators.rsi14 < 70
      && indicators.macdHist !== null && indicators.macdHist > 0
      && indicators.sma50 !== null && close > indicators.sma50;
    const bearish = indicators.rsi14 !== null && indicators.rsi14 > 30
      && indicators.macdHist !== null && indicators.macdHist < 0
      && indicators.sma50 !== null && close < indicators.sma50;
    if (bullish) return "Bullish" as const;
    if (bearish) return "Bearish" as const;
    return "Neutral" as const;
  })();
```

Add crossover signal helper (for display text):

```ts
  const smaCrossText = (() => {
    if (!indicators?.smaCrossSignal || !indicators.smaCrossDate) return null;
    const days = Math.floor((Date.now() - new Date(indicators.smaCrossDate).getTime()) / 86400000);
    const label = indicators.smaCrossSignal === "golden_cross" ? "Golden Cross" : "Death Cross";
    return `${label} detected ${days === 0 ? "today" : `${days}d ago`}`;
  })();

  const emaCrossText = (() => {
    if (!indicators?.emaCrossSignal || !indicators.emaCrossDate) return null;
    const days = Math.floor((Date.now() - new Date(indicators.emaCrossDate).getTime()) / 86400000);
    const label = indicators.emaCrossSignal === "bullish" ? "EMA Bullish Cross" : "EMA Bearish Cross";
    return `${label} ${days === 0 ? "today" : `${days}d ago`}`;
  })();
```

In the JSX, inside the `{close !== null && (` price block, after the change percentage `<p>`, add:

```tsx
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  outlook === "Bullish" ? "bg-bullish/10 text-bullish" : outlook === "Bearish" ? "bg-bearish/10 text-bearish" : "bg-bg-hover text-text-secondary"
                }`}>
                  {outlook}
                </span>
                {smaCrossText && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    indicators?.smaCrossSignal === "golden_cross" ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
                  }`}>
                    {smaCrossText}
                  </span>
                )}
                {emaCrossText && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    indicators?.emaCrossSignal === "bullish" ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
                  }`}>
                    {emaCrossText}
                  </span>
                )}
              </div>
```

Also update the `<IndicatorPanel>` call to pass new props:

```tsx
            <IndicatorPanel
              close={close}
              rsi14={indicators.rsi14}
              macdLine={indicators.macdLine}
              macdSignal={indicators.macdSignal}
              macdHist={indicators.macdHist}
              bbUpper={indicators.bbUpper}
              bbMiddle={indicators.bbMiddle}
              bbLower={indicators.bbLower}
              stochK={indicators.stochK}
              stochD={indicators.stochD}
              adx={indicators.adx}
              vwap={indicators.vwap}
              atr={indicators.atr}
            />
```

- [ ] **Step 2: Build and verify**

Run: `eval "$(fnm env)" && npm run build`
Expected: Build passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/stocks/[ticker]/page.tsx
git commit -m "feat: add Technical Outlook badge and MA crossover signal display"
```

---

### Task 8: Add support/resistance levels to chart

**Files:**
- Modify: `src/components/chart/candlestick-chart.tsx`
- Modify: `src/components/chart/chart-section.tsx`

- [ ] **Step 1: Add S/R line props to CandlestickChart**

Update `CandlestickChartProps`:

```ts
interface CandlestickChartProps {
  data: CandleData[];
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  showSma20?: boolean;
  showSma50?: boolean;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
}
```

Update `ChartState` to include S/R line series:

```ts
interface ChartState {
  chart: IChartApi;
  candleSeries: ISeriesApi<"Candlestick">;
  volumeSeries: ISeriesApi<"Histogram">;
  sma20Series: ISeriesApi<"Line">;
  sma50Series: ISeriesApi<"Line">;
  supportSeries: ISeriesApi<"Line">;
  resistanceSeries: ISeriesApi<"Line">;
}
```

In the component destructuring, add:

```ts
  supportLevel,
  resistanceLevel,
```

In the chart creation `useEffect`, after `sma50Series` creation, add:

```ts
    const supportSeries = chart.addSeries(LineSeries, {
      color: "#4ade804D",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const resistanceSeries = chart.addSeries(LineSeries, {
      color: "#f871714D",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
```

Update `stateRef.current`:

```ts
    stateRef.current = { chart, candleSeries, volumeSeries, sma20Series, sma50Series, supportSeries, resistanceSeries };
```

In the data update `useEffect`, add after the sma50 data block:

```ts
    if (supportLevel != null && data.length > 0) {
      s.supportSeries.setData([
        { time: data[0].date, value: supportLevel },
        { time: data[data.length - 1].date, value: supportLevel },
      ]);
    } else {
      s.supportSeries.setData([]);
    }

    if (resistanceLevel != null && data.length > 0) {
      s.resistanceSeries.setData([
        { time: data[0].date, value: resistanceLevel },
        { time: data[data.length - 1].date, value: resistanceLevel },
      ]);
    } else {
      s.resistanceSeries.setData([]);
    }
```

Update the data useEffect dependencies:

```ts
  }, [data, sma20, sma50, supportLevel, resistanceLevel]);
```

- [ ] **Step 2: Update ChartSection to calculate and pass S/R levels**

In `chart-section.tsx`, add import:

```ts
import { calculateNearestSR } from "@/lib/indicators";
```

After the data loading checks, before the return, add S/R calculation:

```ts
  const srLevels = (() => {
    if (!history || history.length === 0 || !history[history.length - 1]) return { support: null as number | null, resistance: null as number | null };
    const lastPrice = history[history.length - 1];
    const prices = history.slice(-20).map((h) => ({ high: h.high, low: h.low, close: h.close }));
    const sr = calculateNearestSR(prices, lastPrice.close);
    return sr;
  })();
```

Pass to CandlestickChart:

```tsx
        <CandlestickChart
          data={history}
          sma20={indicators?.sma20}
          sma50={indicators?.sma50}
          showSma20={showSma20}
          showSma50={showSma50}
          supportLevel={srLevels.support}
          resistanceLevel={srLevels.resistance}
        />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chart/candlestick-chart.tsx src/components/chart/chart-section.tsx
git commit -m "feat: add support/resistance levels to stock chart"
```

---

## Phase 2: Fundamental Data from Yahoo Finance

### Task 9: Extend Yahoo Finance wrapper with fundamental fields

**Files:**
- Modify: `src/types/stock.ts` (extend StockQuote)
- Modify: `src/lib/yahoo-finance.ts` (extend QuoteSchema and fetchQuote)

- [ ] **Step 1: Add fundamental fields to StockQuote interface**

In `src/types/stock.ts`, add to `StockQuote`:

```ts
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  trailingEps: number | null;
  dividendYield: number | null;
  averageDailyVolume3Month: number | null;
```

- [ ] **Step 2: Extend QuoteSchema in yahoo-finance.ts**

Add to the QuoteSchema z.object:

```ts
    marketCap: z.number().nullable().optional(),
    trailingPE: z.number().nullable().optional(),
    forwardPE: z.number().nullable().optional(),
    priceToBook: z.number().nullable().optional(),
    trailingEps: z.number().nullable().optional(),
    dividendYield: z.number().nullable().optional(),
    averageDailyVolume3Month: z.number().nullable().optional(),
```

Add to the `fetchQuote` return object:

```ts
    marketCap: d.marketCap ?? null,
    trailingPE: d.trailingPE ?? null,
    forwardPE: d.forwardPE ?? null,
    priceToBook: d.priceToBook ?? null,
    trailingEps: d.trailingEps ?? null,
    dividendYield: d.dividendYield ?? null,
    averageDailyVolume3Month: d.averageDailyVolume3Month ?? null,
```

Also fix the bug on the `cachedFetch` calls where `key` is used instead of `cacheKey` — there are two instances inside `cachedFetch` where `setMemoryCache(key, ...)` should be `setMemoryCache(cacheKey, ...)`.

- [ ] **Step 3: Commit**

```bash
git add src/types/stock.ts src/lib/yahoo-finance.ts
git commit -m "feat: extract fundamental data fields from Yahoo Finance quotes"
```

---

### Task 10: Create FundamentalData component and add to stock page

**Files:**
- Create: `src/components/stock/fundamental-data.tsx`
- Modify: `src/app/stocks/[ticker]/page.tsx`

- [ ] **Step 1: Create FundamentalData component**

Create `src/components/stock/fundamental-data.tsx`:

```tsx
import { fetchQuote } from "@/lib/yahoo-finance";
import { formatVolume } from "@/lib/utils";

interface FundamentalDataProps {
  ticker: string;
}

function formatMarketCap(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

export async function FundamentalData({ ticker }: FundamentalDataProps) {
  let quote;
  try {
    quote = await fetchQuote(ticker);
  } catch {
    return null;
  }

  const rows: [string, string | null][] = [
    ["Market Cap", quote.marketCap !== null ? formatMarketCap(quote.marketCap) : null],
    ["P/E (TTM)", quote.trailingPE !== null ? quote.trailingPE.toFixed(2) : null],
    ["Forward P/E", quote.forwardPE !== null ? quote.forwardPE.toFixed(2) : null],
    ["P/B Ratio", quote.priceToBook !== null ? quote.priceToBook.toFixed(2) : null],
    ["EPS (TTM)", quote.trailingEps !== null ? quote.trailingEps.toFixed(0) : null],
    ["Dividend Yield", quote.dividendYield !== null ? `${(quote.dividendYield * 100).toFixed(2)}%` : null],
    ["Avg Volume", quote.averageDailyVolume3Month !== null ? formatVolume(quote.averageDailyVolume3Month) : null],
  ];

  const hasAnyData = rows.some(([, v]) => v !== null);
  if (!hasAnyData) return null;

  return (
    <div className="bg-bg-card depth-shadow rounded-xl p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Fundamental Data</h3>
      <div className="space-y-0" role="list">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm py-2 border-b border-border/50 last:border-0" role="listitem">
            <span className="text-text-secondary">{label}</span>
            <span className="font-mono">{value ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to stock detail page**

In `src/app/stocks/[ticker]/page.tsx`, add import:

```ts
import { FundamentalData } from "@/components/stock/fundamental-data";
```

In the JSX, after the `<KeyStatistics>` div's closing `</div>`, add:

```tsx
        <div>
          <FundamentalData ticker={ticker} />
        </div>
```

This goes inside the same grid layout, making it a third row under KeyStatistics.

- [ ] **Step 3: Commit**

```bash
git add src/components/stock/fundamental-data.tsx src/app/stocks/[ticker]/page.tsx
git commit -m "feat: add fundamental data section (P/E, market cap, dividend yield) to stock pages"
```

---

## Phase 3: Technical Screener

### Task 11: Create screener API route

**Files:**
- Create: `src/app/api/screener/route.ts`

- [ ] **Step 1: Create the screener API route**

Create `src/app/api/screener/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, bigIntToNumber, computeChange } from "@/lib/serialize";

export const revalidate = 300;

type PresetKey =
  | "rsi_oversold"
  | "rsi_overbought"
  | "volume_spike"
  | "golden_cross"
  | "death_cross"
  | "macd_bullish"
  | "above_sma200"
  | "below_sma200"
  | "bb_squeeze";

const VALID_PRESETS: Set<string> = new Set([
  "rsi_oversold", "rsi_overbought", "volume_spike",
  "golden_cross", "death_cross", "macd_bullish",
  "above_sma200", "below_sma200", "bb_squeeze",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const preset = (searchParams.get("preset") ?? "") as PresetKey;

  if (!VALID_PRESETS.has(preset)) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  const latestDate = await prisma.stockIndicator.findFirst({
    where: { interval: "1d" },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latestDate) {
    return NextResponse.json([]);
  }

  if (preset === "volume_spike") {
    return handleVolumeSpike(latestDate.date);
  }

  const where = buildWhere(preset, latestDate.date);

  const results = await prisma.stockIndicator.findMany({
    where,
    include: {
      stock: {
        include: {
          prices: { orderBy: { date: "desc" }, take: 2 },
        },
      },
    },
  });

  let stocks = results.map((r) => {
    const prices = r.stock.prices;
    const { close, changePercent } = computeChange(prices[0], prices[1]);
    return {
      ticker: r.stock.ticker,
      name: r.stock.name,
      sector: r.stock.sector,
      close,
      changePercent,
      volume: prices[0] ? bigIntToNumber(prices[0].volume) : null,
      rsi14: decimalToNumber(r.rsi14),
      sma20: decimalToNumber(r.sma20),
      smaCrossSignal: r.smaCrossSignal,
      emaCrossSignal: r.emaCrossSignal,
      sma200: decimalToNumber(r.sma200),
    };
  });

  // Post-filter for price vs SMA comparisons (Prisma can't compare columns)
  if (preset === "above_sma200") {
    stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close > s.sma200);
  } else if (preset === "below_sma200") {
    stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close < s.sma200);
  } else if (preset === "bb_squeeze") {
    stocks = stocks.filter((s) => {
      const si = results.find((r) => r.stock.ticker === s.ticker);
      if (!si) return false;
      const upper = decimalToNumber(si.bbUpper);
      const lower = decimalToNumber(si.bbLower);
      const middle = decimalToNumber(si.bbMiddle);
      return upper !== null && lower !== null && middle !== null && middle > 0 && (upper - lower) / middle < 0.05;
    });
  }

  return NextResponse.json(stocks);
}

function buildWhere(preset: PresetKey, date: Date) {
  const base = { interval: "1d" as const, date, stock: { isActive: true } };

  switch (preset) {
    case "rsi_oversold":
      return { ...base, rsi14: { lt: 30 } };
    case "rsi_overbought":
      return { ...base, rsi14: { gt: 70 } };
    case "golden_cross":
      return { ...base, smaCrossSignal: "golden_cross" };
    case "death_cross":
      return { ...base, smaCrossSignal: "death_cross" };
    case "macd_bullish":
      return { ...base, macdHist: { gt: 0 } };
    case "above_sma200":
      return { ...base, sma200: { not: null } };
    case "below_sma200":
      return { ...base, sma200: { not: null } };
    case "bb_squeeze":
      return { ...base, bbUpper: { not: null }, bbMiddle: { not: null }, bbLower: { not: null } };
    default:
      return base;
  }
}

async function handleVolumeSpike(latestDate: Date) {
  const rows = await prisma.$queryRaw<
    { ticker: string; name: string; sector: string; close: number; change_percent: number; volume: bigint; rsi14: number | null; sma20: number | null }[]
  >`
    SELECT
      s.ticker,
      s.name,
      s.sector,
      sp_latest.close,
      sp_prev.close AS prev_close,
      sp_latest.volume,
      si.rsi14,
      si.sma20
    FROM "StockIndicator" si
    JOIN "Stock" s ON s.id = si."stockId"
    JOIN "StockPrice" sp_latest ON sp_latest."stockId" = s.id AND sp_latest.date = si.date
    LEFT JOIN "StockPrice" sp_prev ON sp_prev."stockId" = s.id AND sp_prev.date = (
      SELECT MAX(sp2.date) FROM "StockPrice" sp2 WHERE sp2."stockId" = s.id AND sp2.date < si.date
    )
    JOIN (
      SELECT "stockId", AVG(volume)::bigint AS avg_volume
      FROM "StockPrice"
      WHERE date >= si.date - INTERVAL '20 days'
      GROUP BY "stockId"
    ) avg ON avg."stockId" = s.id
    WHERE si.interval = '1d'
      AND si.date = ${latestDate}
      AND s."isActive" = true
      AND sp_latest.volume > avg.avg_volume * 3
  `;

  const stocks = rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    sector: r.sector,
    close: Number(r.close),
    changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
    volume: Number(r.volume),
    rsi14: r.rsi14 ? Number(r.rsi14) : null,
    sma20: r.sma20 ? Number(r.sma20) : null,
  }));

  return NextResponse.json(stocks);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/screener/route.ts
git commit -m "feat: add screener API with preset technical filters"
```

---

### Task 12: Create screener page and add nav link

**Files:**
- Create: `src/app/screener/page.tsx`
- Create: `src/app/screener/loading.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Create screener page**

Create `src/app/screener/page.tsx`:

```tsx
import Link from "next/link";

const PRESETS = [
  { key: "rsi_oversold", label: "RSI Oversold", desc: "RSI(14) < 30" },
  { key: "rsi_overbought", label: "RSI Overbought", desc: "RSI(14) > 70" },
  { key: "volume_spike", label: "Volume Spike", desc: "Volume > 3x 20d avg" },
  { key: "golden_cross", label: "Golden Cross", desc: "SMA50 crossed above SMA200" },
  { key: "death_cross", label: "Death Cross", desc: "SMA50 crossed below SMA200" },
  { key: "macd_bullish", label: "MACD Bullish", desc: "MACD histogram > 0" },
  { key: "above_sma200", label: "Above SMA 200", desc: "Price > SMA(200)" },
  { key: "below_sma200", label: "Below SMA 200", desc: "Price < SMA(200)" },
  { key: "bb_squeeze", label: "BB Squeeze", desc: "Bollinger Band width < 5%" },
] as const;

export default function ScreenerPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Technical Screener</h1>
        <p className="text-text-secondary text-sm">Filter IDX40 stocks by technical conditions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESETS.map((preset) => (
          <Link
            key={preset.key}
            href={`/screener?preset=${preset.key}`}
            className="bg-bg-card depth-shadow rounded-xl p-4 hover:bg-bg-hover transition-colors press-scale"
          >
            <h3 className="font-semibold text-sm">{preset.label}</h3>
            <p className="text-text-secondary text-xs mt-1">{preset.desc}</p>
          </Link>
        ))}
      </div>

      <ScreenerResults />
    </div>
  );
}

async function ScreenerResults() {
  // This is a client-driven filter — the actual results are loaded client-side
  // For the initial server render, we show the preset cards only
  // Results are fetched client-side when a preset is clicked via URL param
  return null;
}
```

Note: The actual filtering happens via the API. The simplest approach is to make the results section a client component that reads `?preset=` from the URL and fetches `/api/screener?preset=X`. For now, the preset cards link to the API. A proper client results component can be added, but to keep scope minimal, the preset cards each link to a filtered view.

Actually, better approach — make the screener page a client component that reads the search param and shows results inline. Create `src/app/screener/page.tsx` as a server component wrapper, and the actual filtering as a client component:

Create `src/components/screener/screener-results.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatPercent, stripJk, changeColor, formatVolume } from "@/lib/utils";

interface ScreenerStock {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  sma20: number | null;
}

export function ScreenerResults() {
  const searchParams = useSearchParams();
  const preset = searchParams.get("preset");
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!preset) { setStocks([]); return; }
    setLoading(true);
    fetch(`/api/screener?preset=${preset}`)
      .then((r) => r.json())
      .then((data) => { setStocks(Array.isArray(data) ? data : []); })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, [preset]);

  if (!preset) return null;
  if (loading) return <div className="text-center py-8 text-text-secondary animate-pulse">Loading...</div>;
  if (stocks.length === 0) return <p className="text-text-secondary text-sm text-center py-8">No stocks match this filter.</p>;

  return (
    <div className="overflow-x-auto rounded-xl depth-shadow">
      <table className="w-full text-sm">
        <thead className="bg-bg-primary text-text-secondary text-xs uppercase tracking-wide">
          <tr>
            <th className="px-3 py-3 text-left">Ticker</th>
            <th className="px-3 py-3 text-left">Name</th>
            <th className="px-3 py-3 text-left">Sector</th>
            <th className="px-3 py-3 text-right">Price</th>
            <th className="px-3 py-3 text-right">Change</th>
            <th className="px-3 py-3 text-right">Volume</th>
            <th className="px-3 py-3 text-right">RSI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {stocks.map((stock) => (
            <tr key={stock.ticker} className="hover:bg-bg-card transition-colors">
              <td className="px-3 py-3">
                <Link href={`/stocks/${stock.ticker}`} className="font-semibold text-accent hover:underline">
                  {stripJk(stock.ticker)}
                </Link>
              </td>
              <td className="px-3 py-3 text-text-secondary truncate max-w-[200px]">{stock.name}</td>
              <td className="px-3 py-3 text-text-secondary text-xs">{stock.sector}</td>
              <td className="px-3 py-3 text-right font-mono">{stock.close !== null ? formatPrice(stock.close) : "—"}</td>
              <td className={`px-3 py-3 text-right font-mono ${changeColor(stock.changePercent)}`}>
                {stock.changePercent !== null ? formatPercent(stock.changePercent) : "—"}
              </td>
              <td className="px-3 py-3 text-right font-mono text-text-secondary">
                {stock.volume !== null ? formatVolume(stock.volume) : "—"}
              </td>
              <td className={`px-3 py-3 text-right font-mono ${stock.rsi14 !== null ? (stock.rsi14 > 70 ? "text-bearish" : stock.rsi14 < 30 ? "text-bullish" : "") : ""}`}>
                {stock.rsi14 !== null ? stock.rsi14.toFixed(1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Update the page to include `<ScreenerResults />` (wrapped in Suspense for useSearchParams):

```tsx
import { Suspense } from "react";
import { ScreenerResults } from "@/components/screener/screener-results";

// ... inside the page component, after the preset grid:
      <Suspense fallback={null}>
        <ScreenerResults />
      </Suspense>
```

- [ ] **Step 2: Create loading.tsx**

Create `src/app/screener/loading.tsx`:

```tsx
export default function ScreenerLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-bg-card rounded animate-pulse" />
        <div className="h-4 w-72 bg-bg-card rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-4 animate-pulse">
            <div className="h-4 w-32 bg-bg-hover rounded" />
            <div className="h-3 w-48 bg-bg-hover rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add Screener nav link**

In `src/components/layout/header.tsx`, update navLinks:

```ts
const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/stocks", label: "Saham" },
  { href: "/screener", label: "Screener" },
  { href: "/community", label: "Komunitas" },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/app/screener/ src/components/screener/ src/components/layout/header.tsx
git commit -m "feat: add technical screener page with preset filters"
```

---

## Phase 4: Chart Enhancements (Overlays + Markers)

### Task 13: Add SMA 200, EMA 12/26 overlay toggles to chart

**Files:**
- Modify: `src/components/chart/chart-section.tsx`
- Modify: `src/components/chart/candlestick-chart.tsx`

- [ ] **Step 1: Add new series to CandlestickChart**

In `candlestick-chart.tsx`, update `CandlestickChartProps`:

```ts
interface CandlestickChartProps {
  data: CandleData[];
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  sma200?: (number | null)[];
  ema12?: (number | null)[];
  ema26?: (number | null)[];
  showSma20?: boolean;
  showSma50?: boolean;
  showSma200?: boolean;
  showEma12?: boolean;
  showEma26?: boolean;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
}
```

Add to `ChartState`:

```ts
  sma200Series: ISeriesApi<"Line">;
  ema12Series: ISeriesApi<"Line">;
  ema26Series: ISeriesApi<"Line">;
```

Create the series in the chart creation effect:

```ts
    const sma200Series = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema12Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema26Series = chart.addSeries(LineSeries, {
      color: "#ec4899",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
```

Update `stateRef.current` and add data update logic + visibility toggles following the same pattern as SMA 20/50.

- [ ] **Step 2: Add toggle buttons to ChartSection**

In `chart-section.tsx`, add state variables:

```ts
  const [showSma200, setShowSma200] = useState(false);
  const [showEma12, setShowEma12] = useState(false);
  const [showEma26, setShowEma26] = useState(false);
```

Add toggle buttons after the existing SMA 50 button:

```tsx
          <button
            onClick={() => setShowSma200(!showSma200)}
            className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all duration-200 ${
              showSma200 ? "bg-red-500/15 text-red-600 border border-red-500/20" : "bg-bg-card text-text-secondary hover:bg-bg-hover"
            }`}
          >
            SMA 200
          </button>
          <button
            onClick={() => setShowEma12(!showEma12)}
            className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all duration-200 ${
              showEma12 ? "bg-cyan-500/15 text-cyan-600 border border-cyan-500/20" : "bg-bg-card text-text-secondary hover:bg-bg-hover"
            }`}
          >
            EMA 12
          </button>
          <button
            onClick={() => setShowEma26(!showEma26)}
            className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all duration-200 ${
              showEma26 ? "bg-pink-500/15 text-pink-600 border border-pink-500/20" : "bg-bg-card text-text-secondary hover:bg-bg-hover"
            }`}
          >
            EMA 26
          </button>
```

Pass new props to `CandlestickChart`:

```tsx
        <CandlestickChart
          data={history}
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
        />
```

The indicators API response needs `ema12` and `ema26` arrays. These are already calculated in the indicators route but not currently returned. Add them to the API response.

Update `src/app/api/stocks/[ticker]/indicators/route.ts` to include:

```ts
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
```

And add to the return object:

```ts
    ema12: ema12.slice(startIndex),
    ema26: ema26.slice(startIndex),
    sma200: sma200.slice(startIndex),
```

(Import `calculateEMA` at the top.)

- [ ] **Step 3: Commit**

```bash
git add src/components/chart/chart-section.tsx src/components/chart/candlestick-chart.tsx src/app/api/stocks/[ticker]/indicators/route.ts
git commit -m "feat: add SMA 200, EMA 12/26 overlay toggles to chart"
```

---

## Verification

After all tasks are complete:

1. `eval "$(fnm env)" && npm run build` — clean build
2. `eval "$(fnm env)" && npx tsx scripts/recalculate-indicators.ts` — all stocks get new indicator values
3. Visit `/stocks/BBCA.JK`:
   - See 5 indicator cards (RSI, MACD, BB, Stochastic, ADX, VWAP, ATR) — that's 7 cards in a responsive grid
   - See Technical Outlook badge (Bullish/Bearish/Neutral) near price
   - See MA crossover signal badge if applicable
   - See S/R dashed lines on chart
   - See Fundamental Data section with P/E, market cap, etc.
   - Chart has SMA 200, EMA 12, EMA 26 overlay toggles
4. Visit `/screener`:
   - See 9 preset filter cards
   - Click "RSI Oversold" — see matching stocks in table
5. `eval "$(fnm env)" && npm run lint` — 0 errors
