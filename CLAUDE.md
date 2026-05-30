# TeknikalID

IDX (Indonesia Stock Exchange) technical analysis platform. Covers IDX40 (top LQ45 constituents) with professional charts, technical indicators, community discussions, and market data.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, React 19)
- **Database**: PostgreSQL 16 + Prisma 7 ORM
- **Auth**: NextAuth v5 (beta) with Google OAuth + Credentials, JWT strategy
- **Data source**: Yahoo Finance via `yahoo-finance2` (unofficial, ~5-10 min delay)
- **Charts**: TradingView `lightweight-charts` v5 (dynamic import, `ssr: false`)
- **Technical indicators**: `technicalindicators` (RSI, MACD, SMA, EMA, Bollinger Bands, Stochastic, ADX, ATR)
- **Styling**: Tailwind CSS 4
- **Validation**: Zod
- **Data fetching**: TanStack React Query v5
- **Monitoring**: Sentry
- **Deployment**: Docker (self-hosted, standalone Next.js output)

---

## Architecture: Domain-Driven Design

We follow **Domain-Driven Design (DDD)** within a modular monolith. Every feature belongs to a bounded context (domain) with a strict layered architecture.

### Layered Architecture

```
Controller (API Route)  →  Service (Business Logic)  →  Repository (Prisma Calls)
```

**Controllers** (`src/app/api/`) — Only handle HTTP. Parse request body/params, call the domain service, return JSON. No business logic, no Prisma calls.

**Services** (`src/domains/*/service.ts`) — Contain 100% of business logic: validation, authorization checks, cross-domain coordination, event emission. Services call repositories for data access and other services for cross-domain needs.

**Repositories** (`src/domains/*/repository.ts`) — Contain 100% of Prisma/database calls. Accept and return raw Prisma types. No validation, no business logic.

### Boundary Rules

1. **A repository may only query models owned by its domain.** Never import or query another domain's Prisma models from a repository.
2. **Cross-domain data access goes through Service-to-Service calls.** If Domain A needs Domain B's data, Domain A's service calls Domain B's service method — never Domain B's repository.
3. **Prisma `include` relations** for read-only data hydration (e.g., `include: { author }` on a Post query) are acceptable — they're standard Prisma patterns and the alternative is N+1 service calls.
4. **Atomic side effects** (e.g., reputation increment inside a follow transaction) are acceptable in repositories when splitting them would break data consistency. Document with `// Side effect: ...` comments.

### Event-Driven Communication

For decoupled cross-domain actions (notifications, reputation), use the typed event bus at `src/lib/event-bus.ts`:

```ts
// Emit from a service:
eventBus.emit("community:post-liked", { postId, userId, authorId });

// Subscribe in a service's initialization:
eventBus.on("community:post-liked", async (payload) => { ... });
```

Events are fire-and-forget (non-blocking). Subscribers catch their own errors. For actions that must be atomic with the triggering operation (e.g., notification creation inside a comment transaction), use inline Prisma calls within the repository transaction instead of events.

### Shared Infrastructure

| File | Purpose |
|------|---------|
| `src/lib/domain-error.ts` | Base `DomainError` class with `statusCode`. All domain errors extend this. |
| `src/lib/api-error.ts` | `handleApiError(error, context)` — single check for `instanceof DomainError` covers all domains. |
| `src/lib/prisma.ts` | Prisma singleton client. All repositories import from here. |
| `src/lib/event-bus.ts` | Typed `EventEmitter` with `EventMap` for cross-domain events. |
| `src/lib/auth.ts` | NextAuth config. Exports `auth`, `handlers`, `signIn`, `signOut`. |
| `src/lib/constants.ts` | IDX40 tickers, sectors, `SITE_URL`, shared enums. |
| `src/lib/utils.ts` | Formatting utilities (numbers, dates). |

### Error Handling Pattern

Each domain defines its own errors extending `DomainError`:

```ts
// src/domains/[domain]/[domain].errors.ts
import { DomainError } from "@/lib/domain-error";
export class SomethingNotFoundError extends DomainError {
  constructor() { super("Not found", 404); }
}
```

API routes use a single pattern:

```ts
try {
  const result = await someService.method(params);
  return NextResponse.json({ data: result });
} catch (error) {
  return handleApiError(error, "descriptive action");
}
```

---

## Domain Map

| # | Domain | Directory | Owned Models | Key Responsibilities |
|---|--------|-----------|-------------|---------------------|
| 1 | **Auth & Identity** | `src/domains/auth/` | User, Account, Session, VerificationToken | Registration, login, profile management, session handling |
| 2 | **Stock Market Data** | `src/domains/stock/` | Stock, StockPrice, StockIndicator | Price data, technical indicators, market overview, backfill scripts |
| 3 | **Community Platform** | `src/domains/community/` | Post, Comment, Like, Bookmark | Posts, comments, likes, bookmarks, feed, stock discussions |
| 4 | **Social Graph** | `src/domains/social/` | Follow, StockFollow | User follows, stock follows, following filters |
| 5 | **Notification System** | `src/domains/notification/` | Notification | Notification CRUD, read/unread, batch creation, event subscriptions |
| 6 | **Reputation & Leaderboard** | `src/domains/reputation/` | (User.reputation field, CachedApiCall) | Badges, weekly leaderboard, daily reward claims |
| 7 | **Content Safety & Admin (Moderation)** | `src/domains/moderation/` | Report | Content reports, admin review, moderation actions |
| 8 | **Watchlist** | `src/domains/watchlist/` | Watchlist | Personal stock watchlists with market data hydration |

### Domain File Structure

Every domain follows the same pattern:

```
src/domains/[domain]/
├── [domain].errors.ts        ← DomainError subclasses
├── [domain].repository.ts    ← Prisma calls only
└── [domain].service.ts       ← Business logic
```

Some domains have additional files:
- `auth/` — no separate errors file (errors defined in `auth.errors.ts`)
- `stock/` — two services: `stock-market.service.ts` + `technical-analysis.service.ts`
- `social/` — files named `social-graph.*` instead of `social.*`
- `reputation/` — `badge.ts` (shared client-safe constants, no Prisma imports)

---

## New Feature Protocol

Before writing any code for a new feature or request, answer these questions:

### 1. Which domain does this belong to?

- If it fits an existing domain, add logic to that domain's Service and Repository. Do not bypass the layers.
- If it crosses domains, determine which Service coordinates the flow, or use the event bus.

### 2. Does it need a new domain?

If the request introduces a completely new bounded context (e.g., "Billing & Subscriptions", "Portfolio Tracker"), create a new directory:

```
src/domains/[new-domain]/
├── [new-domain].errors.ts
├── [new-domain].repository.ts
├── [new-domain].service.ts
```

Then create the API route as a thin controller calling the new service. Never shoehorn unrelated logic into an existing domain.

### 3. Where does the data live?

- Identify which Prisma models are involved
- If you need data from another domain, call that domain's service — not its repository, not direct Prisma queries
- If you need to react to events from another domain, subscribe via `eventBus`

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API endpoints (thin controllers)
│   │   ├── stocks/               # Stock list, detail, history, indicators, comments
│   │   ├── market/               # Market overview
│   │   ├── posts/                # Community posts CRUD, likes
│   │   ├── comments/             # Comments CRUD
│   │   ├── bookmarks/            # Bookmarks CRUD
│   │   ├── notifications/        # Notifications CRUD
│   │   ├── reputation/           # Reputation + daily claim
│   │   ├── leaderboard/          # Weekly leaderboard
│   │   ├── reports/              # Content reports (admin)
│   │   ├── watchlist/            # Personal watchlist
│   │   └── follow/               # User/stock follows
│   ├── stocks/                   # Stock pages (screener + detail)
│   ├── community/                # Community pages
│   ├── auth/                     # Auth pages (signin, register)
│   └── profile/                  # User profile pages
├── domains/                      # Domain-Driven Design modules
│   ├── auth/                     # Auth & Identity
│   ├── stock/                    # Stock Market Data
│   ├── community/                # Community Platform
│   ├── social/                   # Social Graph
│   ├── notification/             # Notification System
│   ├── reputation/               # Reputation & Leaderboard
│   ├── moderation/               # Content Safety & Admin
│   └── watchlist/                # Watchlist
├── components/
│   ├── ui/                       # Shared UI primitives
│   ├── layout/                   # Header, footer, nav
│   ├── stock/                    # Stock-specific components
│   ├── chart/                    # TradingView chart components
│   └── community/                # Community components (reputation badge, etc.)
├── lib/                          # Shared infrastructure (no business logic)
│   ├── prisma.ts                 # Prisma singleton
│   ├── auth.ts                   # NextAuth config
│   ├── domain-error.ts           # Base DomainError class
│   ├── api-error.ts              # handleApiError utility
│   ├── event-bus.ts              # Typed EventEmitter for cross-domain events
│   ├── constants.ts              # IDX40 tickers, sectors, SITE_URL
│   ├── yahoo-finance.ts          # Yahoo Finance wrapper with rate limiting
│   ├── indicators.ts             # Technical indicator calculations
│   ├── serialize.ts              # Decimal/BigInt serialization
│   └── utils.ts                  # Formatting utilities
├── hooks/                        # React Query hooks
├── types/                        # TypeScript type definitions
└── generated/                    # Prisma generated client
    └── prisma/                   # Auto-generated, do not edit
```

---

## Database Models

**Stock Market**: Stock, StockPrice, StockIndicator, CachedApiCall
**Auth**: User (includes `reputation`, `role`, `bannedAt`), Account, Session, VerificationToken
**Community**: Post, Comment, Like, Bookmark
**Social**: Follow, StockFollow
**Notification**: Notification (enum type: LIKE, COMMENT, MENTION, FOLLOW, STOCK_POST)
**Moderation**: Report (enum target: POST/COMMENT, enum reason: SPAM/ABUSE/MISINFORMATION/OTHER, enum status: PENDING/REVIEWED/DISMISSED)

Enums: `Role` (USER, ADMIN), `NotificationType`, `ReportTarget`, `ReportReason`, `ReportStatus`

---

## Key Constraints

- **Prisma Decimal**: All financial values use `Decimal` type. Import as `Prisma.Decimal` from `@/generated/prisma/client`. Use `decimalToNumber()` from `src/lib/serialize.ts` for serialization.
- **Prisma BigInt**: Volume uses `BigInt`. Use `bigIntToNumber()` from `src/lib/serialize.ts`.
- **Prisma client output**: Generated to `src/generated/prisma/` — import types from `@/generated/prisma/client`.
- **Yahoo Finance**: Unofficial API. Rate limit with `p-limit` (1 concurrent), retry with backoff on 429. Intraday data only for last 60 days.
- **Technical indicators**: Need 200+ data points for SMA200. Backfill at least 1 year.
- **Next.js 16 proxy**: Uses `proxy.ts` (not `middleware.ts`) — exported function must be named `proxy`.
- **lightweight-charts**: Must be dynamically imported with `ssr: false` (browser-only API).
- **NextAuth v5**: Config in `src/lib/auth.ts`. Session strategy is JWT. Custom `createUser` adapter assigns random username.
- **Node via fnm**: If `npm`/`node` not found, prefix with `export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH"`.

---

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npx prisma studio    # Database browser
npx prisma migrate dev --name <name>  # Create migration
npx prisma db seed   # Seed IDX40 stock list
```

## Docker

Env vars for production: `DATABASE_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

```bash
docker compose up -d       # Start app + PostgreSQL
docker compose logs -f app  # Follow app logs
```

Runs `prisma migrate deploy` on startup. Uses standalone Next.js output. PostgreSQL data persists in `pgdata` volume.

## Scripts

- `scripts/backfill-historical.ts` — one-time load of 1-2 years daily data
- `scripts/update-prices.ts` — daily cron to fetch latest prices
- `scripts/recalculate-indicators.ts` — daily cron to update indicator values

Run with: `npx tsx scripts/<script>.ts`
