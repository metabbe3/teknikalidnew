"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { timeAgo } from "@/lib/time";
import { ReportButton } from "./report-button";
import { BookmarkButton } from "./bookmark-button";
import { StockAttachmentCard } from "./stock-attachment-card";
import { ReputationBadge } from "./reputation-badge";
import { FollowButton } from "./follow-button";
import { renderContent } from "./render-content";
import type { Post } from "@/hooks/use-posts";

function PostMenu({
  postId,
  postContent,
  isAuthor,
  isAdmin,
}: {
  postId: string;
  postContent: string;
  isAuthor: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(postContent);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

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

  if (!isAuthor && !isAdmin) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setConfirmDelete(false); }} />
          <div className="absolute right-0 top-8 z-20 bg-bg-card rounded-lg depth-shadow border border-border py-1 min-w-[140px]">
            {(isAuthor || isAdmin) && (
              <button
                onClick={() => { setEditing(true); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-left px-3 py-2 text-sm text-bearish hover:bg-bg-hover transition-colors"
            >
              Hapus
            </button>
            {confirmDelete && (
              <div className="px-3 py-2 border-t border-border">
                <p className="text-xs text-text-tertiary mb-2">Yakin ingin menghapus?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-xs bg-bearish text-white px-3 py-1 rounded font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-text-tertiary hover:text-text-secondary px-2 py-1"
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
          <div className="bg-bg-card rounded-xl depth-shadow p-4 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Edit Post</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full rounded-lg border border-border bg-bg-primary text-text-primary text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-text-tertiary hover:text-text-secondary px-3 py-1.5"
              >
                Batal
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editContent.trim()}
                className="text-sm bg-accent text-white px-4 py-1.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
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
}

export function PostCard({ post }: PostCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });
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

  const authorInitial = (
    post.author.name?.[0] ?? post.author.username[0]
  ).toUpperCase();

  return (
    <article className="bg-bg-card rounded-xl depth-shadow border border-border p-4 transition-all duration-200 hover:bg-bg-hover border-l-[3px] border-l-teal-500/60">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/profile/${post.author.username}`} className="shrink-0">
            {post.author.image ? (
              <img
                src={post.author.image}
                alt={post.author.username}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-teal-500/20 hover:ring-teal-500/40 transition-all"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-sm font-bold ring-2 ring-teal-500/20 hover:ring-teal-500/40 transition-all">
                {authorInitial}
              </div>
            )}
          </Link>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Link
              href={`/profile/${post.author.username}`}
              className="text-sm font-semibold text-text-primary hover:underline"
            >
              {post.author.username}
            </Link>
            {post.author.reputation != null && post.author.reputation > 0 && (
              <ReputationBadge reputation={post.author.reputation} />
            )}
            {post.author.followersCount != null && post.author.followersCount > 0 && (
              <span className="text-[10px] text-text-tertiary">
                {post.author.followersCount} pengikut
              </span>
            )}
            <span className="text-text-secondary text-xs">
              {timeAgo(post.createdAt)}
            </span>
          </div>
          <FollowButton userId={post.author.id} size="sm" initialFollowing={post.followingAuthor} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <PostMenu
            postId={post.id}
            postContent={post.content}
            isAuthor={session?.user?.id === post.author.id}
            isAdmin={session?.user?.role === "ADMIN"}
          />
          <BookmarkButton postId={post.id} initialBookmarked={post.bookmarkedByMe} />
          <ReportButton targetType="POST" targetId={post.id} />
        </div>
      </div>

      {/* Thread line + content */}
      <div className="flex gap-3 mt-1">
        {/* Thread line */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-9" />
          <div className="w-px flex-1 bg-teal-500/20" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Content */}
          <div className="mt-2">
            <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
              {renderContent(post.content)}
            </p>
          </div>

          {/* Stock attachment */}
          {post.tickerTag && (
            <StockAttachmentCard
              tickerTag={post.tickerTag}
              predictionDirection={post.predictionDirection}
              predictionTarget={post.predictionTarget}
            />
          )}

          {/* AI generated image */}
          {post.imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <img
                src={post.imageUrl}
                alt="AI generated illustration"
                className="w-full h-auto max-h-80 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <button
              onClick={() => {
                if (!session?.user) {
                  router.push("/auth/signin");
                  return;
                }
                likeMutation.mutate();
              }}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 px-2 py-1 -ml-2 rounded-lg ${liked ? "bg-red-50 hover:bg-red-100" : "hover:bg-bg-hover"}`}
              aria-label={liked ? "Batal suka" : "Suka"}
            >
              {liked ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-bearish"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-text-secondary"
                >
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
              <span className={liked ? "text-bearish" : "text-text-secondary"}>
                {likesCount}
              </span>
            </button>

            <Link
              href={`/community/post/${post.id}`}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded-lg hover:bg-bg-hover"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              <span>{post.commentsCount}</span>
            </Link>

            <Link
              href={`/community/post/${post.id}`}
              className="ml-auto text-xs text-teal-600 hover:underline font-medium"
            >
              Lihat detail
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
