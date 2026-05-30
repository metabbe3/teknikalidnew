"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeAgo } from "@/lib/time";
import { useDeleteComment } from "@/hooks/use-comments";
import { renderContent } from "./render-content";
import { CommentForm } from "./comment-form";
import { ReportButton } from "./report-button";

export interface CommentAuthor {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

export interface CommentParent {
  id: string;
  content: string;
  author: CommentAuthor;
}

export interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  parentId: string | null;
  parent?: CommentParent | null;
  createdAt: string;
  replies?: Comment[];
}

interface CommentListProps {
  comments: Comment[];
  postId?: string;
  stockTicker?: string;
  currentUserId?: string;
  userRole?: string;
}

function QuoteBlock({ parent }: { parent: CommentParent }) {
  const preview = parent.content.length > 100
    ? parent.content.slice(0, 100) + "..."
    : parent.content;

  return (
    <div className="flex gap-2 mt-1.5 px-3 py-2 rounded-lg bg-bg-hover/60 border-l-2 border-accent/30">
      <span className="text-xs text-accent font-medium shrink-0">
        @{parent.author.username}
      </span>
      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
        {preview}
      </p>
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  stockTicker,
  currentUserId,
  userRole,
}: {
  comment: Comment;
  postId?: string;
  stockTicker?: string;
  currentUserId?: string;
  userRole?: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const deleteComment = useDeleteComment();
  const isOwner = currentUserId === comment.author.id;
  const isAdmin = userRole === "ADMIN";
  const canDelete = isOwner || isAdmin;
  const authorInitial = (
    comment.author.name?.[0] ?? comment.author.username[0]
  ).toUpperCase();
  const isRecent = Date.now() - new Date(comment.createdAt).getTime() < 5 * 60 * 1000;
  const isReply = !!comment.parentId;

  return (
    <div className={isReply ? "ml-8 border-l-2 border-border pl-4" : ""}>
      <div className="flex items-start gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-bg-hover/50 transition-colors">
        {comment.author.image ? (
          <img
            src={comment.author.image}
            alt={comment.author.username}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {authorInitial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {comment.author.username}
            </span>
            {isRecent && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-bullish-bg text-bullish">
                Baru
              </span>
            )}
            <span className="text-text-secondary text-xs">
              {timeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Quote block for replies */}
          {comment.parent && (
            <QuoteBlock parent={comment.parent} />
          )}

          {/* Content */}
          <p className="mt-1 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {renderContent(comment.content)}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setShowReplyForm((prev) => !prev)}
              className="px-2 py-1 -ml-2 rounded text-xs text-text-secondary hover:text-accent hover:bg-accent/[0.06] transition-colors"
            >
              {showReplyForm ? "Batal" : "Balas"}
            </button>

            {canDelete && (
              <button
                onClick={() => deleteComment.mutate(comment.id)}
                disabled={deleteComment.isPending}
                className="px-2 py-1 -ml-2 rounded text-xs text-text-secondary hover:text-bearish hover:bg-bearish/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hapus
              </button>
            )}

            <ReportButton targetType="COMMENT" targetId={comment.id} />
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-2">
              <CommentForm
                postId={postId}
                stockTicker={stockTicker}
                parentId={comment.id}
                inline
                onCommentAdded={() => setShowReplyForm(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentList({
  comments,
  postId,
  stockTicker,
  currentUserId,
  userRole,
}: CommentListProps) {
  const { data: postData } = useQuery<Comment[]>({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const json = await res.json();
      return json.data;
    },
    initialData: comments,
    enabled: !!postId,
  });

  // Stock discussions: parent (stock-discussion.tsx) owns the query, use props directly
  const data = postId ? postData : comments;

  if (data.length === 0) {
    return (
      <p className="text-text-secondary text-sm text-center py-6">
        Belum ada komentar. Jadilah yang pertama!
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {data.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          stockTicker={stockTicker}
          currentUserId={currentUserId}
          userRole={userRole}
        />
      ))}
    </div>
  );
}
