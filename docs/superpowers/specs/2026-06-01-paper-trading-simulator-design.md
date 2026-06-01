# Paper Trading Simulator — Design Spec

## Context

TeknikalID is an IDX stock analysis platform. Users currently track real portfolios and discuss stocks in community. But new traders are afraid to lose real money, and old traders want to test strategies risk-free. A paper trading simulator gives both groups a safe space to practice, log their trades with reasons, and build discipline — all powered by the existing real-time price data and technical indicators.

**Goal**: Ship a core paper trading simulator where users can trade stocks with virtual money, log their reasoning per trade, and track their performance over time. No real money involved.

## Scope: V1 (Core Simulator)

**In scope:**
- Virtual accounts with user-chosen starting balance
- Market, limit, and stop-loss orders
- Trade journal (reason, strategy tags, mood)
- Open positions with live P&L
- Trade history with win/loss tracking
- Private by default, optional share on profile
- "Paper Trade" button on stock detail pages

**Out of scope (future iterations):**
- AI-powered trade feedback / suggestions
- Public leaderboards / challenges
- Advanced analytics (Sharpe ratio, drawdown)
- Tax simulation
- Social sharing of individual trades

## Architecture

New DDD domain: `src/domains/paper-trading/`

Reuses existing infrastructure:
- Yahoo Finance price data (`src/lib/yahoo-finance.ts`)
- Technical indicators (`src/lib/indicators.ts`)
- Stock model and stock repository (`src/domains/stock/`)

Does NOT depend on the portfolio domain — completely separate.

```
Controller (API Route)  →  Service (paper-trading.service)  →  Repository (paper-trading.repository)
```

## Data Model

### PaperAccount

One per user. Created on first visit to paper trading page.

```prisma
model PaperAccount {
  id              String   @id @default(cuid())
  userId          String   @unique
  balance         Decimal  @db.Decimal(16, 2)   // Current cash
  initialBalance  Decimal  @db.Decimal(16, 2)   // Starting amount
  isPublic        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  positions  PaperPosition[]
  orders     PaperOrder[]

  @@index([userId])
}
```

### PaperPosition

Tracks open and closed positions.

```prisma
model PaperPosition {
  id              String   @id @default(cuid())
  accountId       String
  stockTicker     String
  side            PaperTradeSide   @default(BUY)
  entryPrice      Decimal  @db.Decimal(12, 2)
  quantity        Int
  status          PaperPositionStatus @default(OPEN)

  // Risk management
  stopLossPrice   Decimal? @db.Decimal(12, 2)
  takeProfitPrice Decimal? @db.Decimal(12, 2)

  // Journal
  reason          String?  @db.VarChar(500)
  strategyTags    Json?    // ["breakout", "support_bounce", "earnings_play"]
  mood            PaperMood?

  // Close tracking
  closePrice      Decimal? @db.Decimal(12, 2)
  realizedPnl     Decimal? @db.Decimal(16, 2)
  realizedPnlPct  Decimal? @db.Decimal(8, 2)

  openedAt        DateTime @default(now())
  closedAt        DateTime?

  account         PaperAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  stock           Stock        @relation(fields: [stockTicker], references: [ticker], onDelete: Cascade)

  @@index([accountId])
  @@index([stockTicker])
  @@index([status])
}
```

### PaperOrder

Pending limit/stop orders waiting to be filled.

```prisma
model PaperOrder {
  id           String          @id @default(cuid())
  accountId    String
  stockTicker  String
  side         PaperTradeSide
  orderType    PaperOrderType
  quantity     Int
  targetPrice  Decimal         @db.Decimal(12, 2)
  status       PaperOrderStatus @default(PENDING)

  // For STOP SELL orders: which position to close
  positionId   String?

  // Journal (copied from order time)
  reason       String?         @db.VarChar(500)
  strategyTags Json?
  mood         PaperMood?

  filledAt     DateTime?
  filledPrice  Decimal?        @db.Decimal(12, 2)

  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  account      PaperAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  stock        Stock        @relation(fields: [stockTicker], references: [ticker], onDelete: Cascade)

  @@index([accountId])
  @@index([status])
  @@index([stockTicker, status])
}
```

### Enums

```prisma
enum PaperTradeSide { BUY SELL }
enum PaperPositionStatus { OPEN CLOSED }
enum PaperOrderType { MARKET LIMIT STOP }
enum PaperOrderStatus { PENDING FILLED CANCELLED }
enum PaperMood { CONFIDENT UNCERTAIN GREEDY FEARFUL NEUTRAL }
```

## API Endpoints

### Account
- `POST /api/paper-trading/account` — Create account with chosen starting balance (10jt/50jt/100jt)
- `GET /api/paper-trading/account` — Get account summary (balance, P&L, position count)

### Orders
- `POST /api/paper-trading/orders` — Place order (market/limit/stop)
- `GET /api/paper-trading/orders` — List pending orders
- `DELETE /api/paper-trading/orders/[id]` — Cancel pending order

### Positions
- `GET /api/paper-trading/positions` — List open positions with live P&L
- `POST /api/paper-trading/positions/[id]/close` — Close a position (market sell)
- `PATCH /api/paper-trading/positions/[id]` — Update stop-loss/take-profit

### History
- `GET /api/paper-trading/history` — Closed positions (trade history)

### Settings
- `PATCH /api/paper-trading/account` — Toggle isPublic

## Trade Execution Logic

### Market Orders (instant)
1. User submits market order (side, ticker, quantity, journal fields)
2. Service fetches current price via `yahooFinance.fetchQuote(ticker)`
3. Validates: sufficient balance (BUY) or sufficient position (SELL)
4. For BUY: creates `PaperPosition(OPEN)`, deducts from account balance
5. For SELL: closes position, adds proceeds to balance, records realizedPnl

### Limit Orders (deferred)
1. User submits limit order with targetPrice
2. **Balance lock**: for BUY limit orders, the estimated cost (targetPrice × quantity × 100) is locked — deducted from available balance but tracked separately
3. Creates `PaperOrder(PENDING)`
4. **Order check**: runs when user visits paper trading page or via periodic check
   - For BUY limit: fills if current price <= targetPrice
   - For SELL limit: fills if current price >= targetPrice (requires `positionId`)
5. On fill: creates `PaperPosition(OPEN)`, updates order status, unlocks any excess balance

### Stop-Loss Orders (deferred)
Two distinct mechanisms:

**A. Position-level stop-loss/take-profit** (most common):
1. User sets `stopLossPrice` or `takeProfitPrice` on existing position
2. Stored on `PaperPosition.stopLossPrice` / `takeProfitPrice`
3. **Position check**: runs alongside order check
   - Stop-loss triggers if current price <= stopLossPrice
   - Take-profit triggers if current price >= takeProfitPrice
   - Auto-closes position at current price, records realizedPnl

**B. Stop orders for new entries** (advanced):
1. User submits `PaperOrder` with `orderType: STOP` and a targetPrice
2. For BUY STOP: fills when price rises to targetPrice (breakout entry)
3. For SELL STOP: requires `positionId`, fills when price drops to targetPrice (protective stop)

### Take-Profit Orders (deferred)
Same as position-level take-profit above — set `takeProfitPrice` on a position, checked alongside stop-loss.

## UI Pages

### `/paper-trading` — Main Dashboard
- Account summary card: balance, total value (balance + positions), total P&L, P&L%
- Open positions table/cards with live P&L, RSI, MACD badges
- Pending orders list with cancel button
- "Beli Saham" button opens trade modal
- Tab: Open Positions | Pending Orders | Trade History

### Trade Modal
- Stock search autocomplete (reuse IDX_STOCKS)
- Side toggle: Beli / Jual
- Order type: Market / Limit / Stop
- Quantity input (lots, with ×100 share conversion)
- Price input (for limit/stop orders, auto-filled for market)
- Estimated total calculation
- Journal section:
  - Reason (textarea, 500 chars)
  - Strategy tags (multi-select chips: Breakout, Support Bounce, FOMO, Earnings, Trend Following, Mean Reversion, Scalping, Swing)
  - Mood (5 icons: Confident, Uncertain, Greedy, Fearful, Neutral)

### Position Detail (expandable)
- Entry info: price, quantity, date, reason, tags, mood
- Current: price, unrealized P&L, RSI, MACD at entry vs now
- Stop-loss / take-profit levels with visual indicator
- Close button

### Stock Detail Integration
- "Paper Trade" button on `/stocks/[ticker]` pages
- Pre-fills ticker in trade modal

## Domain File Structure

```
src/domains/paper-trading/
  paper-trading.errors.ts      # InsufficientBalanceError, PositionNotFoundError, etc.
  paper-trading.repository.ts  # Prisma calls only
  paper-trading.service.ts     # Business logic (execute trade, close position, check orders)
```

## Strategy Tags

Predefined list for consistency:
- Breakout, Support Bounce, Resistance Rejection
- Trend Following, Mean Reversion, Scalping, Swing
- FOMO, Earnings Play, Dividend Play
- Technical Signal, Fundamental, News Driven

## Navigation

Add "Simulasi" link in header nav (between "Screener" and "Komunitas"), pointing to `/paper-trading`.

## Verification

1. Create account with 100jt → balance shows 100,000,000
2. Buy BBCA 10 lots at market price → position created, balance deducted
3. Set stop-loss on position → stop-loss stored
4. Sell position → realized P&L calculated, balance updated
5. Place limit order → appears in pending orders
6. Cancel pending order → order removed, balance unchanged
7. Trade history shows closed trades with journal data
8. `npm run build` passes
