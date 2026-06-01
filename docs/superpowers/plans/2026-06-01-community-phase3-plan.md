# Community Phase 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 community features across engagement polish, social features, and content discovery.

**Architecture:** Follows existing DDD pattern (Controller → Service → Repository). Schema changes applied via `npx prisma db push`. UI is React 19 + TanStack React Query v5.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL 16, React 19, TanStack React Query v5, Tailwind CSS 4

**Node setup:** `export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH"`

---

## Task 1: Reaction Notifications (A3)

**Files:**
- Modify: `prisma/schema.prisma:593-599` (NotificationType enum)
- Modify: `src/domains/notification/notification.service.ts:130-131` (add subscriber)
- Modify: `src/hooks/use-notifications.ts:11,46-62` (add REACTION type + display text)

- [ ] **Step 1: Add REACTION to NotificationType enum**

In `prisma/schema.prisma`, add `REACTION` to the enum (after line 598):

```prisma
enum NotificationType {
  LIKE
  COMMENT
  MENTION
  FOLLOW
  STOCK_POST
  REACTION
}
```

- [ ] **Step 2: Apply schema change**

Run: `export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH" && npx prisma db push`
Then: `rm -rf .next`

- [ ] **Step 3: Add reaction emoji map + notification text**

In `src/hooks/use-notifications.ts`, update the `NotificationData` type (line 11) and `notificationText` function (lines 46-62):

Add at top of file:
```typescript
export const REACTION_EMOJI: Record<string, string> = {
  BULLISH: "🐂",
  BEARISH: "🐻",
  INSIGHTFUL: "💡",
  ROCKET: "🚀",
  FIRE: "🔥",
};
```

Update the type on line 11:
```typescript
type: "LIKE" | "COMMENT" | "MENTION" | "FOLLOW" | "STOCK_POST" | "REACTION";
```

Add to the switch in `notificationText` (before `default:`):
```typescript
case "REACTION":
  return `${name} memberikan reaksi di post Anda`;
```

- [ ] **Step 4: Add event subscriber in notification service**

In `src/domains/notification/notification.service.ts`, add after the `social:user-followed` subscriber (after line ~131):

```typescript
eventBus.on("community:post-reacted", async (payload) => {
  try {
    if (payload.userId !== payload.authorId) {
      await notificationRepository.create({
        type: "REACTION",
        recipientId: payload.authorId,
        actorId: payload.userId,
        postId: payload.postId,
      });
    }
  } catch (e) {
    console.error("Failed to create reaction notification:", e);
  }
});
```

- [ ] **Step 5: Type check**

Run: `export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH" && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domains/notification/notification.service.ts src/hooks/use-notifications.ts
git commit -m "feat: add reaction notifications when users react to posts"
```

---

## Task 2: Mark All Read Button (A2)

**Files:**
- Modify: `src/components/community/notification-bell.tsx:44-50` (header area)

- [ ] **Step 1: Add "Tandai semua dibaca" button**

In `src/components/community/notification-bell.tsx`, replace the header section (lines 44-50) with:

```tsx
<div className="px-3 py-2 border-b border-border flex items-center justify-between">
  <span className="text-sm font-semibold">Notifikasi</span>
  {unreadCount > 0 && (
    <button
      onClick={(e) => { e.stopPropagation(); markRead.mutate({ markAll: true }); }}
      className="text-[10px] text-accent hover:underline"
    >
      Tandai semua dibaca
    </button>
  )}
</div>
```

- [ ] **Step 2: Type check and commit**

```bash
npx tsc --noEmit
git add src/components/community/notification-bell.tsx
git commit -m "feat: add mark all read button in notification dropdown"
```

---

## Task 3: Achievement Unlock Toast (A1)

**Files:**
- Modify: `src/domains/reputation/reputation.service.ts:157-186` (checkAchievements to return newly unlocked)
- Modify: `src/app/api/achievements/route.ts` (include newly unlocked)
- Create: `src/components/community/achievement-toast.tsx`

- [ ] **Step 1: Update checkAchievements to return newly unlocked types**

In `src/domains/reputation/reputation.service.ts`, replace `checkAchievements` method (lines 157-186):

```typescript
async checkAchievements(userId: string): Promise<string[]> {
  const stats = await reputationRepository.getUserStats(userId);
  if (!stats) return [];

  const postCount = stats._count.posts;
  const followerCount = stats._count.followers;
  const holdingCount = stats._count.portfolioHoldings;
  const predictionCount = await reputationRepository.countPostsWithPrediction(userId);

  const checks: [AchievementType, boolean][] = [
    ["first_post", postCount >= 1],
    ["posts_10", postCount >= 10],
    ["posts_50", postCount >= 50],
    ["first_prediction", predictionCount >= 1],
    ["predictions_10", predictionCount >= 10],
    ["followers_10", followerCount >= 10],
    ["followers_100", followerCount >= 100],
    ["portfolio_5", holdingCount >= 5],
  ];

  const newlyUnlocked: string[] = [];
  for (const [type, shouldUnlock] of checks) {
    if (shouldUnlock && ACHIEVEMENTS[type]) {
      try {
        await reputationRepository.unlockAchievement(userId, type);
        newlyUnlocked.push(type);
      } catch {
        // Already unlocked
      }
    }
  }
  return newlyUnlocked;
},
```

- [ ] **Step 2: Create achievement toast component**

Create `src/components/community/achievement-toast.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/domains/reputation/achievements";

export function AchievementToast({ types, onDone }: { types: string[]; onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (types.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {types.map((type) => {
        const def = ACHIEVEMENTS[type as keyof typeof ACHIEVEMENTS];
        if (!def) return null;
        return (
          <div key={type} className="bg-white rounded-xl shadow-lg border border-teal-200 px-4 py-3 flex items-center gap-3 mb-2 min-w-[240px]">
            <span className="text-2xl">{def.icon}</span>
            <div>
              <p className="text-xs text-teal-600 font-medium">Pencapaian Terbuka!</p>
              <p className="text-sm font-bold text-gray-900">{def.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/domains/reputation/reputation.service.ts src/components/community/achievement-toast.tsx
git commit -m "feat: add achievement unlock toast with newly unlocked detection"
```

---

## Task 4: Streak Tracking (A4)

**Files:**
- Modify: `prisma/schema.prisma` (User model — add fields after line 247)
- Modify: `src/domains/reputation/reputation.service.ts:46-59` (claimDailyReward — add streak logic)
- Modify: `src/domains/reputation/reputation.service.ts:157+` (checkAchievements — add streak check)
- Modify: `src/app/api/reputation/route.ts:5-14` (GET — return streak)
- Modify: `src/domains/reputation/reputation.repository.ts` (add streak query)

- [ ] **Step 1: Add streak fields to User model**

In `prisma/schema.prisma`, add after the `reputation` field (line 247) in the User model:

```prisma
  lastDailyClaimAt DateTime?
  dailyStreak      Int      @default(0)
```

- [ ] **Step 2: Apply schema change**

```bash
export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH" && npx prisma db push && rm -rf .next
```

- [ ] **Step 3: Update claimDailyReward with streak logic**

In `src/domains/reputation/reputation.service.ts`, replace the `claimDailyReward` method (lines 46-59):

```typescript
async claimDailyReward(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cacheKey = `daily-rep:${userId}:${today.toISOString().slice(0, 10)}`;
  const expiresAt = new Date(today.getTime() + 48 * 60 * 60 * 1000);

  try {
    await reputationRepository.claimDailyReward(userId, cacheKey, expiresAt);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) throw new DailyAlreadyClaimedError();
    throw error;
  }

  const user = await reputationRepository.findUserReputation(userId);
  if (!user) return { awarded: true, streak: 1 };

  const lastClaim = (user as { lastDailyClaimAt: Date | null }).lastDailyClaimAt;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = 1;
  if (lastClaim) {
    const lastDate = new Date(lastClaim);
    lastDate.setHours(0, 0, 0, 0);
    if (lastDate.getTime() === yesterday.getTime()) {
      newStreak = ((user as { dailyStreak: number }).dailyStreak ?? 0) + 1;
    }
  }

  await reputationRepository.updateStreak(userId, newStreak);

  return { awarded: true, streak: newStreak };
},
```

- [ ] **Step 4: Add repository methods**

In `src/domains/reputation/reputation.repository.ts`, add to the repository object:

```typescript
updateStreak(userId: string, streak: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { dailyStreak: streak, lastDailyClaimAt: new Date() },
  });
},
```

- [ ] **Step 5: Add streak check to checkAchievements**

In the `checkAchievements` method, add to the `checks` array (after the `portfolio_5` entry):

```typescript
const user = await reputationRepository.findUserReputation(userId);
const streak = user ? (user as { dailyStreak: number }).dailyStreak : 0;
checks.push(["daily_streak_7", streak >= 7]);
```

- [ ] **Step 6: Update reputation API to return streak**

In `src/app/api/reputation/route.ts`, update the GET handler:

```typescript
export async function GET(request: Request) {
  try {
    const user = await authService.requireAuth();
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("userId") || user.id;
    const result = await reputationService.getUserReputation(targetId);
    const streakResult = await reputationRepository.findUserReputation(targetId);
    return NextResponse.json({
      ...result,
      streak: (streakResult as { dailyStreak: number })?.dailyStreak ?? 0,
    });
  } catch (error) {
    return handleApiError(error, "fetch reputation");
  }
}
```

Add import at top: `import { reputationRepository } from "@/domains/reputation/reputation.repository";`

- [ ] **Step 7: Type check and commit**

```bash
npx tsc --noEmit
git add prisma/schema.prisma src/domains/reputation/ src/app/api/reputation/route.ts
git commit -m "feat: add daily streak tracking and streak-based achievement"
```

---

## Task 5: User Search in Community (B1)

**Files:**
- Create: `src/components/community/user-search-results.tsx`
- Modify: `src/app/(public)/community/page.tsx` (add search params + pass to client)

**Note:** The user search API already exists at `/api/users/search?q=`. The top contributors data is already fetched in the community page. This task is purely a new client component + adding a search query param.

- [ ] **Step 1: Create user search results component**

Create `src/components/community/user-search-results.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { FollowButton } from "./follow-button";
import { ReputationBadge } from "./reputation-badge";
import { getAvatarUrl } from "@/lib/avatar";

interface TopUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  reputation: number;
  weeklyScore: number;
}

interface MentionUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  reputation: number;
  isFollowing: boolean;
}

export function UserSearchResults({ topContributors }: { topContributors: TopUser[] }) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["user-search", query],
    queryFn: async () => {
      if (!query) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data as MentionUser[];
    },
    enabled: query.length > 0,
  });

  const users = query ? searchResults ?? [] : topContributors;
  const loading = query && !searchResults;

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pengguna..."
          className="w-full rounded-lg border border-gray-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-gray-400">Mencari...</div>
      )}

      {!loading && users.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          {query ? "Pengguna tidak ditemukan" : "Belum ada kontributor"}
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-2">
          {users.map((user) => {
            const image = "image" in user && user.image
              ? user.image
              : "https://www.gravatar.com/avatar/?d=mp&s=80";
            return (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Link href={`/profile/${user.username}`} className="shrink-0">
                  <img src={image} alt="" className="w-9 h-9 rounded-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/profile/${user.username}`} className="text-sm font-bold text-gray-900 hover:underline truncate">
                      {user.name ?? user.username}
                    </Link>
                    {user.reputation > 0 && <ReputationBadge reputation={user.reputation} />}
                  </div>
                  <span className="text-xs text-gray-400">@{user.username}</span>
                </div>
                {session?.user?.id !== user.id && (
                  <FollowButton userId={user.id} size="sm" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add search mode to community page**

In `src/app/(public)/community/page.tsx`:

1. Update `searchParams` type to include `search`:
```typescript
searchParams: Promise<{ tab?: string; tag?: string; search?: string }>;
```

2. Destructure search:
```typescript
const { tab, tag, search } = await searchParams;
const searchMode = search === "users";
```

3. Import the component:
```typescript
import { UserSearchResults } from "@/components/community/user-search-results";
```

4. Add "Pengguna" tab to the tabs array (after "Mengikuti"):
```typescript
{ key: "users", label: "Pengguna", href: tag ? `/community?search=users&tag=${encodeURIComponent(tag)}` : "/community?search=users" },
```

5. Update `activeTab` validation:
```typescript
const activeTab = tab === "trending" || tab === "following" ? tab : searchMode ? "users" : "all";
```

6. In the feed area, add conditional rendering for user search mode. After the tag filter banner and before the feed:
```tsx
{searchMode ? (
  <UserSearchResults topContributors={topContributors} />
) : (
  <>
    {/* existing feed content */}
  </>
)}
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/components/community/user-search-results.tsx src/app/\(public\)/community/page.tsx
git commit -m "feat: add user search tab in community page"
```

---

## Task 6: Threaded Comment Improvements (B3)

**Files:**
- Modify: `src/components/community/comment-list.tsx` (expand/collapse + inline reply)

- [ ] **Step 1: Add expand/collapse for replies in CommentItem**

In `src/components/community/comment-list.tsx`, find the `CommentItem` component. The component already shows replies with indentation. Add state for collapsed replies:

At the start of `CommentItem`, add:
```typescript
const [showAllReplies, setShowAllReplies] = useState(false);
const MAX_VISIBLE_REPLIES = 3;
```

Then wrap the replies section: where replies are rendered, show only `MAX_VISIBLE_REPLIES` when collapsed:

```tsx
{comment.replies && comment.replies.length > 0 && (
  <div className="mt-2 ml-8 border-l-2 border-gray-100 pl-4 space-y-3">
    {(showAllReplies ? comment.replies : comment.replies.slice(0, MAX_VISIBLE_REPLIES)).map((reply) => (
      <CommentItem key={reply.id} comment={reply} postId={postId} />
    ))}
    {comment.replies.length > MAX_VISIBLE_REPLIES && !showAllReplies && (
      <button
        onClick={() => setShowAllReplies(true)}
        className="text-xs text-teal-600 hover:underline py-1"
      >
        Tampilkan {comment.replies.length - MAX_VISIBLE_REPLIES} balasan lainnya
      </button>
    )}
  </div>
)}
```

- [ ] **Step 2: Type check and commit**

```bash
npx tsc --noEmit
git add src/components/community/comment-list.tsx
git commit -m "feat: add expand/collapse for threaded comment replies"
```

---

## Task 7: User Blocking (B2)

**Files:**
- Modify: `prisma/schema.prisma` (add Block model after Follow model)
- Modify: `src/domains/social/social-graph.repository.ts` (add block methods)
- Modify: `src/domains/social/social-graph.service.ts` (add block/unblock)
- Create: `src/app/api/block/route.ts`
- Create: `src/hooks/use-block.ts`
- Modify: `src/app/(public)/community/page.tsx` (filter blocked users)
- Modify: `src/domains/community/community.repository.ts:89-95` (feed filter)
- Modify: `src/components/community/post-card.tsx:128-160` (add block option to PostMenu)

- [ ] **Step 1: Add Block model to schema**

In `prisma/schema.prisma`, add after the Follow model (after line ~578):

```prisma
model Block {
  id         String   @id @default(cuid())
  blockerId  String
  blockedId  String
  createdAt  DateTime @default(now())

  blocker User @relation("Blocking", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked User @relation("Blocked", fields: [blockedId], references: [id], onDelete: Cascade)

  @@unique([blockerId, blockedId])
  @@index([blockedId])
  @@index([blockerId])
}
```

Add relations to User model (after the followers line):
```prisma
  blocking  Block[]  @relation("Blocking")
  blocked   Block[]  @relation("Blocked")
```

- [ ] **Step 2: Apply schema change**

```bash
export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH" && npx prisma db push && rm -rf .next
```

- [ ] **Step 3: Add block repository methods**

In `src/domains/social/social-graph.repository.ts`, add to the repository object:

```typescript
findBlock(blockerId: string, blockedId: string) {
  return prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
},

createBlock(blockerId: string, blockedId: string) {
  return prisma.block.create({ data: { blockerId, blockedId } });
},

deleteBlock(id: string) {
  return prisma.block.delete({ where: { id } });
},

async getBlockedUserIds(blockerId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { blockerId },
    select: { blockedId: true },
  });
  return blocks.map((b) => b.blockedId);
},
```

- [ ] **Step 4: Add block service methods**

In `src/domains/social/social-graph.service.ts`, add to the service object:

```typescript
async toggleBlock(currentUserId: string, targetUserId: string): Promise<{ blocked: boolean }> {
  if (!targetUserId) throw new InvalidTargetError();
  if (targetUserId === currentUserId) throw new InvalidTargetError();

  const existing = await socialGraphRepository.findBlock(currentUserId, targetUserId);
  if (existing) {
    await socialGraphRepository.deleteBlock(existing.id);
    return { blocked: false };
  }

  await socialGraphRepository.createBlock(currentUserId, targetUserId);
  return { blocked: true };
},

async getBlockedUserIds(userId: string): Promise<string[]> {
  return socialGraphRepository.getBlockedUserIds(userId);
},
```

- [ ] **Step 5: Create block API route**

Create `src/app/api/block/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await authService.requireAuth();
    const { targetUserId } = await request.json();
    const result = await socialGraphService.toggleBlock(user.id, targetUserId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle block");
  }
}
```

- [ ] **Step 6: Create block hook**

Create `src/hooks/use-block.ts`:

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useToggleBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await fetch("/api/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!res.ok) throw new Error("Gagal memblokir");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
```

- [ ] **Step 7: Filter blocked users in community page**

In `src/app/(public)/community/page.tsx`, after fetching `session`, add blocked user filtering:

After the `followingIds` computation (~line 70), add:

```typescript
const blockedIds = session?.user?.id
  ? await socialGraphService.getBlockedUserIds(session.user.id)
  : [];
const blockedSet = new Set(blockedIds);
```

Then in the Prisma query `where` clause (around line 33), add:

```typescript
...(blockedSet.size > 0 ? { authorId: { notIn: blockedSet } } : {}),
```

And filter `displayPosts` after slicing:

```typescript
const displayPosts = (hasMore ? posts.slice(0, 20) : posts).filter(
  (p) => !blockedSet.has(p.author.id)
);
```

- [ ] **Step 8: Add block option to PostMenu**

In `src/components/community/post-card.tsx`, in the `PostMenu` component:

Add import: `import { useToggleBlock } from "@/hooks/use-block";`

Add props: `authorId: string` to PostMenu's props.

Add inside the component: `const toggleBlock = useToggleBlock();`

Add in the dropdown menu, after the "Laporkan" button section and before `{confirmDelete && (`:

```tsx
{!isAuthor && (
  <button
    onClick={() => { toggleBlock.mutate(authorId); setOpen(false); }}
    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
  >
    Blokir
  </button>
)}
```

Update PostMenu invocation in PostCard to pass `authorId={post.author.id}`.

- [ ] **Step 9: Type check and commit**

```bash
npx tsc --noEmit
git add prisma/schema.prisma src/domains/social/ src/app/api/block/ src/hooks/use-block.ts src/app/\(public\)/community/page.tsx src/components/community/post-card.tsx
git commit -m "feat: add user blocking with feed filtering"
```

---

## Task 8: Pinned Posts (C1)

**Files:**
- Modify: `prisma/schema.prisma` (Post model — add pinned field)
- Modify: `src/domains/community/community.repository.ts` (pin toggle + sort)
- Modify: `src/domains/community/community.service.ts` (pin logic)
- Create: `src/app/api/posts/[id]/pin/route.ts`
- Modify: `src/components/community/post-card.tsx` (pin icon + pin button)

- [ ] **Step 1: Add pinned field to Post model**

In `prisma/schema.prisma`, add to the Post model after `createdAt`:

```prisma
  pinned     Boolean  @default(false)
```

- [ ] **Step 2: Apply schema change**

```bash
export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH" && npx prisma db push && rm -rf .next
```

- [ ] **Step 3: Add repository methods**

In `src/domains/community/community.repository.ts`, add:

```typescript
pinPost(id: string, pinned: boolean) {
  return prisma.post.update({
    where: { id },
    data: { pinned },
  });
},

unpinUserPosts(authorId: string) {
  return prisma.post.updateMany({
    where: { authorId, pinned: true },
    data: { pinned: false },
  });
},
```

- [ ] **Step 4: Add pin service method**

In `src/domains/community/community.service.ts`, add:

```typescript
async togglePin(userId: string, postId: string): Promise<{ pinned: boolean }> {
  const post = await communityRepository.findPostAuthorId(postId);
  if (!post) throw new PostNotFoundError();
  if (post.authorId !== userId) throw new NotAuthorizedError();

  const fullPost = await communityRepository.findPostById(postId);
  const isPinned = fullPost && "pinned" in fullPost ? (fullPost as { pinned: boolean }).pinned : false;

  if (!isPinned) {
    await communityRepository.unpinUserPosts(userId);
    await communityRepository.pinPost(postId, true);
    return { pinned: true };
  }

  await communityRepository.pinPost(postId, false);
  return { pinned: false };
},
```

Note: You may need to add a `findPostById` method to the repository if it doesn't exist. Check first.

- [ ] **Step 5: Create pin API route**

Create `src/app/api/posts/[id]/pin/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authService.requireAuth();
    const { id } = await params;
    const result = await communityService.togglePin(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle pin");
  }
}
```

- [ ] **Step 6: Update feed sort order**

In `src/domains/community/community.repository.ts`, update the `findPostsFeed` orderBy to include pinned:

```typescript
const orderBy =
  params.sort === "trending"
    ? ([
        { pinned: "desc" as const },
        { likesCount: "desc" as const },
        { commentsCount: "desc" as const },
        { createdAt: "desc" as const },
      ])
    : [{ pinned: "desc" as const }, { createdAt: "desc" as const }];
```

- [ ] **Step 7: Add pin icon + pin button to PostCard**

In `src/components/community/post-card.tsx`:

Add a pin icon before the post body if `post.pinned`:
```tsx
{post.pinned && (
  <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
    Disematkan
  </div>
)}
```

In `PostMenu`, add pin option (only for authors):
```tsx
{isAuthor && (
  <button
    onClick={() => { fetch(`/api/posts/${postId}/pin`, { method: "POST" }); setOpen(false); queryClient.invalidateQueries({ queryKey: ["posts"] }); }}
    className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
  >
    Sematkan
  </button>
)}
```

- [ ] **Step 8: Type check and commit**

```bash
npx tsc --noEmit
git add prisma/schema.prisma src/domains/community/ src/app/api/posts/ src/components/community/post-card.tsx
git commit -m "feat: add pinned posts with feed sorting and pin icon"
```

---

## Task 9: Prediction Accuracy Filter (C2)

**Files:**
- Modify: `src/app/(public)/community/page.tsx` (add tab + filter)
- Modify: `src/domains/community/community.service.ts` (add getTopPredictors)
- Modify: `src/domains/community/community.repository.ts` (add query)

- [ ] **Step 1: Add getTopPredictors repository method**

In `src/domains/community/community.repository.ts`, add:

```typescript
async findTopPredictors(minAccuracy: number = 60, minResolved: number = 3): Promise<string[]> {
  const users = await prisma.post.groupBy({
    by: ["authorId"],
    where: { predictionOutcome: { in: ["correct", "incorrect"] } },
    _count: { predictionOutcome: true },
    _sum: {},
  });

  const authorIds = users
    .filter((u) => u._count.predictionOutcome >= minResolved)
    .map((u) => u.authorId);

  if (authorIds.length === 0) return [];

  const correctCounts = await prisma.post.groupBy({
    by: ["authorId"],
    where: { authorId: { in: authorIds }, predictionOutcome: "correct" },
    _count: { predictionOutcome: true },
  });

  const correctMap = new Map(correctCounts.map((c) => [c.authorId, c._count.predictionOutcome]));
  const totalCountMap = new Map(users.map((u) => [u.authorId, u._count.predictionOutcome]));

  return authorIds.filter((id) => {
    const total = totalCountMap.get(id) ?? 0;
    const correct = correctMap.get(id) ?? 0;
    return total > 0 && Math.round((correct / total) * 100) >= minAccuracy;
  });
},
```

- [ ] **Step 2: Add getTopPredictors service method**

In `src/domains/community/community.service.ts`, add:

```typescript
async getTopPredictors(): Promise<string[]> {
  const cacheKey = "top-predictors";
  const cached = await prisma.cachedApiCall.findUnique({ where: { cacheKey } });
  if (cached && new Date(cached.expiresAt) > new Date()) {
    return (cached.data as { ids: string[] }).ids;
  }

  const ids = await communityRepository.findTopPredictors();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.cachedApiCall.upsert({
    where: { cacheKey },
    create: { cacheKey, data: { ids }, expiresAt },
    update: { data: { ids }, expiresAt },
  });

  return ids;
},
```

Import `prisma` at the top if not already imported (it is already imported in the service).

- [ ] **Step 3: Add predictors tab to community page**

In `src/app/(public)/community/page.tsx`:

1. Update `activeTab` to include predictors:
```typescript
const activeTab = tab === "trending" || tab === "following" || tab === "predictors" ? tab : searchMode ? "users" : "all";
```

2. Add predictors filter in the Prisma query `where` clause:
```typescript
...(activeTab === "predictors" ? { authorId: { in: await communityService.getTopPredictors() } } : {}),
```

3. Add tab to the tabs array:
```typescript
{ key: "predictors", label: "Top Prediktor", href: "/community?tab=predictors" },
```

- [ ] **Step 4: Type check and commit**

```bash
npx tsc --noEmit
git add src/domains/community/ src/app/\(public\)/community/page.tsx
git commit -m "feat: add top predictors filter tab in community feed"
```

---

## Verification

After all tasks are complete:

1. `export PATH="$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin:$PATH" && npx tsc --noEmit` — must pass with no errors
2. `rm -rf .next && npx next dev --port 3001` — server starts without crash
3. Open `/community` — page loads with new "Pengguna" and "Top Prediktor" tabs
4. React to a post → check notification bell shows reaction notification
5. Click "Tandai semua dibaca" in notification dropdown
6. Search for a user in the "Pengguna" tab
7. Block a user from the post menu → their posts disappear from feed
8. Expand/collapse comment replies
9. Pin a post as author → appears at top of feed with pin icon
10. Switch to "Top Prediktor" tab → see filtered feed
