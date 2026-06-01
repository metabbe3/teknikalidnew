"use client";

import { useSearchParams } from "next/navigation";
import { usePosts, type Post } from "@/hooks/use-posts";
import { useRealtimeCommunity } from "@/hooks/use-realtime-community";
import { PostCard } from "./post-card";

interface CommunityFeedProps {
  initialPosts: Post[];
  initialCursor: string | null;
  activeTab: string;
  searchQuery?: string;
}

export function CommunityFeed({ initialPosts, initialCursor, activeTab, searchQuery }: CommunityFeedProps) {
  useRealtimeCommunity();
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts(
    initialCursor ?? undefined,
    activeTab,
    initialPosts,
    searchQuery || undefined,
    tag || undefined,
  );

  const allPosts = data
    ? data.pages.flatMap((p) => p.posts)
    : initialPosts;

  const filterLabel = tag
    ? `#${tag}`
    : searchQuery
    ? `"${searchQuery}"`
    : null;

  return (
    <>
      {filterLabel && (
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-400 flex items-center gap-2">
            {allPosts.length > 0 ? `${allPosts.length} hasil untuk ${filterLabel}` : `Tidak ditemukan untuk ${filterLabel}`}
            {tag && (
              <a href="/community" className="text-teal-600 hover:underline">Hapus filter</a>
            )}
          </p>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {allPosts.map((post) => (
          <PostCard key={post.repostedBy ? `${post.id}-repost` : post.id} post={post} repostedBy={post.repostedBy ?? undefined} />
        ))}
      </div>

      {hasNextPage && (
        <div className="text-center py-3 border-t border-gray-100">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </>
  );
}
