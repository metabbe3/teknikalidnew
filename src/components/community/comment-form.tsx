"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCreateComment } from "@/hooks/use-comments";
import { getUserInitials } from "@/lib/utils";

interface CommentFormProps {
  postId?: string;
  stockTicker?: string;
  parentId?: string;
  onCommentAdded?: () => void;
  inline?: boolean;
  placeholder?: string;
}

export function CommentForm({
  postId,
  stockTicker,
  parentId,
  onCommentAdded,
  inline = false,
  placeholder,
}: CommentFormProps) {
  const { data: session, status } = useSession();
  const [content, setContent] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || createComment.isPending) return;

    createComment.mutate(
      {
        content: content.trim(),
        postId,
        stockTicker,
        parentId,
      },
      {
        onSuccess: () => {
          setContent("");
          onCommentAdded?.();
        },
      }
    );
  };

  if (status !== "authenticated") {
    if (inline) {
      return (
        <p className="text-text-secondary text-xs py-1">
          <a href="/auth/signin" className="text-accent hover:underline">
            Masuk
          </a>{" "}
          untuk membalas
        </p>
      );
    }
    return (
      <div className="bg-bg-hover/50 rounded-lg p-4 text-center">
        <p className="text-sm text-text-secondary">
          <a href="/auth/signin" className="text-accent hover:underline font-medium">
            Masuk
          </a>{" "}
          untuk bergabung dalam diskusi
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          Gunakan $TICKER.JK untuk mention saham · @username untuk mention user
        </p>
      </div>
    );
  }

  if (inline) {
    return (
      <form onSubmit={handleSubmit} className="flex items-start gap-2 mt-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis balasan..."
          maxLength={500}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={!content.trim() || createComment.isPending}
          className="px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {createComment.isPending ? "..." : "Balas"}
        </button>
      </form>
    );
  }

  const userInitial = getUserInitials(session?.user);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-start gap-3">
        {session?.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0 mt-1"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
            {userInitial}
          </div>
        )}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder ?? "Tulis komentar..."}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pl-11">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              content.length > 450 ? "text-bearish" : "text-text-secondary"
            }`}
          >
            {content.length}/500
          </span>
          <span className="text-[11px] text-text-tertiary">
            $TICKER.JK · @username
          </span>
        </div>
        <button
          type="submit"
          disabled={!content.trim() || createComment.isPending}
          className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createComment.isPending ? "Mengirim..." : "Kirim"}
        </button>
      </div>
    </form>
  );
}
