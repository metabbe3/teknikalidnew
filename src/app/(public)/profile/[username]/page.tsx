import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/community/post-card";
import { FollowButton } from "@/components/community/follow-button";
import { ReputationBadge } from "@/components/community/reputation-badge";

export const revalidate = 60;

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
      name: true,
      username: true,
      image: true,
      bio: true,
      reputation: true,
      socialLinks: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          watchlist: true,
          followers: true,
          following: true,
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
          id: true, username: true, name: true, image: true,
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
    },
  });

  const isFollowingAuthor = session?.user?.id
    ? !!(await prisma.follow.findFirst({ where: { followerId: session.user.id, followingId: user.id } }))
    : false;

  const serializedPosts = posts.map((post) => ({
    id: post.id,
    content: post.content,
    tickerTag: post.tickerTag,
    predictionDirection: post.predictionDirection ?? null,
    predictionTarget: post.predictionTarget ? String(post.predictionTarget) : null,
    imageUrl: post.imageUrl ?? null,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt.toISOString(),
    author: {
      ...post.author,
      followersCount: post.author._count.followers,
    },
    likedByMe: session?.user?.id ? post.likes.length > 0 : false,
    bookmarkedByMe: session?.user?.id ? (post.bookmarks as { id: string }[]).length > 0 : false,
    followingAuthor: isFollowingAuthor,
  }));

  const isOwner = session?.user?.id === user.id;
  const links = (user.socialLinks as SocialLinks | null) ?? {};

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
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || user.username}
                  className="w-16 h-16 rounded-full object-cover ring-3 ring-teal-500/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-xl font-bold ring-3 ring-teal-500/20">
                  {(user.name || user.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">
                  {user.name || user.username}
                </h1>
                {user.reputation > 0 && (
                  <ReputationBadge reputation={user.reputation} />
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
          </div>
        </div>
      </div>

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
    </div>
  );
}
