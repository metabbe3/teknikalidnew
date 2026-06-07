import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAvatarUrl } from "@/lib/avatar";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { communityService } from "@/domains/community/community.service";
import { PostComposer } from "@/components/community/post-composer";
import { CommunitySection } from "@/components/community/community-section";
import { TopKontributorSidebar } from "@/components/community/top-kontributor-sidebar";
import { TrendingSidebar } from "@/components/community/trending-sidebar";
import { UserSearchResults } from "@/components/community/user-search-results";
import { TopPredictorList } from "@/components/community/top-predictor-list";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

const PAGE_SIZE = 20;

type SearchParams = Promise<{ tab?: string; tag?: string; search?: string; page?: string }>;

export const metadata: Metadata = {
  title: "Komunitas Saham BEI — Diskusi Analisa Teknikal",
  description: "Komunitas trader Indonesia untuk diskusi analisa teknikal saham BEI. Bagikan prediksi harga, chart, dan strategi trading bersama ribuan trader.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "Komunitas Saham BEI — TeknikalID",
    description: "Komunitas trader Indonesia untuk diskusi analisa teknikal saham BEI.",
    url: `${SITE_URL}/community`,
    images: [{ url: `${SITE_URL}/api/og?title=Komunitas+Saham+BEI&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Komunitas Saham BEI — TeknikalID",
    description: "Komunitas trader Indonesia untuk diskusi analisa teknikal saham BEI.",
  },
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { tab, tag, search, page } = await searchParams;
  const activeTab = tab === "trending" || tab === "following" || tab === "predictors" ? tab : "all";
  const searchMode = search === "users";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  // Build the where clause for posts
  const postsWhere = activeTab === "trending"
    ? { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    : activeTab === "following" && session?.user?.id
      ? (await socialGraphService.buildFollowingFilter(session.user.id)) ?? undefined
      : tag
        ? { tags: { some: { tag } } }
        : undefined;

  // Get total count and paginated posts
  const [totalCount, posts] = await Promise.all([
    prisma.post.count({ where: postsWhere }),
    prisma.post.findMany({
      where: postsWhere,
      include: {
        author: { select: { id: true, username: true, name: true, email: true, image: true, reputation: true, _count: { select: { followers: true } } } },
        comments: { take: 0, select: { id: true } },
        likes: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : { select: { userId: true } },
        bookmarks: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
        reposts: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
      orderBy: activeTab === "trending"
        ? [{ likesCount: "desc" }, { commentsCount: "desc" }, { createdAt: "desc" }]
        : { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
  ]);

  const blockedIds = session?.user?.id
    ? await socialGraphService.getBlockedUserIds(session.user.id)
    : [];
  const blockedSet = new Set(blockedIds);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasMore = posts.length > PAGE_SIZE;
  const displayPosts = (hasMore ? posts.slice(0, PAGE_SIZE) : posts).filter(
    (p) => !blockedSet.has(p.author.id)
  );

  const uniqueAuthorIds = [...new Set(displayPosts.map(p => p.author.id))];
  const follows = session?.user?.id
    ? await prisma.follow.findMany({
        where: { followerId: session.user.id, followingId: { in: uniqueAuthorIds } },
        select: { followingId: true },
      })
    : [];
  const followingIds = new Set(follows.map(f => f.followingId));

  const authorHoldingsRows = await prisma.portfolioHolding.findMany({
    where: {
      userId: { in: uniqueAuthorIds },
      user: { portfolioPublic: true },
    },
    select: { userId: true, stockTicker: true },
  });
  const authorHoldingsMap = new Map<string, string[]>();
  authorHoldingsRows.forEach((r) => {
    const arr = authorHoldingsMap.get(r.userId) ?? [];
    arr.push(r.stockTicker);
    authorHoldingsMap.set(r.userId, arr);
  });

  // Fetch user's poll votes
  const allPollIds = displayPosts
    .filter((p) => p.poll)
    .map((p) => p.poll!.id);
  const userPollVotes = session?.user?.id && allPollIds.length > 0
    ? await prisma.pollVote.findMany({
        where: { userId: session.user.id, pollId: { in: allPollIds } },
        select: { pollId: true, optionId: true },
      })
    : [];
  const pollVoteMap = new Map(userPollVotes.map((v) => [v.pollId, v.optionId]));

  const serialized = displayPosts.map((post) => ({
    id: post.id,
    content: post.content,
    tickerTag: post.tickerTag,
    predictionDirection: post.predictionDirection ?? null,
    predictionTarget: post.predictionTarget ? String(post.predictionTarget) : null,
    predictionOutcome: post.predictionOutcome ?? null,
    imageUrl: post.imageUrl ?? null,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    repostsCount: post.repostsCount,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name,
      image: getAvatarUrl(post.author.image, post.author.email),
      reputation: post.author.reputation,
      followersCount: post.author._count.followers,
    },
    likedByMe: session?.user?.id ? post.likes.length > 0 : false,
    bookmarkedByMe: session?.user?.id ? (post.bookmarks as { id: string }[]).length > 0 : false,
    repostedByMe: session?.user?.id ? (post.reposts as { id: string }[]).length > 0 : false,
    followingAuthor: followingIds.has(post.author.id),
    authorHoldings: authorHoldingsMap.get(post.author.id),
    repostedBy: null as { username: string; name: string | null } | null,
    poll: post.poll
      ? {
          id: post.poll.id,
          options: post.poll.options.map((o) => ({ id: o.id, text: o.text, votesCount: o.votesCount })),
          myVote: pollVoteMap.get(post.poll.id) ?? null,
        }
      : null,
  }));

  // Fetch reposts from followed users and merge into feed
  if (session?.user?.id && activeTab === "all" && !tag) {
    const followedUsers = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    const followedIds = followedUsers.map((f) => f.followingId);

    if (followedIds.length > 0) {
      const recentReposts = await prisma.repost.findMany({
        where: { userId: { in: followedIds } },
        include: {
          user: { select: { username: true, name: true } },
          post: {
            include: {
              author: { select: { id: true, username: true, name: true, email: true, image: true, reputation: true, _count: { select: { followers: true } } } },
              likes: { where: { userId: session.user.id }, select: { id: true } },
              bookmarks: { where: { userId: session.user.id }, select: { id: true } },
              reposts: { where: { userId: session.user.id }, select: { id: true } },
              poll: { include: { options: { orderBy: { order: "asc" } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Filter out reposts of posts already in the feed + deduplicate among reposts
      const seenIds = new Set(serialized.map((p) => p.id));
      const validReposts = recentReposts.filter((r) => r.post && !seenIds.has(r.post.id) && (seenIds.add(r.post.id), true));

      // Fetch poll votes for repost polls
      const repostPollIds = validReposts
        .filter((r) => r.post.poll)
        .map((r) => r.post.poll!.id);
      const repostPollVotes = repostPollIds.length > 0
        ? await prisma.pollVote.findMany({
            where: { userId: session.user.id, pollId: { in: repostPollIds } },
            select: { pollId: true, optionId: true },
          })
        : [];
      const repostVoteMap = new Map(repostPollVotes.map((v) => [v.pollId, v.optionId]));

      const repostEntries = validReposts
        .map((r) => ({
          id: r.post.id,
          content: r.post.content,
          tickerTag: r.post.tickerTag,
          predictionDirection: r.post.predictionDirection ?? null,
          predictionTarget: r.post.predictionTarget ? String(r.post.predictionTarget) : null,
          predictionOutcome: r.post.predictionOutcome ?? null,
          imageUrl: r.post.imageUrl ?? null,
          likesCount: r.post.likesCount,
          commentsCount: r.post.commentsCount,
          repostsCount: r.post.repostsCount,
          createdAt: r.createdAt.toISOString(),
          author: {
            id: r.post.author.id,
            username: r.post.author.username,
            name: r.post.author.name,
            image: getAvatarUrl(r.post.author.image, r.post.author.email),
            reputation: r.post.author.reputation,
            followersCount: r.post.author._count.followers,
          },
          likedByMe: r.post.likes.length > 0,
          bookmarkedByMe: (r.post.bookmarks as { id: string }[]).length > 0,
          repostedByMe: (r.post.reposts as { id: string }[]).length > 0,
          followingAuthor: followingIds.has(r.post.author.id),
          authorHoldings: authorHoldingsMap.get(r.post.author.id),
          repostedBy: { username: r.user.username, name: r.user.name },
          poll: r.post.poll
            ? {
                id: r.post.poll.id,
                options: r.post.poll.options.map((o) => ({ id: o.id, text: o.text, votesCount: o.votesCount })),
                myVote: repostVoteMap.get(r.post.poll.id) ?? null,
              }
            : null,
        }));

      // Merge and sort by createdAt
      const merged = [...serialized, ...repostEntries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      serialized.length = 0;
      serialized.push(...merged.slice(0, PAGE_SIZE));
    }
  }

  const initialCursor = hasMore ? serialized[serialized.length - 1]?.id : null;

  // Fetch sidebar data in parallel
  const [topContributors, trendingTags, topPredictors] = await Promise.all([
    communityService.getTopContributors(10),
    communityService.getTrendingTagsWithTrend(7, 7, 8),
    communityService.getTopPredictors(10),
  ]);

  const buildTabHref = (tabKey: string, searchVal?: string) => {
    const params = new URLSearchParams();
    if (tabKey && tabKey !== "all") params.set("tab", tabKey);
    if (searchVal) params.set("search", searchVal);
    if (tag) params.set("tag", tag);
    if (currentPage > 1) params.set("page", String(currentPage));
    const qs = params.toString();
    return `/community${qs ? `?${qs}` : ""}`;
  };

  const tabs = [
    { key: "all", label: "Semua", href: buildTabHref("all") },
    { key: "trending", label: "Trending", href: buildTabHref("trending") },
    ...(session?.user?.id ? [{ key: "following", label: "Mengikuti", href: buildTabHref("following") }] : []),
    { key: "predictors", label: "Top Prediktor", href: buildTabHref("predictors") },
    { key: "users", label: "Pengguna", href: buildTabHref("all", "users") },
  ];

  // Build pagination URLs
  const tabParams = tab && tab !== "all" ? `tab=${tab}` : "";
  const tagParams = tag ? `tag=${encodeURIComponent(tag)}` : "";
  const buildPageUrl = (p: number) => {
    const params: string[] = [];
    if (tabParams) params.push(tabParams);
    if (tagParams) params.push(tagParams);
    if (p > 1) params.push(`page=${p}`);
    return `/community${params.length > 0 ? `?${params.join("&")}` : ""}`;
  };
  const prevHref = currentPage > 1 ? buildPageUrl(currentPage - 1) : null;
  const nextHref = currentPage < totalPages ? buildPageUrl(currentPage + 1) : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Komunitas Saham BEI",
        url: `${SITE_URL}/community`,
        ...(totalPages > 1 ? { potentialAction: {
          "@type": "ReadAction",
          target: Array.from({ length: Math.min(totalPages, 10) }, (_, i) => `${SITE_URL}/community?page=${i + 1}`),
        } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Komunitas", item: `${SITE_URL}/community` },
        ],
      },
    ],
  };

  // rel=next/prev link tags for SEO
  const relLinks = (
    <>
      {prevHref && <link rel="prev" href={prevHref} />}
      {nextHref && <link rel="next" href={nextHref} />}
    </>
  );

  return (
    <>
      {relLinks}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <div className="fade-in min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="community-hero border-b border-slate-700/50" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Komunitas</span>{" "}
              <span className="text-slate-300">Saham</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg">
              Diskusi analisa teknikal, sharing sinyal, dan strategi trading saham IDX bareng komunitas TeknikalID.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-teal-300 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" />
              DISKUSI SAHAM
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-emerald-300 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              IDX COMMUNITY
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-700/50 -mb-8 sm:-mb-10 pt-2">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 relative ${
                  activeTab === t.key
                    ? "text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
                {activeTab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-t" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main content — Threads-like layout */}
      <div className="max-w-[960px] mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Feed column */}
          <div className="flex-1 min-w-0">
            {/* Composer */}
            {session?.user?.id ? (
              <div className="mb-4">
                <PostComposer />
              </div>
            ) : (
              <div className="bg-white rounded-xl p-4 text-center mb-4 border border-gray-200">
                <p className="text-sm text-gray-500">
                  <Link href="/auth/signin" className="text-teal-600 hover:underline font-semibold">
                    Masuk
                  </Link>{" "}
                  untuk bergabung dalam diskusi
                </p>
              </div>
            )}

            {/* Tag filter banner */}
            {tag && !searchMode && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-sm text-gray-500">Filter: <span className="font-semibold text-gray-900">#{tag}</span></span>
                <Link href="/community" className="text-xs text-teal-600 hover:underline">Hapus filter</Link>
              </div>
            )}

            {/* User search, Predictors, or Feed */}
            {searchMode ? (
              <UserSearchResults topContributors={topContributors} />
            ) : activeTab === "predictors" ? (
              <TopPredictorList users={topPredictors} />
            ) : (
            <>
            {serialized.length > 0 ? (
              <Suspense fallback={<div className="h-10" />}>
                <CommunitySection initialPosts={serialized} initialCursor={initialCursor} activeTab={activeTab} />
              </Suspense>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center space-y-3">
                <p className="text-lg font-bold text-gray-900">Mulai Diskusi Pertama</p>
                <p className="text-sm text-gray-500">
                  {activeTab === "following"
                    ? "Belum ada postingan dari trader yang kamu ikuti. Yuk explore tab Semua dulu!"
                    : "Share analisa teknikal atau sinyal saham IDX kamu ke komunitas!"}
                </p>
              </div>
            )}
            </>
            )}

            {/* Server-rendered pagination bar for SEO crawlability */}
            {totalPages > 1 && !searchMode && activeTab !== "predictors" && (
              <nav className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-200" aria-label="Pagination">
                {prevHref ? (
                  <Link
                    href={prevHref}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    ← Sebelumnya
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed">
                    ← Sebelumnya
                  </span>
                )}
                <span className="text-sm text-gray-500 font-mono">
                  Halaman {currentPage} dari {totalPages}
                </span>
                {nextHref ? (
                  <Link
                    href={nextHref}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    Selanjutnya →
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed">
                    Selanjutnya →
                  </span>
                )}
              </nav>
            )}
          </div>

          {/* Right sidebar — desktop only */}
          <div className="w-[280px] shrink-0 hidden lg:flex flex-col gap-4 sticky top-20 self-start">
            <TopKontributorSidebar users={topContributors} />
            {topPredictors.length > 0 && <TopPredictorList users={topPredictors} />}
            <TrendingSidebar tags={trendingTags} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
