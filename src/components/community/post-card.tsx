"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { timeAgo } from "@/lib/time";
import { BookmarkButton } from "./bookmark-button";
import { StockAttachmentCard } from "./stock-attachment-card";
import { ReputationBadge } from "./reputation-badge";
import { FollowButton } from "./follow-button";
import { ShareModal } from "./share-modal";
import { renderContent } from "./render-content";
import { useRepostToggle } from "@/hooks/use-posts";
import { ReactionBar } from "./reaction-bar";
import { PollDisplay } from "./poll-display";
import { useToggleBlock } from "@/hooks/use-block";
import type { Post } from "@/hooks/use-posts";

const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Pelecehan" },
  { value: "MISINFORMATION", label: "Misinformasi" },
  { value: "OTHER", label: "Lainnya" },
];

function PostMenu({
  postId,
  postContent,
  isAuthor,
  isAdmin,
  authorId,
}: {
  postId: string;
  postContent: string;
  isAuthor: boolean;
  isAdmin: boolean;
  authorId: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(postContent);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const queryClient = useQueryClient();

  const canEdit = isAuthor || isAdmin;
  const toggleBlock = useToggleBlock();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error("Gagal mengupdate");
      return res.json();
    },
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "POST", targetId: postId, reason }),
      });
      if (!res.ok) throw new Error("Gagal melaporkan");
      return res.json();
    },
    onSuccess: () => {
      setReported(true);
      setOpen(false);
    },
  });

  const closeMenu = () => {
    setOpen(false);
    setConfirmDelete(false);
    setShowReport(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Opsi lainnya"
        className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeMenu} />
          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[160px]">
            {canEdit && (
              <>
                <button
                  onClick={() => { setEditing(true); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                >
                  Hapus
                </button>
              </>
            )}
            {isAuthor && (
              <button
                onClick={() => {
                  fetch(`/api/posts/${postId}/pin`, { method: "POST" });
                  setOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["posts"] });
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Sematkan
              </button>
            )}
            {canEdit && !reported && <div className="my-1 border-t border-gray-100" />}
            {!reported ? (
              showReport ? (
                <>
                  <button
                    onClick={() => setShowReport(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    ← Kembali
                  </button>
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => reportMutation.mutate(reason.value)}
                      disabled={reportMutation.isPending}
                      className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {reason.label}
                    </button>
                  ))}
                </>
              ) : (
                <button
                  onClick={() => setShowReport(true)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Laporkan
                </button>
              )
            ) : (
              <span className="block px-3 py-2 text-xs text-gray-400">Terlapor</span>
            )}
            {!isAuthor && (
              <button
                onClick={() => { toggleBlock.mutate(authorId); closeMenu(); }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
              >
                Blokir
              </button>
            )}
            {confirmDelete && (
              <div className="px-3 py-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Yakin ingin menghapus?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Menghapus…" : "Hapus"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit Post</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm p-3 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:border-teal-500"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5"
              >
                Batal
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editContent.trim()}
                className="text-sm bg-teal-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PostCardProps {
  post: Post;
  repostedBy?: { username: string; name: string | null } | null;
}

export function PostCard({ post, repostedBy }: PostCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [reposted, setReposted] = useState(post.repostedByMe ?? false);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount ?? 0);
  const [showShare, setShowShare] = useState(false);

  const repostMutation = useRepostToggle();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyukai");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousLiked = liked;
      const previousCount = likesCount;
      setLiked(!liked);
      setLikesCount((c) => (liked ? c - 1 : c + 1));
      return { previousLiked, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        setLiked(context.previousLiked);
        setLikesCount(context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const handleRepost = () => {
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    const wasReposted = reposted;
    setReposted(!reposted);
    setRepostsCount((c) => (wasReposted ? c - 1 : c + 1));
    repostMutation.mutate(
      { postId: post.id, reposted: wasReposted },
      {
        onError: () => {
          setReposted(wasReposted);
          setRepostsCount((c) => (wasReposted ? c + 1 : c - 1));
        },
      }
    );
  };

  const authorInitial = (post.author.name?.[0] ?? post.author.username[0]).toUpperCase();

  return (
    <>
      <article className="bg-white border-b border-gray-100 px-4 py-3 hover:bg-gray-50/50 transition-colors">
        {/* Repost header */}
        {repostedBy && (
          <div className="flex items-center gap-1.5 ml-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            <span className="text-[11px] text-gray-400 font-medium">
              Dipost ulang oleh{" "}
              <Link href={`/profile/${repostedBy.username}`} className="text-gray-600 hover:underline font-semibold">
                {repostedBy.name ?? repostedBy.username}
              </Link>
            </span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <Link href={`/profile/${post.author.username}`} className="shrink-0 pt-0.5">
            {post.author.image ? (
              <img
                src={post.author.image}
                alt={post.author.username}
                className="w-9 h-9 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold">
                {(post.author.name || post.author.username)[0].toUpperCase()}
              </div>
            )}
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Link
                  href={`/profile/${post.author.username}`}
                  className="text-[13px] font-bold text-gray-900 hover:underline truncate"
                >
                  {post.author.name ?? post.author.username}
                </Link>
                {post.author.reputation != null && post.author.reputation > 0 && (
                  <ReputationBadge reputation={post.author.reputation} customTitle={post.author.customTitle} />
                )}
                <span className="text-[12px] text-gray-400">
                  @{post.author.username}
                </span>
                <span className="text-[12px] text-gray-300">·</span>
                <span className="text-[12px] text-gray-400">
                  {timeAgo(post.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {!repostedBy && (
                  <FollowButton userId={post.author.id} size="sm" initialFollowing={post.followingAuthor} />
                )}
                <PostMenu
                  postId={post.id}
                  postContent={post.content}
                  isAuthor={session?.user?.id === post.author.id}
                  isAdmin={session?.user?.role === "ADMIN"}
                  authorId={post.author.id}
                />
              </div>
            </div>

            {/* Post body */}
            <div className="mt-1">
              {(post as { pinned?: boolean }).pinned && (
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                  Disematkan
                </div>
              )}
              <p className="text-[13px] text-gray-900 leading-relaxed whitespace-pre-wrap">
                {renderContent(post.content)}
              </p>
            </div>

            {/* Stock attachment */}
            {post.tickerTag && (
              <div className="mt-2">
                <StockAttachmentCard
                  tickerTag={post.tickerTag}
                  predictionDirection={post.predictionDirection}
                  predictionTarget={post.predictionTarget}
                  predictionOutcome={post.predictionOutcome}
                />
              </div>
            )}

            {/* Image */}
            {post.imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full h-auto max-h-80 object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Poll */}
            {post.poll && (
              <PollDisplay poll={post.poll} postId={post.id} />
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between mt-2 -ml-2 max-w-[300px]">
              {/* Reactions */}
              <ReactionBar postId={post.id} reactions={post.reactions} myReaction={post.myReaction} />

              {/* Comment */}
              <Link
                href={`/community/post/${post.id}`}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors px-2 py-1 rounded-full"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
              </Link>

              {/* Repost */}
              <button
                onClick={handleRepost}
                disabled={repostMutation.isPending}
                className={`flex items-center gap-1 text-[12px] transition-colors px-2 py-1 rounded-full ${
                  reposted
                    ? "text-green-500"
                    : "text-gray-400 hover:text-green-500 hover:bg-green-50"
                }`}
                aria-label={reposted ? "Batalkan post ulang" : "Post ulang"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
                {repostsCount > 0 && <span>{repostsCount}</span>}
              </button>

              {/* Share */}
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-teal-500 hover:bg-teal-50 transition-colors px-2 py-1 rounded-full"
                aria-label="Bagikan"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>

              {/* Bookmark */}
              <BookmarkButton postId={post.id} initialBookmarked={post.bookmarkedByMe} />
            </div>
          </div>
        </div>
      </article>

      {showShare && (
        <ShareModal postId={post.id} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}
