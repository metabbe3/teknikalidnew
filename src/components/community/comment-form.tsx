"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useCreateComment } from "@/hooks/use-comments";
import { getUserInitials } from "@/lib/utils";
import { useMentionSearch, type MentionUser } from "@/hooks/use-mention-search";
import { EmojiPicker } from "./emoji-picker";

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
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const createComment = useCreateComment();
  const { users: mentionUsers, isLoading: mentionLoading } = useMentionSearch(mentionQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectMention = useCallback(
    (user: MentionUser) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.slice(0, cursorPos);
      const replaceStart = textBeforeCursor.lastIndexOf("@");
      if (replaceStart === -1) return;

      const before = content.slice(0, replaceStart);
      const after = content.slice(cursorPos);
      const newContent = `${before}@${user.username} ${after}`;
      setContent(newContent);
      setMentionOpen(false);

      requestAnimationFrame(() => {
        const newPos = replaceStart + user.username.length + 2;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    },
    [content]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionOpen(true);
        setMentionIndex(0);
      } else {
        setMentionOpen(false);
      }
    },
    []
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);

      requestAnimationFrame(() => {
        const newPos = start + emoji.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    },
    [content]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionOpen && mentionUsers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, mentionUsers.length - 1));
          return;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          selectMention(mentionUsers[mentionIndex]);
          return;
        } else if (e.key === "Escape") {
          setMentionOpen(false);
          return;
        }
      }
    },
    [mentionOpen, mentionUsers, mentionIndex, selectMention]
  );

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
          setMentionOpen(false);
          onCommentAdded?.();
        },
      }
    );
  };

  const mentionDropdown = mentionOpen && (mentionUsers.length > 0 || mentionLoading) ? (
    <div
      ref={mentionRef}
      className="absolute left-0 bottom-full mb-1 z-20 w-64 max-h-56 overflow-y-auto bg-bg-card rounded-xl depth-shadow border border-border py-1"
    >
      {mentionLoading ? (
        <div className="px-3 py-2 text-xs text-text-tertiary">Mencari...</div>
      ) : (() => {
        const followed = mentionUsers.filter((u) => u.isFollowing);
        const others = mentionUsers.filter((u) => !u.isFollowing);
        let flatIdx = 0;
        return (
          <>
            {followed.map((user) => {
              const i = flatIdx++;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectMention(user)}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                    i === mentionIndex ? "bg-bg-hover" : "hover:bg-bg-hover"
                  }`}
                >
                  {user.image ? (
                    <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                      {(user.name || user.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{user.name || user.username}</p>
                    <p className="text-[11px] text-text-tertiary">@{user.username}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium shrink-0">Mengikuti</span>
                </button>
              );
            })}
            {followed.length > 0 && others.length > 0 && (
              <div className="my-1 border-t border-border/50" />
            )}
            {others.map((user) => {
              const i = flatIdx++;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectMention(user)}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                    i === mentionIndex ? "bg-bg-hover" : "hover:bg-bg-hover"
                  }`}
                >
                  {user.image ? (
                    <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                      {(user.name || user.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{user.name || user.username}</p>
                    <p className="text-[11px] text-text-tertiary">@{user.username}</p>
                  </div>
                </button>
              );
            })}
          </>
        );
      })()}
    </div>
  ) : null;

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
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Tulis balasan..."
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
          {mentionDropdown}
        </div>
        <div className="flex items-center gap-1">
          <EmojiPicker onSelect={insertEmoji} />
          <button
            type="submit"
            disabled={!content.trim() || createComment.isPending}
            className="px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {createComment.isPending ? "…" : "Balas"}
          </button>
        </div>
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
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
            {userInitial}
          </div>
        )}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Tulis komentar..."}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
          {mentionDropdown}
        </div>
      </div>
      <div className="flex items-center justify-between pl-11">
        <div className="flex items-center gap-3">
          <EmojiPicker onSelect={insertEmoji} className="-ml-1" />
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
          {createComment.isPending ? "Mengirim…" : "Kirim"}
        </button>
      </div>
    </form>
  );
}
