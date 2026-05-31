# Technical Signal Summary + Gorengan Detection & Post CRUD

**Date:** 2026-05-31
**Status:** Draft

---

## Feature 1: Technical Signal Summary

### Context

Each stock already has 12+ technical indicators with "positif/negatif/netral" translations (`src/lib/indicator-translations.ts`). But there's no unified signal — users must interpret each indicator individually. This feature aggregates all indicators into a single "Sinyal Teknikal" score displayed across the site.

**OJK compliance:** Labeled as "Sinyal Teknikal" (Technical Signal) with disclaimer "Bukan rekomendasi investasi". Uses "Bullish/Bearish/Netral" — never "Beli/Jual".

### Signal Scoring Logic

**Inputs** — existing translations from `indicator-translations.ts`:

| Category | Indicators | Weight |
|----------|-----------|--------|
| Trend (40%) | SMA position (20/50/200), EMA crossover, Supertrend, ADX | 10% each |
| Momentum (35%) | RSI, MACD histogram, Stochastic %K/%D | ~12% each |
| Volume (25%) | OBV trend, price vs VWAP | 12.5% each |

**Scoring:**
- Each indicator contributes: +1 (positif), 0 (netral), -1 (negatif)
- Multiply by weight, sum to get raw score (-1 to +1)
- Map to labels:

| Score Range | Label | Color |
|-------------|-------|-------|
| +0.60 to +1.00 | Strong Bullish | Green |
| +0.20 to +0.59 | Bullish | Light green |
| -0.19 to +0.19 | Netral | Gray |
| -0.59 to -0.20 | Bearish | Light red |
| -1.00 to -0.60 | Strong Bearish | Red |

**Implementation:** Add `signalScore` (Decimal 5,2) and `signalLabel` (String) fields to `StockIndicator` model. Compute during daily indicator recalculation in `recalculate-indicators.ts` script. Also add a `computeSignalScore()` function in `technical-analysis.service.ts`.

### Gorengan Detection

**Criteria** (stock flagged if 2+ are true):
- Volume > 5x 20-day average
- Daily price swing (high-low)/close > 15%
- Market cap < 1T IDR (use existing company data)
- Price deviates > 40% from SMA200

**Storage:** Add `isGorengan` (Boolean, default false) to `StockIndicator`. Computed daily alongside signal score.

**Display:** Orange warning badge "Gorengan" on stock cards and detail page. Suppress or de-emphasize signal score for gorengan stocks.

### Display Locations

1. **Stock detail page** (`/stocks/[ticker]`) — Full signal panel with per-indicator breakdown and overall score
2. **Screener & stock cards** — Small colored badge (e.g., "Bullish" pill) next to ticker
3. **Stock list cards** (community, articles) — Compact signal pill

### Disclaimer

Every display of the signal includes: "Sinyal teknikal berdasarkan indikator. Bukan rekomendasi investasi."

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `signalScore`, `signalLabel`, `isGorengan` to StockIndicator |
| `src/domains/stock/technical-analysis.service.ts` | Add `computeSignalScore()` and `detectGorengan()` |
| `scripts/recalculate-indicators.ts` | Call signal score computation after indicator update |
| `src/app/(public)/stocks/[ticker]/page.tsx` | Add signal summary section |
| `src/components/stock/indicator-panel.tsx` | Add overall signal badge |
| `src/components/stock/stock-card.tsx` or equivalent | Add signal pill badge |
| `src/app/(public)/screener/page.tsx` | Show signal column/filter |

### Data Flow

```
Daily cron (recalculate-indicators.ts)
  → Compute indicators (existing)
  → Compute signalScore via translations aggregation (new)
  → Compute isGorengan via criteria check (new)
  → Save to StockIndicator row

Stock detail page
  → Read StockIndicator (including signalScore, signalLabel, isGorengan)
  → Display signal panel with breakdown

Screener / Stock cards
  → Include signalLabel in API response
  → Render colored badge
```

---

## Feature 2: Delete & Edit Post

### Context

Posts currently support Create and Read but not Delete or Edit. Comments already have full delete support (author + admin). This adds symmetric functionality for posts.

### Authorization

- **Delete post:** Author can delete own post. Admins can delete any post.
- **Edit post:** Author can edit own post only. Admins can edit any post.
- Same pattern as existing `deleteComment()` in `community.service.ts`.

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| DELETE | `/api/posts/[id]` | Delete post + all comments/likes/bookmarks |
| PATCH | `/api/posts/[id]` | Edit post content |

### Service Methods

Add to `community.service.ts`:
- `deletePost(postId, userId, userRole)` — authorization check, then delete
- `updatePost(postId, userId, userRole, content)` — authorization check, validate content, update

### Repository Methods

Add to `community.repository.ts`:
- `deletePost(postId)` — cascade delete comments, likes, bookmarks via Prisma transaction
- `updatePost(postId, content)` — update content and updatedAt

### UI Changes

- **Post card** (`post-card.tsx`) — Add "..." menu with Edit and Delete options (visible to author + admin)
- **Post detail page** — Same menu options
- Confirm dialog before delete

### Files to Modify

| File | Change |
|------|--------|
| `src/app/api/posts/[id]/route.ts` | Add DELETE and PATCH handlers |
| `src/domains/community/community.service.ts` | Add `deletePost()`, `updatePost()` |
| `src/domains/community/community.repository.ts` | Add `deletePost()`, `updatePost()` |
| `src/domains/community/community.errors.ts` | Add `NotAuthorizedError` if not exists |
| `src/components/community/post-card.tsx` | Add edit/delete menu |
| `src/components/community/post-menu.tsx` | New: dropdown menu component |

---

## Verification

### Signal Summary
1. Run `recalculate-indicators.ts` — verify `signalScore` and `isGorengan` populated for all stocks
2. Open a stock detail page — verify signal panel shows with correct label and per-indicator breakdown
3. Open screener — verify signal badge column appears with correct colors
4. Check a known gorengan stock — verify warning badge appears

### Post CRUD
1. Create a post as user A
2. Verify user A sees edit/delete menu on their post
3. Verify user B does NOT see edit/delete on user A's post
4. Edit the post — verify content updates
5. Delete the post — verify it disappears and comments/likes are cleaned up
6. As admin, verify edit/delete works on any post
