# Community Engagement Design Spec

**Date:** 2026-05-29
**Status:** Approved
**North Star Metric:** Daily Active Usage (DAU/MAU ratio)

## Problem

The TeknikalID community has core features (posts, comments, likes, stock tagging) but lacks every feature that drives daily return visits. Users have no reason to come back unless they actively search for stock discussions. No follow system, no notifications, no trending content, no reputation incentives.

## Solution

Stock-centric social features combined with gamification. Every feature ties back to the stock analysis identity — users follow stocks they own, get notified when someone discusses them, earn reputation for quality analysis.

## Data Model

### New Prisma Models

**Follow** — User-to-user follows
```
model Follow {
  id          String   @id @default(cuid())
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("Following", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("Followers", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@map("follows")
}
```

**StockFollow** — User-to-stock follows
```
model StockFollow {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  ticker    String
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, ticker])
  @@map("stock_follows")
}
```

**Notification** — Activity alerts
```
enum NotificationType {
  LIKE
  COMMENT
  MENTION
  FOLLOW
  STOCK_POST
}

model Notification {
  id         String           @id @default(cuid())
  type       NotificationType
  recipientId String          @map("recipient_id")
  actorId    String           @map("actor_id")
  postId     String?          @map("post_id")
  commentId  String?          @map("comment_id")
  read       Boolean          @default(false)
  createdAt  DateTime         @default(now()) @map("created_at")

  recipient User  @relation("Notifications", fields: [recipientId], references: [id], onDelete: Cascade)
  actor     User  @relation("NotificationActions", fields: [actorId], references: [id], onDelete: Cascade)
  post      Post? @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment   Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@index([recipientId, read, createdAt])
  @@map("notifications")
}
```

**Bookmark** — Save posts for later
```
model Bookmark {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  postId    String   @map("post_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
  @@map("bookmarks")
}
```

### Modified Models

**User** — Add reputation field
```
reputation Int @default(0)
```

## Features

### 1. User Follow System

- Follow/unfollow button on user profiles (`/profile/[username]`) and post cards (next to username)
- Follower/following counts displayed on profile
- "Following" feed tab shows posts from followed users
- API: `POST /api/follow`, `DELETE /api/follow`, `GET /api/follow/status?userId=`

### 2. Stock Follow System

- "Follow $TICKER" button on stock detail pages (`/stocks/[ticker]`)
- When someone posts with a stock tag, all followers of that stock get a `STOCK_POST` notification
- Stock-following posts included in "Following" feed tab
- API: `POST /api/stock-follow`, `DELETE /api/stock-follow`, `GET /api/stock-follow/status?ticker=`

### 3. Community Feed Tabs

The community page (`/community`) gets 3 tabs:

- **Semua (All)** — Current chronological feed, unchanged
- **Trending** — Posts sorted by engagement velocity: `(likes * 1 + comments * 2) / hours_since_post`. Posts older than 7 days excluded.
- **Mengikuti (Following)** — Posts from followed users + posts tagging followed stocks

Tab state via URL query param: `/community?tab=trending`

### 4. Notification System

**Bell icon** in header (next to watchlist icon):
- Shows unread count badge (red dot with number, max "99+")
- Click opens dropdown panel with last 20 notifications
- "Mark all as read" button at top
- Each notification links to the relevant post/comment/profile

**Notification types:**

| Type | Trigger | Text (Indonesian) |
|------|---------|-------------------|
| `LIKE` | Someone likes your post | "@user menyukai post Anda" |
| `COMMENT` | Someone comments on your post | "@user mengomentari post Anda" |
| `MENTION` | Someone @mentions you | "@user menyebut Anda" |
| `FOLLOW` | Someone follows you | "@user mulai mengikuti Anda" |
| `STOCK_POST` | Someone posts about your followed stock | "@user membahas $TICKER" |

**Implementation:**
- Notifications created server-side in existing API routes (like, comment, post create)
- Polled every 30s via React Query `useQuery` with `refetchInterval: 30_000`
- Batch: if 5 people like same post, show "@user dan 4 lainnya menyukai post Anda"
- API: `GET /api/notifications`, `PUT /api/notifications/read`, `PUT /api/notifications/read-all`

### 5. Reputation System

**Points earned:**

| Action | Points |
|--------|--------|
| Receive a like on post | +1 |
| Receive a comment on post | +2 |
| Someone follows you | +3 |
| Post with stock tag gets 5+ likes | +5 bonus |
| Daily community visit (client-side ping) | +1 |

**Badge levels (shown on profile and next to username in posts/comments):**

| Level | Points | Badge |
|-------|--------|-------|
| Newcomer | 0-49 | None |
| Analyst | 50-199 | Blue dot |
| Senior Analyst | 200-499 | Teal dot |
| Expert | 500+ | Gold dot |

**Implementation:**
- `reputation` field on User model, updated via application logic
- Badge computed client-side from `user.reputation` value
- No separate model needed — reputation changes are applied in the same transaction as the triggering action (like, comment, follow)
- API: `GET /api/reputation?userId=` returns points and badge level

### 6. Weekly Leaderboard

- Section at `/community/leaderboard` or within community page
- Top 10 contributors by reputation change this week
- Shows: rank, username, badge, reputation change, post count
- Resets every Monday 00:00 WIB (UTC+7)
- API: `GET /api/leaderboard?period=week`

**Implementation:**
- Query: sum reputation change from `reputation_log` or compute from engagement counts in the period
- Alternative (simpler): track `weeklyReputation` field that resets weekly via cron, or compute from likes/comments/follows received in the period

### 7. Post Bookmarks

- Bookmark icon on each post card (toggle, like the watchlist button)
- `/bookmarks` page or tab in profile showing saved posts
- Private — only you see your bookmarks
- API: `POST /api/bookmarks`, `DELETE /api/bookmarks/[postId]`, `GET /api/bookmarks`

### 8. @Mention Autocomplete

- In post composer and comment form, typing `@` triggers autocomplete dropdown
- Searches users by username (prefix match)
- Keyboard navigation (up/down/enter/escape)
- Selected mention inserts `@username` into text
- Existing `renderContent.tsx` already renders @mentions as links

### 9. Comment Sorting

- Toggle on post detail page: "Terbaru" (Newest) or "Populer" (Most liked)
- Default: Newest
- "Most liked" sorts by like count on comments (requires adding likes to comments, or uses reply count as proxy)
- API: `GET /api/posts/[id]?sort=newest|popular`

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/follow/route.ts` | Follow/unfollow + status check |
| `src/app/api/stock-follow/route.ts` | Stock follow/unfollow + status |
| `src/app/api/notifications/route.ts` | GET notifications, PUT mark read |
| `src/app/api/bookmarks/route.ts` | Bookmark CRUD |
| `src/app/api/leaderboard/route.ts` | Weekly leaderboard |
| `src/app/api/reputation/route.ts` | Reputation lookup |
| `src/hooks/use-notifications.ts` | React Query hook for notifications |
| `src/hooks/use-follow.ts` | Follow/unfollow mutations |
| `src/hooks/use-bookmarks.ts` | Bookmark mutations |
| `src/components/community/notification-bell.tsx` | Bell icon + dropdown |
| `src/components/community/follow-button.tsx` | Follow/unfollow button |
| `src/components/community/bookmark-button.tsx` | Bookmark toggle on posts |
| `src/components/community/trending-feed.tsx` | Trending tab content |
| `src/components/community/following-feed.tsx` | Following tab content |
| `src/components/community/mention-autocomplete.tsx` | @mention dropdown |
| `src/components/community/leaderboard.tsx` | Weekly leaderboard section |
| `src/components/community/reputation-badge.tsx` | Badge component |
| `prisma/migrations/...` | Migration for new models |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add Follow, StockFollow, Notification, Bookmark models; add reputation to User |
| `src/app/community/page.tsx` | Add tab navigation (All/Trending/Following) |
| `src/app/community/post/[id]/page.tsx` | Comment sorting, bookmark button |
| `src/components/layout/header.tsx` | Add notification bell icon |
| `src/components/community/post-card.tsx` | Follow button, bookmark button, reputation badge |
| `src/components/community/post-composer.tsx` | @mention autocomplete |
| `src/components/community/comment-list.tsx` | Reputation badges on commenters |
| `src/components/community/comment-form.tsx` | @mention autocomplete |
| `src/app/profile/[username]/page.tsx` | Follower/following counts, follow button, reputation badge |
| `src/app/stocks/[ticker]/page.tsx` | Follow stock button |
| `src/app/api/posts/route.ts` | Support trending sort, following filter |
| `src/app/api/posts/[id]/like/route.ts` | Create LIKE notification, update reputation |
| `src/app/api/comments/route.ts` | Create COMMENT notification, parse mentions for MENTION notifications |
| `src/app/api/auth/register/route.ts` | Any reputation initialization |

## Technical Notes

- **Notification batching**: When creating notifications, check if a similar notification (same type, same post, same recipient) exists from the last hour. If yes, increment a count field instead of creating a new row. Requires adding `count` field to Notification model.
- **Reputation updates**: Use Prisma `$transaction` to update reputation atomically with the triggering action.
- **Trending algorithm**: `(likes * 1 + comments * 2) / hours_since_post`. Cached for 5 minutes via ISR or in-memory cache. Only consider posts from last 7 days.
- **Daily login point**: Client-side ping `POST /api/reputation/daily` once per session. Server checks last ping date before awarding point.

## Verification

1. `npx prisma migrate dev` — migration applies cleanly
2. `npm run build` — no type errors
3. Manual testing:
   - Follow a user, see their posts in Following tab
   - Follow a stock, see stock-tagged posts in Following tab
   - Like a post, verify recipient gets notification
   - Comment with @mention, verify mentioned user gets notification
   - Check reputation increases on like/comment/follow
   - Check leaderboard shows correct weekly rankings
   - Bookmark a post, see it in bookmarks page
   - Use @mention autocomplete in composer
