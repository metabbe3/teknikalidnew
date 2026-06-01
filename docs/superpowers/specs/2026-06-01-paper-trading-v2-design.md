# Paper Trading V2 — Top-Up, Bid/Ask Spread, Stock Page Integration

## Context

Paper trading V1 is live with market/limit/stop orders, trade journal, and a dashboard page. Three gaps:
1. Users can't add more saldo after initial balance runs low
2. Yahoo Finance doesn't provide bid/ask data for IDX stocks — all trades execute at mid price with no spread cost
3. No visibility into paper positions from stock detail pages — user must navigate away to `/paper-trading`

## 1. Top-Up Saldo

### API
- `PATCH /api/paper-trading/account` — existing endpoint, extend with `{ action: "topup", amount: number }`
  - Amount must be one of: 10,000,000 / 50,000,000 / 100,000,000
  - Adds to `balance`, does NOT change `initialBalance` (so P&L tracking stays accurate)

### Service
- `paperTradingService.topUp(userId, amount)` — validates amount, adds to balance

### Repository
- `paperTradingRepository.addBalance(accountId, amount)` — `balance = balance + amount`

### UI
- "Top Up" button in `AccountSummary` card → bottom sheet with 3 preset amounts (10jt, 50jt, 100jt)
- Uses `useTopUp()` mutation hook

## 2. Bid/Ask Spread Simulation (Dynamic from Volume)

### Spread Calculation

Defined in `src/components/paper-trading/constants.ts` (shared, client-safe):

```
getSpreadBps(fundamental: { averageDailyVolume3Month: bigint | null; isGorengan: boolean }): number
```

| Condition | Spread (bps) | Spread % |
|-----------|-------------|----------|
| isGorengan = true | 100 | 1.00% |
| avg volume < 1M shares | 50 | 0.50% |
| avg volume 1M–5M | 25 | 0.25% |
| avg volume > 5M | 10 | 0.10% |

### Execution Price

When executing a market order:
- **BUY**: `ask = midPrice × (1 + spreadBps / 10000)`
- **SELL**: `bid = midPrice × (1 - spreadBps / 10000)`

The spread is applied in the service layer (`executeMarketOrder`). Limit/stop orders use the user's target price directly — no spread applied.

### Data Source

Spread calculation uses `StockFundamental.averageDailyVolume3Month` (already in DB, updated by daily cron) and `StockIndicator.isGorengan` (already calculated).

The service fetches the latest fundamental data for the stock to determine spread. Falls back to 0.25% if no fundamental data exists.

### Display

In the trade modal:
- Show "Harga Beli" (ask) and "Harga Jual" (bid) next to the market price
- Show "Spread: 0.25%" as a small badge
- Estimated total uses the ask/bid price, not mid price

In the position card:
- Show "Spread cost: Rp X" (the spread paid on entry)

### Where Spread is Applied

Only in `paperTradingService.executeMarketOrder()`:
- BUY market orders: user pays ask price
- SELL market orders: user receives bid price
- Limit/stop orders: NO spread (user sets their own price)

## 3. Inline Position Card on Stock Pages

### API
- `GET /api/paper-trading/positions/[ticker]` — returns user's open position for a specific stock, or null
  - Includes: entry price, quantity, lots, unrealized P&L, current price, SL/TP, spread cost

### Service
- `paperTradingService.getStockPosition(userId, ticker)` — fetches position + live price

### Component: `StockPaperPosition`

Rendered on `/stocks/[ticker]` page, below the stock header area.

**Has position:**
```
┌─────────────────────────────────────────┐
│ 📊 Simulasi Anda                        │
│ 5 lot × Rp 9.850  →  Rp 10.150         │
│ P&L: +Rp 150.000 (+1.52%)  [Jual] [+]  │
│ SL: Rp 9.500  TP: Rp 10.500   [Atur]   │
└─────────────────────────────────────────┘
```

**No position:**
```
┌─────────────────────────────────────────┐
│ Belum ada posisi simulasi  [Mulai Simulasi] │
└─────────────────────────────────────────┘
```

Quick action buttons:
- "Jual" → opens trade modal pre-filled with SELL
- "+" → opens trade modal pre-filled with BUY (add to position)
- "Atur" → inline SL/TP editor
- "Mulai Simulasi" → opens trade modal with BUY

### Server Component vs Client Component

The stock detail page is a server component. The position card needs live data and interactivity.

Approach: Render a client component `StockPaperPosition` that fetches its own data via the hook. Pass `ticker` as prop. The component handles loading/empty/logged-out states internally.

### Files to Modify

- `src/app/(public)/stocks/[ticker]/page.tsx` — add `<StockPaperPosition ticker={ticker} />` below stock header
- `src/domains/paper-trading/paper-trading.service.ts` — add `topUp()`, `getStockPosition()`, spread calculation
- `src/domains/paper-trading/paper-trading.repository.ts` — add `addBalance()`
- `src/app/api/paper-trading/account/route.ts` — extend PATCH for top-up
- `src/app/api/paper-trading/positions/[ticker]/route.ts` — new GET endpoint
- `src/hooks/use-paper-trading.ts` — add `useTopUp()`, `useStockPosition(ticker)`
- `src/components/paper-trading/constants.ts` — add `getSpreadBps()`
- `src/components/paper-trading/trade-modal.tsx` — show bid/ask prices, spread badge
- `src/components/paper-trading/account-summary.tsx` — add top-up button
- New: `src/components/paper-trading/stock-paper-position.tsx`
- New: `src/components/paper-trading/topup-modal.tsx`

## Verification

1. Top up 50jt → balance increases, initialBalance unchanged, P&L still correct
2. Buy BBCA (liquid) → spread ~0.10%, ask price shown in modal
3. Buy small-cap stock → spread ~0.50%, higher cost visible
4. Buy gorengan stock → spread 1.00%, clear warning
5. Stock detail page shows position card with P&L when user has open position
6. Stock detail page shows "Mulai Simulasi" when no position
7. `npm run build` passes
