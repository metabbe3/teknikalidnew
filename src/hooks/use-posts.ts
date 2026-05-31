"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export interface PostAuthor {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  reputation?: number;
  followersCount?: number;
}

export interface Post {
  id: string;
  content: string;
  tickerTag: string | null;
  predictionDirection: string | null;
  predictionTarget: string | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PostAuthor;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  followingAuthor?: boolean;
}

export function usePosts(cursor?: string, tab?: string, initialPosts?: Post[]) {
  return useInfiniteQuery<{
    posts: Post[];
    nextCursor: string | null;
  }>({
    queryKey: ["posts", tab],
    initialPageParam: cursor ?? null,
    ...(initialPosts
      ? {
          initialData: {
            pages: [{ posts: initialPosts, nextCursor: cursor ?? null }],
            pageParams: [null],
          },
        }
      : {}),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam as string);
      if (tab === "trending") params.set("sort", "trending");
      if (tab === "following") params.set("filter", "following");
      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error("Gagal memuat post");
      const json = await res.json();
      return { posts: json.data, nextCursor: json.nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      content: string;
      tickerTag?: string | null;
      predictionDirection?: string | null;
      predictionTarget?: number | null;
      imageUrl?: string | null;
    }) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat post");
      }
      return res.json();
    },
    onMutate: async (newPost) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const previous = queryClient.getQueriesData<{ pages: { posts: Post[]; nextCursor: string | null }[] }>({ queryKey: ["posts"] });

      const optimisticPost: Post = {
        id: `temp-${Date.now()}`,
        content: newPost.content,
        tickerTag: newPost.tickerTag ?? null,
        predictionDirection: newPost.predictionDirection ?? null,
        predictionTarget: newPost.predictionTarget ? String(newPost.predictionTarget) : null,
        imageUrl: newPost.imageUrl ?? null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        author: { id: "me", username: "you", name: null, image: null },
        likedByMe: false,
      };

      queryClient.setQueriesData<{ pages: { posts: Post[]; nextCursor: string | null }[] }>({ queryKey: ["posts"] }, (old) => {
        if (!old?.pages?.length) return old;
        const newPages = [...old.pages];
        newPages[0] = { ...newPages[0], posts: [optimisticPost, ...newPages[0].posts] };
        return { ...old, pages: newPages };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
