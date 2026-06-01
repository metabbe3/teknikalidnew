"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useBookmarkStatus, useToggleBookmark } from "@/hooks/use-bookmarks";

export function BookmarkButton({ postId, initialBookmarked }: { postId: string; initialBookmarked?: boolean }) {
  const { data: session } = useSession();
  const [localBookmarked, setLocalBookmarked] = useState(initialBookmarked ?? false);
  const hasInitial = initialBookmarked !== undefined;
  const { data } = useBookmarkStatus(!hasInitial && session?.user ? postId : undefined);
  const toggle = useToggleBookmark();

  const bookmarked = hasInitial ? localBookmarked : (data?.bookmarked ?? false);
  const isLoggedIn = !!session?.user;

  return (
    <button
      onClick={() => {
        if (!isLoggedIn) return;
        if (hasInitial) setLocalBookmarked(!localBookmarked);
        toggle.mutate(postId);
      }}
      disabled={toggle.isPending || !isLoggedIn}
      className={`p-2.5 text-text-tertiary hover:text-accent transition-colors rounded-md hover:bg-bg-hover shrink-0 ${!isLoggedIn ? "invisible" : ""}`}
      aria-label={bookmarked ? "Hapus bookmark" : "Simpan bookmark"}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={bookmarked ? "text-accent" : ""}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
