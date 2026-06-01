# Community Threads-Like Redesign — Design Spec

**Date:** 2026-06-01
**Phase:** Phase 1 of 3 (Layout + Core Interactions)

## Context

The community page has a card-heavy layout with empty space on both sides of the feed. The user wants a Threads-inspired redesign: seamless full-width feed, mobile-first, with new social interactions (repost, share) and discovery features (trending hashtags, top contributor sidebar). This is the most impactful visual change to the community since launch.

## Phased Approach

- **Phase 1 (this PR):** Layout redesign + repost + share + following feed tab + trending hashtags + top kontributor sidebar
- **Phase 2:** Polls in posts + custom reactions (Bullish/Bearish/Insightful) + stock sentiment gauge
- **Phase 3:** Notification bell + gamification (streaks, badges, levels) + leaderboard rankings

## Phase 1 Design

### 1. Page Layout

**Desktop (lg+):**
- Two-column grid: center feed (`max-w-620px`, centered) + right sidebar (`280px`)
- Feed takes remaining space, centered within it
- Sidebar fixed to right edge of max container (`max-w-960px`)
- Hero section at top (keep existing dark gradient hero)

**Mobile (< lg):**
- Single column full-width feed
- No sidebar — trending and top kontributor accessible via tabs or collapsed sections
- Bottom nav bar with community icon highlighted

**Feed Tabs:**
- Two tabs at top of feed: "Semua" (default) and "Mengikuti"
- "Semua" shows all posts (current behavior)
- "Mengikuti" shows posts only from followed users (Follow model already exists)
- Tabs are client-side toggle using existing `use-posts.ts` hook with a `followOnly` parameter

### 2. Post Card Redesign

Current: Card with border-left teal accent, like/comment/bookmark/menu actions.

New:
- Clean card with thin border separation between posts (no heavy card-in-card)
- Avatar-left layout: avatar on left, content flows to the right
- 5 action buttons in a row: Like, Comment, Repost, Share, Bookmark
- Each shows count where applicable
- Repost and Share are new buttons
- Overflow menu (edit/delete/report) accessible via `...` icon in top-right corner
- User level badge (e.g., "ANALYST") next to username — based on engagement tier
- Stock attachment card keeps current green/red styling but more compact

### 3. Repost Feature

**Data Model:**
- New `Repost` table: `id`, `userId`, `postId`, `createdAt`
- Unique constraint on `(userId, postId)` — one repost per user per post
- Add `repostsCount` field to `Post` model (denormalized for performance)

**API Endpoints:**
- `POST /api/community/posts/[id]/repost` — create repost
- `DELETE /api/community/posts/[id]/repost` — remove repost
- Both toggle-based (like the existing like/bookmark pattern)

**Feed Display:**
- Reposted posts show "Dipost ulang oleh [username]" header above the original post
- Original post renders in full (same card, minus the repost header)
- Add `repostsCount` to the post card action bar

**Backend:**
- Repository: `createRepost(userId, postId)`, `deleteRepost(userId, postId)`, `findRepostByUser(userId, postId)`
- Service: `toggleRepost(userId, postId)` — returns { reposted: boolean }
- Update `getFeed` and related queries to include reposts in the feed (union of original posts + reposted posts by followed users)
- Increment/decrement `repostsCount` on the Post model

### 4. Share Feature

**Custom Share Modal (client component):**
- Triggered by share icon in post card action bar
- Modal with buttons for: WhatsApp, Telegram, Twitter/X, Copy Link
- WhatsApp: `https://wa.me/?text=[title]+[url]`
- Telegram: `https://t.me/share/url?url=[url]&text=[title]`
- Twitter/X: `https://twitter.com/intent/tweet?text=[title]&url=[url]`
- Copy Link: copies `https://teknikal.id/community/[postId]` to clipboard, shows "Link disalin!" toast

**No backend needed** — this is pure client-side with window.open() and clipboard API.

### 5. Following Feed Tab

**How it works:**
- Uses existing `Follow` model (followerId, followingId)
- Feed tab "Mengikuti" passes `followOnly: true` to the feed API
- Service layer already has `buildFollowingFilter(userId)` — extend it
- Server component fetches initial page, client-side infinite scroll via useInfiniteQuery
- If user follows 0 people, show empty state: "Ikuti pengguna lain untuk melihat post mereka di sini"

**API changes:**
- Add `followedOnly` boolean param to `getFeed()` in community.service.ts
- When true, filter posts to only those where `authorId IN (user's following list)`

### 6. Top Kontributor Sidebar

**What it shows:**
- Top 10 users by weekly engagement (likes received + comments received on their posts)
- Each entry: rank, avatar, username, engagement count
- Top 3 get gold/silver/bronze styling
- Click navigates to `/profile/[username]`
- Header: "Top Kontributor" with trophy icon
- Subtitle: "Minggu ini" (this week)

**Backend:**
- New repository method: `getTopContributors(limit = 10)`
- Aggregates `likesCount + commentsCount` per author for posts created in the last 7 days
- Returns: `{ userId, username, name, image, engagementScore }[]`
- Called server-side in the community page component
- Desktop only — hidden on mobile

### 7. Trending Hashtags Sidebar

**What it shows:**
- Top 5-8 trending hashtags (from PostTag)
- Each entry: hashtag name, post count, trend percentage change
- Click filters feed to that tag (navigates to `/community?tag=[tag]`)
- Header: "Trending" with fire icon
- Calculated from last 7 days vs prior 7 days for trend %

**Backend:**
- Enhance existing `getTrendingTags()` in community.service.ts
- Query PostTag counts for last 7 days, group by tag, order by count desc
- Compare with prior 7 days for trend percentage
- Return: `{ tag, count, trendPercent }[]`
- Called server-side in the community page component

### 8. Files to Modify/Create

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `Repost` model, add `repostsCount` to `Post` |
| `src/domains/community/community.repository.ts` | Add repost CRUD, top contributors, trending hashtags methods |
| `src/domains/community/community.service.ts` | Add repost toggle, getTopContributors, enhanced getTrendingTags, followOnly feed |
| `src/app/(public)/community/page.tsx` | Rewrite layout to Threads-style, add sidebar, add feed tabs |
| `src/components/community/post-card.tsx` | Redesign to compact avatar-left layout, add repost/share buttons |
| `src/components/community/share-modal.tsx` | **New** — Custom share modal with WhatsApp/Telegram/Twitter/Copy |
| `src/components/community/feed-tabs.tsx` | **New** — Client component for Semua/Mengikuti tab toggle |
| `src/components/community/top-kontributor-sidebar.tsx` | **New** — Right sidebar with top 10 weekly contributors |
| `src/components/community/trending-sidebar.tsx` | **New** — Right sidebar with trending hashtags |
| `src/app/api/community/posts/[id]/repost/route.ts` | **New** — POST/DELETE repost toggle endpoint |
| `src/hooks/use-posts.ts` | Add repost mutation, reposted state to Post type |
| `src/app/globals.css` | Minor — update community-specific styles for new layout |

### 9. Verification

1. Run `npx prisma db push` to apply schema changes
2. Load `/community` — feed should be center-aligned with right sidebar on desktop
3. Resize to mobile — sidebar hidden, single column feed
4. Click "Semua" / "Mengikuti" tabs — feed filters correctly
5. Click repost icon — repost count increments, icon changes state
6. Click share icon — modal opens with WhatsApp/Telegram/Twitter/Copy options
7. Click trending hashtag — feed filters to that tag
8. Top Kontributor shows top 10 with correct engagement scores
9. Reposted posts show "Dipost ulang oleh" header
10. All existing features still work: like, comment, bookmark, post creation, search, hashtags, predictions
