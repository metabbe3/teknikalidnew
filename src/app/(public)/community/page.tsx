import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { socialGraphService } from "@/domains/social/social-graph.service";


export const dynamic = "force-dynamic";

import Link from "next/link";
import { PostComposer } from "@/components/community/post-composer";
import { CommunityFeed } from "@/components/community/community-feed";
import { Leaderboard } from "@/components/community/leaderboard";

export const metadata: Metadata = {
  title: "Komunitas Saham BEI — Diskusi Analisa Teknikal",
  description: "Komunitas trader Indonesia untuk diskusi analisa teknikal saham BEI. Bagikan prediksi harga, chart, dan strategi trading bersama ribuan trader.",
  alternates: { canonical: "/community" },
};

export const revalidate = 60;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const { tab } = await searchParams;
  const activeTab = tab === "trending" || tab === "following" ? tab : "all";

  const posts = await prisma.post.findMany({
    where: activeTab === "trending"
      ? { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      : activeTab === "following" && session?.user?.id
        ? (await socialGraphService.buildFollowingFilter(session.user.id)) ?? undefined
        : undefined,
    include: {
      author: { select: { id: true, username: true, name: true, image: true, reputation: true, _count: { select: { followers: true } } } },
      comments: { take: 0, select: { id: true } },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : { select: { userId: true } },
      bookmarks: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
    orderBy: activeTab === "trending"
      ? [{ likesCount: "desc" }, { commentsCount: "desc" }, { createdAt: "desc" }]
      : { createdAt: "desc" },
    take: 21,
  });

  const hasMore = posts.length > 20;
  const displayPosts = hasMore ? posts.slice(0, 20) : posts;

  const uniqueAuthorIds = [...new Set(displayPosts.map(p => p.author.id))];
  const follows = session?.user?.id
    ? await prisma.follow.findMany({
        where: { followerId: session.user.id, followingId: { in: uniqueAuthorIds } },
        select: { followingId: true },
      })
    : [];
  const followingIds = new Set(follows.map(f => f.followingId));

  const serialized = displayPosts.map((post) => ({
    id: post.id,
    content: post.content,
    tickerTag: post.tickerTag,
    predictionDirection: post.predictionDirection ?? null,
    predictionTarget: post.predictionTarget ? String(post.predictionTarget) : null,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name,
      image: post.author.image,
      reputation: post.author.reputation,
      followersCount: post.author._count.followers,
    },
    likedByMe: session?.user?.id ? post.likes.length > 0 : false,
    bookmarkedByMe: session?.user?.id ? (post.bookmarks as { id: string }[]).length > 0 : false,
    followingAuthor: followingIds.has(post.author.id),
  }));

  const initialCursor = hasMore ? serialized[serialized.length - 1].id : null;

  const tabs = [
    { key: "all", label: "Semua", href: "/community" },
    { key: "trending", label: "Trending", href: "/community?tab=trending" },
    ...(session?.user?.id ? [{ key: "following", label: "Mengikuti", href: "/community?tab=following" }] : []),
  ];

  return (
    <div className="fade-in">
      {/* Dark Terminal Hero */}
      <section className="community-hero border-b border-slate-700/50">
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Komunitas</span>{" "}
              <span className="text-slate-300">Saham</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg">
              Diskusi dan analisis saham IDX bersama komunitas TeknikalID
            </p>
          </div>

          {/* Terminal stat pills */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-teal-300 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" />
              DISKUSI SAHAM
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-emerald-300 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              IDX COMMUNITY
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-slate-400 tracking-wider">
              ANALISIS TEKNIKAL
            </span>
          </div>

          {/* Tabs inside hero */}
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

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,640px)_280px] gap-6">
          <div className="space-y-6">
            {session?.user?.id ? (
              <PostComposer />
            ) : (
              <div className="depth-shadow rounded-xl p-5 text-center space-y-3 bg-bg-card border border-border" style={{ borderTop: "3px solid #0d9488" }}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal-600" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-text-secondary">
                  <Link href="/auth/signin" className="text-teal-600 hover:underline font-semibold">
                    Masuk
                  </Link>{" "}
                  untuk bergabung dalam diskusi
                </p>
              </div>
            )}

            {serialized.length > 0 ? (
              <CommunityFeed initialPosts={serialized} initialCursor={initialCursor} activeTab={activeTab} />
            ) : (
              <div className="depth-shadow rounded-2xl bg-bg-card border border-border overflow-hidden">
                <div className="relative px-6 py-12 text-center space-y-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-teal-100/40 to-transparent rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
                  <div className="relative space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal-600" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-bold text-text-primary">Jadilah yang Pertama Berdiskusi</p>
                    <p className="text-sm text-text-secondary">
                      {activeTab === "following"
                        ? "Belum ada post dari orang yang Anda ikuti. Ikuti orang atau saham untuk melihat post mereka di sini."
                        : "Mulai diskusi analisis teknikal saham IDX Anda!"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 hidden lg:block">
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
