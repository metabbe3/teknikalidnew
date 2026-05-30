# TeknikalID Community Features — Design Spec

**Date**: 2026-05-29
**Status**: Draft
**Scope**: MVP — Auth, community feed, stock discussions, watchlists, moderation

---

## Context

TeknikalID is a read-only IDX stock technical analysis platform. Users can view charts, indicators, and stock data but cannot interact. This spec adds community features to turn it from a tool into a destination where Indonesian retail traders share ideas, discuss stocks, and build watchlists.

**Target audience**: Indonesian retail stock traders.
**Language**: Indonesian (Bahasa Indonesia) only for UI.
**Tech approach**: NextAuth v5 + existing PostgreSQL/Prisma. No new infrastructure.

---

## 1. Auth & User System

### Providers
- **Google OAuth** (primary — most Indonesian users have Google accounts)
- **Email/password** (credentials provider with bcrypt hashing)

### Session
- JWT strategy (stateless)
- NextAuth v5 (`@auth/prisma-adapter` for Prisma integration)

### Signup flow
1. User clicks "Masuk" in header
2. Chooses Google or email/password
3. If new user → `/auth/complete-profile` to pick username (required, unique, 3-20 chars alphanumeric)
4. Redirected back to previous page

### User model
- `id`, `email` (unique), `name`, `username` (unique), `image` (avatar URL), `bio` (text, max 200 chars)
- `role`: `USER` | `ADMIN`
- `oauthProvider`: `google` | `credentials` | null
- `createdAt`

### Admin
- First user gets ADMIN role via seed script (`prisma/seed.ts`)
- Admins see "Moderasi" link in nav
- Admin panel at `/admin/reports`

---

## 2. Community Feed

### Feed page (`/community`)
- Timeline of posts, newest first
- Each post: author avatar + name, timestamp, content, optional ticker tag, like button, comment count
- "Tulis Post" composer at top (textarea + optional `$TICKER` autocomplete from IDX40 list)
- "Muat lebih banyak" (Load more) button for pagination (20 posts per page)
- Clicking ticker tag → `/stocks/TICKER.JK`
- Clicking post → `/community/post/[id]` for full view with comments

### Post model
- `id`, `content` (text, max 1000 chars), `authorId` → User
- `tickerTag`: optional string (e.g., "BBCA.JK") — links post to a stock
- `likesCount` (denormalized counter), `commentsCount` (denormalized counter)
- `createdAt`

### Like model
- `id`, `userId` → User, `postId` → Post
- Unique constraint on (userId, postId)

### Post interactions
- Like/unlike (toggle, updates `likesCount`)
- Comment (creates Comment with `postId`)
- Report (creates Report with `targetType: "post"`)

---

## 3. Stock Discussion Threads

### Location
- On every `/stocks/[ticker]` page, below the chart and indicators
- Section header: "Diskusi [TICKER]"
- Shows both: Comments with `stockTicker` AND Posts with `tickerTag` matching this stock

### Comment model
- `id`, `content` (text, max 500 chars), `authorId` → User
- `postId`: optional FK → Post (for feed post comments)
- `stockTicker`: optional string (for stock-specific threads)
- `parentId`: optional FK → Comment (1-level replies)
- `createdAt`

### Comment interactions
- Reply (creates Comment with `parentId`, shown nested under parent)
- Report (creates Report with `targetType: "comment"`)
- Delete own comment (author or admin only)

---

## 4. Watchlists

### Add/remove
- Star/bookmark button on every `/stocks/[ticker]` page header (next to ticker name)
- Clicking adds stock to watchlist (requires login — shows prompt if not authenticated)
- Clicking again removes it

### Watchlist model
- `id`, `userId` → User, `stockTicker` → Stock
- Unique constraint on (userId, stockTicker)

### Watchlist page (`/watchlist`)
- Compact grid of watched stocks: ticker, name, price, change %
- Remove button on each card
- Click → stock detail page

### Header integration
- Bookmark icon in header (right side)
- Shows count badge
- Public on user profile (`/profile/[username]`)

---

## 5. Moderation

### Report model
- `id`, `reporterId` → User
- `targetType`: `post` | `comment`
- `targetId`: string (post or comment ID)
- `reason`: `spam` | `abuse` | `misinformation` | `other`
- `status`: `pending` | `reviewed` | `dismissed`
- `createdAt`

### Report flow
1. User clicks "Laporkan" (Report) on any post or comment
2. Picks a reason from dropdown
3. Report created with status `pending`
4. Admin sees pending reports at `/admin/reports`
5. Admin actions: "Hapus" (delete content + mark reviewed) or "Abaikan" (dismiss)

### Admin powers
- Delete any post or comment
- Ban users (set `bannedAt` timestamp on User — blocked from posting/commenting)

---

## 6. Navigation Changes

### Header
- Left: Logo (TeknikalID)
- Center: Beranda | Saham | Komunitas
- Right: Watchlist icon (bookmark) | User avatar or "Masuk" button

### User menu (dropdown on avatar click)
- Profil Saya (My Profile)
- Daftar Pantauan (Watchlist)
- Pengaturan (Settings — links to `/profile/edit`)
- Keluar (Logout)

### New pages

| Route | Purpose |
|-------|---------|
| `/community` | Feed timeline |
| `/community/post/[id]` | Single post + comments |
| `/watchlist` | User's watchlist |
| `/profile/[username]` | Public profile |
| `/profile/edit` | Edit profile |
| `/admin/reports` | Moderation panel (admin only) |
| `/auth/signin` | Login/register |
| `/auth/complete-profile` | Username picker (new users) |

### Modified pages
- `/stocks/[ticker]` — add watchlist star + discussion section
- Header — add Komunitas + watchlist + auth

---

## 7. API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/[...nextauth]` | * | Public | NextAuth handlers |
| `/api/posts` | GET | Public | List feed posts (paginated) |
| `/api/posts` | POST | User | Create post |
| `/api/posts/[id]` | GET | Public | Single post + comments |
| `/api/posts/[id]/like` | POST | User | Like/unlike toggle |
| `/api/comments` | POST | User | Create comment |
| `/api/comments/[id]` | DELETE | Owner/Admin | Delete comment |
| `/api/watchlist` | GET | User | List user's watchlist |
| `/api/watchlist` | POST | User | Add to watchlist |
| `/api/watchlist/[ticker]` | DELETE | User | Remove from watchlist |
| `/api/reports` | POST | User | Submit report |
| `/api/admin/reports` | GET | Admin | List reports |
| `/api/admin/reports/[id]` | PATCH | Admin | Review report |
| `/api/profile/[username]` | GET | Public | Public profile data |
| `/api/profile` | PATCH | User | Update own profile |

---

## 8. Prisma Schema Additions

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  username      String    @unique
  image         String?
  bio           String?
  role          Role      @default(USER)
  bannedAt      DateTime?
  createdAt     DateTime  @default(now())

  accounts      Account[]
  posts         Post[]
  comments      Comment[]
  watchlist     Watchlist[]
  likes         Like[]
  reports       Report[]
}

enum Role {
  USER
  ADMIN
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  providerType      String
  providerId        String
  providerAccountId String
  refreshToken      String?
  accessToken       String?
  expiresAt         DateTime?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, providerAccountId])
}

model Post {
  id            String   @id @default(cuid())
  content       String
  tickerTag     String?
  authorId      String
  likesCount    Int      @default(0)
  commentsCount Int      @default(0)
  createdAt     DateTime @default(now())

  author        User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments      Comment[]
  likes         Like[]
  reports       Report[]

  @@index([tickerTag])
  @@index([createdAt])
  @@index([authorId])
}

model Comment {
  id          String    @id @default(cuid())
  content     String
  authorId    String
  postId      String?
  stockTicker String?
  parentId    String?
  createdAt   DateTime  @default(now())

  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  post        Post?     @relation(fields: [postId], references: [id], onDelete: Cascade)
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     Comment[] @relation("CommentReplies")
  reports     Report[]

  @@index([postId])
  @@index([stockTicker])
  @@index([parentId])
  @@index([authorId])
}

model Watchlist {
  id          String   @id @default(cuid())
  userId      String
  stockTicker String
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stock       Stock    @relation(fields: [stockTicker], references: [ticker], onDelete: Cascade)

  @@unique([userId, stockTicker])
}

model Like {
  id     String @id @default(cuid())
  userId String
  postId String

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
}

model Report {
  id         String       @id @default(cuid())
  reporterId String
  targetType ReportTarget
  targetId   String
  reason     ReportReason
  status     ReportStatus @default(PENDING)
  createdAt  DateTime     @default(now())

  reporter   User         @relation(fields: [reporterId], references: [id], onDelete: Cascade)

  @@index([status])
}

enum ReportTarget {
  POST
  COMMENT
}

enum ReportReason {
  SPAM
  ABUSE
  MISINFORMATION
  OTHER
}

enum ReportStatus {
  PENDING
  REVIEWED
  DISMISSED
}
```

---

## 9. Non-Goals (for this MVP)

- Real-time updates (WebSocket/SSE) — use polling or pull-to-refresh
- Direct messages between users
- Push notifications
- Image/file uploads in posts
- Portfolio tracking / paper trading
- Premium features / paywall
- Multi-language support
- Algorithmic feed (just chronological)
- Nested replies beyond 1 level
- Content search

---

## 10. Dependencies to Add

```json
{
  "next-auth": "^5",
  "@auth/prisma-adapter": "^2",
  "bcryptjs": "^2"
}
```

Dev dependency: `@types/bcryptjs`

---

## Verification

1. Sign up with Google → prompted for username → profile created → redirected back
2. Sign up with email/password → verify → prompted for username → profile created
3. `/community` → create a post with `$BBCA` tag → appears in feed
4. `/stocks/BBCA.JK` → discussion section shows the post and stock-specific comments
5. Star BBCA on stock page → appears in `/watchlist`
6. Report a post → appears in `/admin/reports` → admin can delete or dismiss
7. All new pages render with loading states and error boundaries
8. Unauthenticated users see community content but cannot post/like/comment (prompted to login)
