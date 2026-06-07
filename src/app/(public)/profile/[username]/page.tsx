import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { communityService } from "@/domains/community/community.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import { PostCard } from "@/components/community/post-card";
import { FollowButton } from "@/components/community/follow-button";
import { ReputationBadge } from "@/components/community/reputation-badge";
import { PublicPortfolio } from "@/components/portfolio/public-portfolio";
import { decimalToNumber } from "@/lib/serialize";
import { ProfileAchievements } from "@/components/community/profile-achievements";
import { getAvatarUrl } from "@/lib/avatar";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, bio: true },
  });
  if (!user) return {};

  const title = `${user.name} (@${username}) — TeknikalID`;
  const description = user.bio?.slice(0, 160) ?? `Profil ${user.name} di TeknikalID — komunitas analisa teknikal saham BEI.`;

  return {
    title,
    description,
    alternates: { canonical: `/profile/${username}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/profile/${username}`,
      type: "profile",
    },
    twitter: { card: "summary", title, description },
  };
}

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
}

const SOCIAL_ICONS: { key: keyof SocialLinks; label: string; color: string }[] = [
  { key: "twitter", label: "Twitter / X", color: "hover:bg-black hover:text-white" },
  { key: "instagram", label: "Instagram", color: "hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 hover:text-white" },
  { key: "facebook", label: "Facebook", color: "hover:bg-blue-600 hover:text-white" },
  { key: "linkedin", label: "LinkedIn", color: "hover:bg-blue-700 hover:text-white" },
  { key: "youtube", label: "YouTube", color: "hover:bg-red-600 hover:text-white" },
];

const SOCIAL_SHORT: Record<string, string> = {
  twitter: "𝕏",
  instagram: "IG",
  facebook: "FB",
  linkedin: "LI",
  youtube: "YT",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      reputation: true,
      customTitle: true,
      socialLinks: true,
      createdAt: true,
      portfolioPublic: true,
      _count: {
        select: {
          posts: true,
          watchlist: true,
          followers: true,
          following: true,
          portfolioHoldings: true,
        },
      },
    },
  });

  if (!user) notFound();

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      author: {
        select: {
          id: true, username: true, name: true, email: true, image: true,
          reputation: true,
          _count: { select: { followers: true } },
        },
      },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : { select: { userId: true } },
      bookmarks: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
      reposts: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
  });

  // Fetch user's reposts with original post data
  const userReposts = await prisma.repost.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      post: {
        include: {
          author: {
            select: {
              id: true, username: true, name: true, email: true, image: true,
              reputation: true,
              _count: { select: { followers: true } },
            },
          },
          likes: session?.user?.id
            ? { where: { userId: session.user.id }, select: { id: true } }
            : { select: { userId: true } },
          bookmarks: session?.user?.id
            ? { where: { userId: session.user.id }, select: { id: true } }
            : false,
          reposts: session?.user?.id
            ? { where: { userId: session.user.id }, select: { id: true } }
            : false,
        },
      },
    },
  });

  const repostCount = await prisma.repost.count({ where: { userId: user.id } });

  const isFollowingAuthor = session?.user?.id
    ? !!(await prisma.follow.findFirst({ where: { followerId: session.user.id, followingId: user.id } }))
    : false;

  const predictionStats = await communityService.getUserPredictionStats(user.id);

  const engagement = await prisma.post.aggregate({
    where: { authorId: user.id },
    _sum: { likesCount: true, commentsCount: true },
  });

  const serializedPosts = posts.map((post) => ({
    id: post.id,
    content: post.content,
    tickerTag: post.tickerTag,
    predictionDirection: post.predictionDirection ?? null,
    predictionTarget: post.predictionTarget ? String(post.predictionTarget) : null,
    predictionOutcome: post.predictionOutcome ?? null,
    imageUrl: post.imageUrl ?? null,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    repostsCount: post.repostsCount ?? 0,
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
    followingAuthor: isFollowingAuthor,
    repostedBy: null as { username: string; name: string | null } | null,
  }));

  const serializedReposts = userReposts
    .filter((r) => r.post)
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
      createdAt: r.post.createdAt.toISOString(),
      author: {
        id: r.post.author.id,
        username: r.post.author.username,
        name: r.post.author.name,
        image: getAvatarUrl(r.post.author.image, r.post.author.email),
        reputation: r.post.author.reputation,
        followersCount: r.post.author._count.followers,
      },
      likedByMe: session?.user?.id ? r.post.likes.length > 0 : false,
      bookmarkedByMe: session?.user?.id ? (r.post.bookmarks as { id: string }[]).length > 0 : false,
      repostedByMe: session?.user?.id ? (r.post.reposts as { id: string }[]).length > 0 : false,
      followingAuthor: isFollowingAuthor,
      repostedBy: { username: user.username, name: user.name },
    }));

  const isOwner = session?.user?.id === user.id;
  const links = (user.socialLinks as SocialLinks | null) ?? {};

  // Fetch portfolio holdings for public display
  let portfolioHoldings: Array<{
    ticker: string;
    name: string;
    sector: string;
    allocation: number;
    buyDateMonth: string;
    rsi14: number | null;
    macdSignal: string | null;
  }> = [];
  let sectorBreakdown: Record<string, number> = {};

  if (user.portfolioPublic || isOwner) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId: user.id },
      include: {
        stock: {
          select: {
            ticker: true,
            name: true,
            sector: true,
            prices: {
              orderBy: { date: "desc" },
              take: 1,
              select: { close: true },
            },
            indicators: {
              where: { interval: "1d" },
              orderBy: { date: "desc" },
              take: 1,
              select: { rsi14: true, macdHist: true },
            },
          },
        },
      },
    });

    const totalValue = holdings.reduce((sum, h) => {
      const currentPrice = h.stock.prices[0]
        ? decimalToNumber(h.stock.prices[0].close) ?? Number(h.buyPrice)
        : Number(h.buyPrice);
      return sum + currentPrice * h.quantity;
    }, 0);

    portfolioHoldings = holdings.map((h) => {
      const currentPrice = h.stock.prices[0]
        ? decimalToNumber(h.stock.prices[0].close)
        : null;
      const marketValue = currentPrice !== null ? currentPrice * h.quantity : Number(h.buyPrice) * h.quantity;
      const indicator = h.stock.indicators?.[0];
      const macdHist = indicator ? decimalToNumber(indicator.macdHist) : null;

      return {
        ticker: h.stockTicker,
        name: h.stock.name,
        sector: h.stock.sector,
        allocation: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
        buyDateMonth: h.buyDate.toISOString().slice(0, 7),
        rsi14: indicator ? decimalToNumber(indicator.rsi14) : null,
        macdSignal: macdHist !== null ? (macdHist > 0 ? "Bullish" : "Bearish") : null,
      };
    });

    portfolioHoldings.forEach((h) => {
      sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] ?? 0) + h.allocation;
    });
  }

  const showPortfolio = user.portfolioPublic || isOwner;

  const joinDate = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 fade-in">
      {/* Profile header */}
      <div className="bg-bg-card depth-shadow rounded-xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <img
                src={getAvatarUrl(user.image, user.email, 128)}
                alt={user.name || user.username}
                className="w-16 h-16 rounded-full object-cover ring-3 ring-teal-500/20"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">
                  {user.name || user.username}
                </h1>
                {user.reputation > 0 && (
                  <ReputationBadge reputation={user.reputation} customTitle={user.customTitle} />
                )}
                {isOwner ? (
                  <Link
                    href="/profile/edit"
                    className="text-xs bg-bg-hover text-text-secondary px-2.5 py-1 rounded-full hover:text-text-primary transition-colors press-scale border border-border"
                  >
                    Pengaturan
                  </Link>
                ) : (
                  <FollowButton userId={user.id} size="md" />
                )}
              </div>
              <p className="text-sm text-text-secondary font-mono">@{user.username}</p>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-text-primary leading-relaxed">{user.bio}</p>
          )}

          {/* Social links */}
          {Object.keys(links).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {SOCIAL_ICONS.filter((s) => links[s.key]).map((social) => {
                const url = links[social.key];
                if (!url) return null;
                return (
                  <a
                    key={social.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.label}
                    className={`w-8 h-8 rounded-lg bg-bg-hover border border-border flex items-center justify-center text-[9px] font-bold text-text-secondary transition-all duration-200 ${social.color}`}
                  >
                    {SOCIAL_SHORT[social.key]}
                  </a>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-text-secondary pt-1">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Bergabung {joinDate}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
              <strong className="font-semibold text-text-primary">{user._count.posts}</strong>
              <span className="text-text-secondary">post</span>
            </span>
            {repostCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500" aria-hidden="true">
                  <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
                <strong className="font-semibold text-text-primary">{repostCount}</strong>
                <span className="text-text-secondary">repost</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
              <strong className="font-semibold text-text-primary">{user._count.followers}</strong>
              <span className="text-text-secondary">pengikut</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
              <strong className="font-semibold text-text-primary">{user._count.following}</strong>
              <span className="text-text-secondary">mengikuti</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
              <strong className="font-semibold text-text-primary">{user._count.watchlist}</strong>
              <span className="text-text-secondary">pantauan</span>
            </span>
            {showPortfolio && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-500" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                <strong className="font-semibold text-text-primary">{user._count.portfolioHoldings}</strong>
                <span className="text-text-secondary">porto</span>
              </span>
            )}
            {(engagement._sum.likesCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-hover text-xs">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-bearish" aria-hidden="true"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                <strong className="font-semibold text-text-primary">{engagement._sum.likesCount?.toLocaleString()}</strong>
                <span className="text-text-secondary">suka</span>
              </span>
            )}
            {predictionStats.total > 0 && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                (predictionStats.accuracy ?? 0) >= 60
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : (predictionStats.accuracy ?? 0) >= 40
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <strong className="font-semibold">{predictionStats.accuracy}%</strong>
                <span>akurasi prediksi</span>
                <span className="opacity-60">({predictionStats.correct}/{predictionStats.total})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <ProfileAchievements userId={user.id} />

      {/* Portfolio section */}
      {showPortfolio && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-teal-500 rounded-full" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Portofolio</h2>
            {!user.portfolioPublic && isOwner && (
              <span className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 rounded bg-bg-hover">PRIVAT — hanya kamu yang lihat</span>
            )}
          </div>
          <div className="bg-bg-card depth-shadow rounded-xl p-5 border border-border" style={{ borderTop: "3px solid #0d9488" }}>
            <PublicPortfolio holdings={portfolioHoldings} sectorBreakdown={sectorBreakdown} />
          </div>
        </div>
      )}

      {/* Recent posts */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-teal-500 rounded-full" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Post Terbaru</h2>
        </div>

        {serializedPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">Belum ada post.</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-grid">
            {serializedPosts.map((post, i) => (
              <div key={post.id} style={{ "--stagger-i": i } as React.CSSProperties}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reposts */}
      {serializedReposts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-green-500 rounded-full" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Dipost Ulang</h2>
            <span className="text-xs text-text-tertiary font-mono">{repostCount}</span>
          </div>
          <div className="space-y-3 stagger-grid">
            {serializedReposts.map((post, i) => (
              <div key={`${post.id}-repost`} style={{ "--stagger-i": i } as React.CSSProperties}>
                <PostCard post={post} repostedBy={post.repostedBy ?? undefined} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
