"use client";

import { usePosts, type Post } from "@/hooks/use-posts";
import { PostCard } from "./post-card";

interface PostFeedProps {
  initialPosts: Post[];
  initialCursor: string | null;
}

export function PostFeed({ initialPosts, initialCursor }: PostFeedProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts(initialCursor ?? undefined);

  const allPosts = data
    ? data.pages.flatMap((p) => p.posts)
    : initialPosts;

  return (
    <>
      <div className="space-y-3 stagger-grid">
        {allPosts.map((post, i) => (
          <div key={post.id} style={{ "--stagger-i": i } as React.CSSProperties}>
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="text-center pt-2">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-bg-card depth-shadow rounded-full px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:depth-shadow-hover transition-all press-scale disabled:opacity-50"
          >
            {isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </>
  );
}
