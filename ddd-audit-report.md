# DDD Architecture Audit Report
## TeknikalID Codebase
**Date:** 2025-06-14
**Project:** /Users/nicholasandriansurjadi/Documents/teknikalidnew

---

## Executive Summary

This audit identified **8 critical DDD violations** and **1 minor issue** across the codebase. The most severe violations involve services importing repositories from other domains and repositories querying cross-domain Prisma models directly.

---

## Critical Violations

### 1. MODERATION: Service imports cross-domain repository directly
**Domain:** moderation
**Severity:** CRITICAL
**File:** `src/domains/moderation/moderation.service.ts`
**Line:** 2
**Violation:** Direct import of `communityRepository` from another domain

```typescript
import { communityRepository } from "@/domains/community/community.repository";
```

**Description:** The moderation service directly imports communityRepository, violating the rule that cross-domain access must go through Service-to-Service calls.

**Correct Approach:** Should import `communityService` instead and call its public methods.

---

### 2. MODERATION: Repository queries cross-domain Prisma models
**Domain:** moderation
**Severity:** CRITICAL
**File:** `src/domains/moderation/moderation.repository.ts`
**Lines:** 56-69
**Violation:** Repository directly queries Post, Comment, and User models from other domains

```typescript
if (params.targetType === "POST") {
  await tx.post.delete({ where: { id: params.targetId } }).catch((e: { code?: string }) => {
    if (e?.code !== "P2025") throw e;
  });
} else {
  await tx.comment.delete({ where: { id: params.targetId } }).catch((e: { code?: string }) => {
    if (e?.code !== "P2025") throw e;
  });
}

if (params.action === "ban" && params.authorId) {
  await tx.user.update({
    where: { id: params.authorId },
    data: { bannedAt: new Date() },
  });
}
```

**Description:** The moderation repository queries Post (community domain), Comment (community domain), and User (auth domain) models directly. This breaks the rule that repositories may ONLY query their own domain's Prisma models.

**Correct Approach:** Should use service calls:
- `communityService.deletePost()` or `communityService.deleteComment()`
- `authService.banUser()`

---

### 3. COMMUNITY: Service imports cross-domain repository directly
**Domain:** community
**Severity:** CRITICAL
**File:** `src/domains/community/community.service.ts`
**Line:** 4
**Violation:** Direct import of `stockRepository` from another domain

```typescript
import { stockRepository } from "@/domains/stock/stock.repository";
```

**Description:** The community service directly imports stockRepository, violating the rule that cross-domain access must go through Service-to-Service calls.

**Correct Approach:** Should import and use `stockMarketService` or other appropriate stock service interfaces.

**Usage in code:**
- Line 183: `stockRepository.findStockByTicker(data.tickerTag)`
- Line 365: `stockRepository.findStockByTicker(ticker)`
- Line 451: `stockRepository.findStockByTicker(ticker)`

---

### 4. ARTICLE: Service imports cross-domain repository directly
**Domain:** article
**Severity:** CRITICAL
**File:** `src/domains/article/article.service.ts`
**Line:** 6
**Violation:** Direct import of `stockRepository` from another domain

```typescript
import { stockRepository } from "@/domains/stock/stock.repository";
```

**Description:** The article service directly imports stockRepository, violating the rule that cross-domain access must go through Service-to-Service calls.

**Correct Approach:** Should import and use `stockMarketService`.

**Usage in code:**
- Line 17: `stockRepository.findStockByTicker(ticker)`
- Line 21: `stockRepository.findLatestPrices(stock.id, 2)`
- Line 22: `stockRepository.findLatestIndicator(stock.id, "1d")`
- Line 23: `stockRepository.findPrevIndicator(stock.id, "1d")`
- Line 24: `stockRepository.findLatestFundamental(stock.id)`
- Line 35: `stockRepository.getWeek52HighLow(stock.id)`
- Line 146: `stockRepository.findStockByTicker(ticker)`
- Line 150: `stockRepository.findLatestPrices(stock.id, 2)`
- Line 151: `stockRepository.findLatestIndicator(stock.id, "1d")`
- Line 471: `stockRepository.findStockByTicker(ticker)`
- Line 475: `stockRepository.findLatestPrices(stock.id, 30)`
- Line 476: `stockRepository.findLatestIndicator(stock.id, "1d")`
- Line 477: `stockRepository.findLatestFundamental(stock.id)`
- Line 485: `stockRepository.getWeek52HighLow(stock.id)`

---

### 5. ARTICLE: Helper imports cross-domain repository directly
**Domain:** article
**Severity:** CRITICAL
**File:** `src/domains/article/article-fact-check.ts`
**Line:** 4
**Violation:** Direct import of `stockRepository` from another domain

```typescript
import { stockRepository } from "@/domains/stock/stock.repository";
```

**Description:** The article fact-check helper directly imports stockRepository, violating DDD layering.

**Correct Approach:** Should be refactored to either:
- Use a service call through articleService
- Accept stock data as parameters instead of querying directly

**Usage in code:**
- Line 110: `stockRepository.findStocksByTickersWithIndicators(topTickers)`
- Line 138: `stockRepository.findStocksByTickersWithIndicators(relatedTickers)`

---

### 6. COMMUNITY-AGENT: Service imports cross-domain repository directly
**Domain:** community-agent
**Severity:** CRITICAL
**File:** `src/domains/community-agent/community-agent.service.ts`
**Line:** 4
**Violation:** Direct import of `stockRepository` from another domain

```typescript
import { stockRepository } from "@/domains/stock/stock.repository";
```

**Description:** The community-agent service directly imports stockRepository, violating the rule that cross-domain access must go through Service-to-Service calls.

**Correct Approach:** Should import and use `stockMarketService`.

**Usage in code:**
- Line 140: `stockRepository.findActiveStocksWithPrices()`
- Line 146: `stockRepository.findAvgVolumeByStockIds(stockIds)`
- Line 214: `stockRepository.findActiveStocksWithPrices()`
- Line 282: `stockRepository.findStockByTicker(post.tickerTag)`
- Line 359: `stockRepository.findActiveStocksWithPrices(undefined, true)`

---

### 7. AUTH: Service bypasses repository with direct Prisma calls
**Domain:** auth
**Severity:** CRITICAL
**File:** `src/domains/auth/auth.service.ts`
**Line:** 5, 115-118
**Violation:** Service imports and uses Prisma directly instead of going through repository

```typescript
import { prisma } from "@/lib/prisma";

// Line 115-118
const follows = await prisma.follow.findMany({
  where: { followerId: userId, followingId: { in: users.map((u) => u.id) } },
  select: { followingId: true },
});
```

**Description:** The auth service imports Prisma directly and queries the Follow model (social domain). This violates two rules:
1. Services should not bypass their own repository layer
2. The Follow model belongs to the social domain, not auth

**Correct Approach:** Should use `socialGraphService` to check follow status.

---

### 8. PAPER-TRADING: Service bypasses repository with direct Prisma calls
**Domain:** paper-trading
**Severity:** CRITICAL
**File:** `src/domains/paper-trading/paper-trading.service.ts`
**Line:** 5, 437-448
**Violation:** Service imports and uses Prisma directly instead of going through repository

```typescript
import { prisma } from "@/lib/prisma";

// Line 437-448
const [fundamental, indicator] = await Promise.all([
  prisma.stockFundamental.findFirst({
    where: { stock: { ticker } },
    orderBy: { date: "desc" },
    select: { averageDailyVolume3Month: true },
  }),
  prisma.stockIndicator.findFirst({
    where: { stock: { ticker }, interval: "daily" },
    orderBy: { date: "desc" },
    select: { isGorengan: true },
  }),
]);
```

**Description:** The paper-trading service imports Prisma directly and queries StockFundamental and StockIndicator models (stock domain). This violates two rules:
1. Services should not bypass their own repository layer
2. These models belong to the stock domain, not paper-trading

**Correct Approach:** Should use `stockMarketService` to get spread info.

---

## Minor Issues

### 9. COMMUNITY: Service imports Prisma directly (unused?)
**Domain:** community
**Severity:** MINOR
**File:** `src/domains/community/community.service.ts`
**Line:** 5
**Observation:** Service imports Prisma but may not be using it

```typescript
import { prisma } from "@/lib/prisma";
```

**Description:** The community service imports Prisma but a search shows it may not be directly used. This should be removed to maintain clean architecture.

**Note:** Need to verify if this is actually used anywhere in the file.

---

## Domain Layer Structure Analysis

### Domains with Complete 3-Layer Architecture (✅)

| Domain | Controller | Service | Repository | Status |
|--------|-----------|---------|------------|--------|
| auth | API routes | ✅ | ✅ | ✅ Complete |
| community | API routes | ✅ | ✅ | ✅ Complete |
| stock | API routes | ✅ | ✅ | ✅ Complete |
| article | API routes | ✅ | ✅ | ✅ Complete |
| portfolio | API routes | ✅ | ✅ | ✅ Complete |
| watchlist | API routes | ✅ | ✅ | ✅ Complete |
| notification | API routes | ✅ | ✅ | ✅ Complete |
| reputation | API routes | ✅ | ✅ | ✅ Complete |
| moderation | API routes | ✅ | ✅ | ✅ Complete |
| paper-trading | API routes | ✅ | ✅ | ✅ Complete |
| faq | API routes | ✅ | ✅ | ✅ Complete |
| image-gen | API routes | ✅ | ✅ | ✅ Complete |
| cron-monitoring | API routes | ✅ | ✅ | ✅ Complete |
| audit | API routes | ✅ | ✅ | ✅ Complete |
| social | API routes | ✅ | ✅ | ✅ Complete |
| screener | API routes | ✅ | ✅ | ✅ Complete |
| community-agent | API routes | ✅ | ✅ | ✅ Complete |
| agent-hub | API routes | ✅ | ✅ | ✅ Complete |

### Domains with Incomplete Structure (⚠️)

| Domain | Controller | Service | Repository | Status |
|--------|-----------|---------|------------|--------|
| dashboard | API routes | ✅ | ❌ | ⚠️ Missing repository |

---

## Prisma Model-to-Domain Mapping

Based on schema analysis, the proper domain assignments should be:

### Stock Domain
- Stock
- StockPrice
- StockIndicator
- StockFundamental
- StockShareholder
- StockDirector
- StockCommissioner
- StockSubsidiary
- StockDividend
- CachedApiCall

### Auth Domain
- User
- Account
- Session
- VerificationToken

### Community Domain
- Post
- PostTag
- Comment
- Like
- Bookmark
- Repost
- Reaction
- Poll
- PollOption
- PollVote
- ImageGenerationJob

### Moderation Domain
- Report

### Social Domain
- Follow
- Block
- StockFollow

### Notification Domain
- Notification

### Article Domain
- Article

### Audit Domain
- AuditLog

### Reputation Domain
- Achievement

### Paper Trading Domain
- PaperAccount
- PaperPosition
- PaperOrder

### Agent Hub Domain
- AgentJob
- AgentConfig

### Cron Monitoring Domain
- CronLog

### FAQ Domain
- Question
- QuestionFeedback

### Payment Domain (not in domain list)
- Payment

### Screener Domain
- SavedScreener
- ScreenerAlert

---

## Recommendations

### High Priority (Critical Violations)

1. **Fix Moderation Domain Cross-Domain Access**
   - Remove `communityRepository` import from `moderation.service.ts`
   - Replace with `communityService` calls
   - Refactor `moderation.repository.ts` to remove cross-domain Prisma queries
   - Use service methods for delete and ban operations

2. **Fix Community Domain Cross-Domain Access**
   - Replace `stockRepository` imports with `stockMarketService` in `community.service.ts`
   - Create necessary methods in `stockMarketService` if needed

3. **Fix Article Domain Cross-Domain Access**
   - Replace `stockRepository` imports with `stockMarketService` in both `article.service.ts` and `article-fact-check.ts`
   - Create necessary methods in `stockMarketService` if needed

4. **Fix Community-Agent Domain Cross-Domain Access**
   - Replace `stockRepository` imports with `stockMarketService` in `community-agent.service.ts`
   - Create necessary methods in `stockMarketService` if needed

5. **Fix Auth Service Direct Prisma Usage**
   - Remove `prisma` import from `auth.service.ts`
   - Replace Follow queries with `socialGraphService` calls

6. **Fix Paper-Trading Service Direct Prisma Usage**
   - Remove `prisma` import from `paper-trading.service.ts`
   - Replace stock data queries with `stockMarketService` calls

### Medium Priority

7. **Complete Dashboard Domain**
   - Create `dashboard.repository.ts` with proper repository methods
   - Move any direct Prisma queries from `dashboard.service.ts` to the repository

8. **Verify and Clean Up Imports**
   - Verify if `prisma` import in `community.service.ts` is actually used
   - Remove if unused
   - If used, refactor to use repository or service layer

### Low Priority

9. **Consider Domain Boundaries**
   - Review if `ImageGenerationJob` should be in its own domain
   - Review if `StockFollow` should be in stock or social domain (currently social)

10. **Create Domain Documentation**
    - Document the proper model-to-domain assignments
    - Add architecture guidelines for developers

---

## Impact Analysis

### Current Issues
- **Maintainability:** Cross-domain coupling makes code harder to maintain
- **Testing:** Direct repository imports make unit testing difficult
- **Flexibility:** Changes to one domain require changes across multiple domains
- **Consistency:** Inconsistent architecture patterns make onboarding difficult

### After Fixes
- **Improved Maintainability:** Clear domain boundaries reduce coupling
- **Better Testing:** Services can be mocked properly in tests
- **Greater Flexibility:** Domains can be refactored independently
- **Consistent Architecture:** Developers follow clear patterns

---

## Conclusion

The TeknikalID codebase follows DDD principles reasonably well with all 19 domains having the service layer. However, there are 8 critical violations involving cross-domain repository imports and direct Prisma usage in services that need immediate attention.

The most problematic patterns are:
1. Services importing repositories from other domains (6 occurrences)
2. Repositories querying models from other domains (1 occurrence)
3. Services using Prisma directly instead of repositories (2 occurrences)

Addressing these violations will significantly improve the codebase's maintainability, testability, and adherence to DDD principles.