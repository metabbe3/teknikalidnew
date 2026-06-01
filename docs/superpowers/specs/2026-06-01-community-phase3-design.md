# Community Phase 3 — Engagement, Social & Discovery

**Date**: 2026-06-01
**Status**: Approved

## Context

Phases 1-2 delivered posts, comments, reactions, polls, bookmarks, reposts, @mentions, $ticker tags, predictions, real-time updates, notifications, and reputation/badges. This phase focuses on filling gaps: polish (achievement toasts, streak tracking), social features (blocking, user search, threaded comments), and content discovery (pinned posts, prediction filters).

---

## Phase A — Quick Wins

### A1. Achievement unlock toast

**What**: Show a celebratory toast when a user earns a new achievement.

**How**:
- Enhance `POST /api/reputation` (daily claim) and `GET /api/achievements` responses to include `newlyUnlocked: string[]` — achievement types unlocked in this request
- Add a lightweight toast component (`achievement-toast.tsx`) that shows the achievement icon + label + "Terbuka!" text
- Trigger toast after daily claim, post creation, or any action that calls `checkAchievements()`
- Auto-dismiss after 4 seconds

**Files**:
- `src/domains/reputation/reputation.service.ts` — return `newlyUnlocked` from `checkAchievements()`
- `src/app/api/reputation/route.ts` — include in response
- `src/app/api/achievements/route.ts` — include in response
- `src/components/community/achievement-toast.tsx` — new toast component
- `src/hooks/use-achievements.ts` — new hook or extend existing

### A2. "Mark all read" button

**What**: Add manual "Mark all read" in notification dropdown.

**How**:
- Add a text button "Tandai semua dibaca" at the top of the notification list
- Calls existing `useMarkNotificationsRead` hook with `{ all: true }`
- Only visible when `unreadCount > 0`

**Files**:
- `src/components/community/notification-bell.tsx` — add button

### A3. Reaction notifications

**What**: Notify post authors when someone reacts (BULLISH, BEARISH, etc.) to their post.

**How**:
- Add `REACTION` to `NotificationType` enum in Prisma schema
- Add subscriber for `community:post-reacted` event in notification service
- Create notification with reaction type as metadata
- Display: "{name} memberikan reaksi {emoji} di post Anda"
- Run `npx prisma db push` to apply enum change

**Files**:
- `prisma/schema.prisma` — add `REACTION` to NotificationType
- `src/domains/notification/notification.service.ts` — add subscriber
- `src/hooks/use-notifications.ts` — add reaction emoji display in `notificationText()`
- `src/components/community/notification-bell.tsx` — render reaction emoji

### A4. Streak tracking

**What**: Track consecutive daily claims and unlock `daily_streak_7` achievement.

**How**:
- Add `lastDailyClaimAt DateTime?` and `dailyStreak Int @default(0)` fields to User model
- In `claimDailyReward()`: check if `lastDailyClaimAt` was yesterday → increment streak, else if today → already claimed, else → reset streak to 1
- In `checkAchievements()`: check `dailyStreak >= 7` for `daily_streak_7`
- Show streak count next to the daily claim button
- Run `npx prisma db push` to apply schema changes

**Files**:
- `prisma/schema.prisma` — add `lastDailyClaimAt`, `dailyStreak` to User
- `src/domains/reputation/reputation.service.ts` — streak logic in `claimDailyReward()`, streak check in `checkAchievements()`
- `src/app/api/reputation/route.ts` — return streak in GET response
- `src/components/community/` — daily claim UI (wherever it lives)

---

## Phase B — Social Features

### B1. User search in community

**What**: Add a user search tab in the community page.

**How**:
- Reuse existing `/api/users/search?q=` API (already exists for @mention)
- Add a toggle above the feed: "Posts" | "Users"
- When "Users" is active, show a grid/list of user cards with avatar, name, username, reputation badge, and follow button
- Debounced search input
- If search query is empty, show top contributors (reuse `getTopContributors`)

**Files**:
- `src/app/(public)/community/page.tsx` — add user search tab
- `src/components/community/user-search-results.tsx` — new component
- Reuse: `src/hooks/use-mention-search.ts`, `src/components/community/follow-button.tsx`

### B2. User blocking

**What**: Allow users to block others, hiding their content.

**How**:
- Add `Block` model: `id`, `blockerId`, `blockedId`, `createdAt`, `@@unique([blockerId, blockedId])`
- Add `POST /api/block` (toggle) and `GET /api/block?userId=X` (check status)
- In feed queries: exclude posts from blocked users (add blocked user IDs to where clause)
- Block button in PostMenu and profile page
- Blocked users cannot comment on your posts (check in comment creation)
- Clear `.next` cache after schema change

**Files**:
- `prisma/schema.prisma` — Block model
- `src/domains/social/social-graph.service.ts` — block/unblock methods
- `src/domains/social/social-graph.repository.ts` — block queries
- `src/app/api/block/route.ts` — new API route
- `src/app/(public)/community/page.tsx` — filter blocked users
- `src/domains/community/community.repository.ts` — filter blocked users in feed queries
- `src/components/community/post-card.tsx` — block option in PostMenu
- `src/hooks/use-follow.ts` or new `src/hooks/use-block.ts` — block hook

### B3. Threaded comment improvements

**What**: Improve the comment threading UI with expand/collapse and inline replies.

**How**:
- Comments already have `parentId` in the DB and basic reply display with indentation
- Enhance `comment-list.tsx`:
  - Show only top 3 replies per comment with "Tampilkan X balasan lainnya" expander
  - Add "Balas" button on each comment that opens inline reply form (reuse `comment-form.tsx` with `parentId`)
  - Smooth expand/collapse animation
- No schema changes needed — threading already works in DB

**Files**:
- `src/components/community/comment-list.tsx` — threaded display + expand/collapse
- `src/components/community/comment-form.tsx` — may need minor adjustments for inline placement

---

## Phase C — Content Discovery

### C1. Pinned posts

**What**: Allow pinning one post to the top of the community feed.

**How**:
- Add `pinned Boolean @default(false)` to Post model
- `POST /api/posts/[id]/pin` — toggle pin (admin or post author only)
- In feed query: sort pinned posts first (`orderBy: [{ pinned: "desc" }, { createdAt: "desc" }]`)
- Show pin icon on pinned posts
- Only one pinned post per user at a time (unpin previous when pinning new)
- Run `npx prisma db push` to apply schema change

**Files**:
- `prisma/schema.prisma` — add `pinned` to Post
- `src/domains/community/community.repository.ts` — pin toggle, sort order
- `src/domains/community/community.service.ts` — pin logic + authorization
- `src/app/api/posts/[id]/pin/route.ts` — new API route
- `src/components/community/post-card.tsx` — pin icon display

### C2. Prediction accuracy filter

**What**: Filter community feed to show posts from top predictors.

**How**:
- Add a "Top Prediktor" tab option in the community tabs
- When active, pre-compute a list of user IDs with prediction accuracy >60% (min 3 resolved predictions)
- Use this list as a feed filter (similar to "following" tab logic)
- Cache the predictor list for 1 hour (reuse `CachedApiCall` pattern)
- Show accuracy badge next to filtered posts

**Files**:
- `src/app/(public)/community/page.tsx` — add tab + filter logic
- `src/domains/community/community.service.ts` — add `getTopPredictors()` method
- `src/domains/community/community.repository.ts` — query users by prediction accuracy

---

## Implementation Order

1. A3 (reaction notifications) — smallest, just enum + event subscriber
2. A2 (mark all read) — tiny UI change
3. A1 (achievement toast) — small, enhances engagement loop
4. A4 (streak tracking) — schema change + logic
5. B1 (user search) — reuses existing API
6. B3 (threaded comments) — UI-only enhancement
7. B2 (user blocking) — new model + API + filtering
8. C1 (pinned posts) — schema change + API
9. C2 (prediction accuracy filter) — aggregation query

## Schema Changes Summary

| Model | Fields to Add | Phase |
|-------|--------------|-------|
| NotificationType enum | `REACTION` | A3 |
| User | `lastDailyClaimAt DateTime?`, `dailyStreak Int @default(0)` | A4 |
| Block | New model | B2 |
| Post | `pinned Boolean @default(false)` | C1 |

## Verification

1. React to a post → author gets notification with emoji
2. Click "Tandai semua dibaca" → all notifications marked read
3. Claim daily reward 7 days in a row → unlock "Konsisten" achievement with toast
4. Search for a user in community → see results with follow buttons
5. Block a user → their posts disappear from feed
6. Reply to a comment → shows threaded with expand/collapse
7. Pin a post → appears at top of feed with pin icon
8. Filter by "Top Prediktor" → see posts only from accurate predictors
