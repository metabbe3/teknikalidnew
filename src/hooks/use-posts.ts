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
  customTitle?: string | null;
  reputation?: number;
  followersCount?: number;
}

export interface ReactionCounts {
  [type: string]: number;
}

export interface Post {
  id: string;
  content: string;
  tickerTag: string | null;
  predictionDirection: string | null;
  predictionTarget: string | null;
  predictionOutcome: string | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  author: PostAuthor;
  likedByMe?: boolean;
  repostedByMe?: boolean;
  bookmarkedByMe?: boolean;
  followingAuthor?: boolean;
  authorHoldings?: string[];
  repostedBy?: { username: string; name: string | null } | null;
  reactions?: ReactionCounts;
  myReaction?: string | null;
  poll?: {
    id: string;
    options: { id: string; text: string; votesCount: number }[];
    myVote?: string | null;
  } | null;
}

export function usePosts(cursor?: string, tab?: string, initialPosts?: Post[], q?: string, tag?: string) {
  return useInfiniteQuery<{
    posts: Post[];
    nextCursor: string | null;
  }>({
    queryKey: ["posts", tab, q, tag],
    initialPageParam: cursor ?? null,
    ...(initialPosts && !q && !tag
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
      if (q) params.set("q", q);
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error("Gagal memuat post");
      const json = await res.json();
      return { posts: json.data, nextCursor: json.nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !q || q.length > 0,
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
      pollOptions?: string[];
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
    onSuccess: (response) => {
      const raw = response.data;
      if (!raw) {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        return;
      }

      // Normalize API response to match Post interface
      const newPost: Post = {
        id: raw.id,
        content: raw.content,
        tickerTag: raw.tickerTag ?? null,
        predictionDirection: raw.predictionDirection ?? null,
        predictionTarget: raw.predictionTarget ?? null,
        predictionOutcome: raw.predictionOutcome ?? null,
        imageUrl: raw.imageUrl ?? null,
        likesCount: raw.likesCount ?? 0,
        commentsCount: raw.commentsCount ?? 0,
        repostsCount: raw.repostsCount ?? 0,
        createdAt: raw.createdAt,
        author: {
          id: raw.author.id,
          username: raw.author.username,
          name: raw.author.name ?? null,
          image: raw.author.image ?? null,
          reputation: raw.author.reputation ?? 0,
          followersCount: raw.author.followersCount ?? 0,
        },
        likedByMe: false,
        repostedByMe: false,
        bookmarkedByMe: false,
        followingAuthor: false,
      };

      // Replace optimistic post or prepend real post to all matching queries
      const queries = queryClient.getQueriesData<{ pages: { posts: Post[] }[] }>({ queryKey: ["posts"] });
      for (const [key, data] of queries) {
        if (!data?.pages?.length) continue;
        const pages = data.pages.map((page, i) => {
          if (i !== 0) return page;
          const filtered = page.posts.filter((p) => !p.id.startsWith("temp-"));
          return { ...page, posts: [newPost, ...filtered] };
        });
        queryClient.setQueryData(key, { ...data, pages });
      }
    },
    onError: () => {
      // Remove any optimistic posts on error
      const queries = queryClient.getQueriesData<{ pages: { posts: Post[] }[] }>({ queryKey: ["posts"] });
      for (const [key, data] of queries) {
        if (!data?.pages?.length) continue;
        const hasOptimistic = data.pages.some((p) => p.posts.some((post) => post.id.startsWith("temp-")));
        if (!hasOptimistic) continue;
        const pages = data.pages.map((page) => ({
          ...page,
          posts: page.posts.filter((p) => !p.id.startsWith("temp-")),
        }));
        queryClient.setQueryData(key, { ...data, pages });
      }
    },
  });
}

export function useRepostToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reposted }: { postId: string; reposted: boolean }) => {
      const res = await fetch(`/api/posts/${postId}/repost`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal memposting ulang");
      return res.json();
    },
    onMutate: async ({ postId, reposted }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const queries = queryClient.getQueriesData<{ pages: { posts: Post[] }[] }>({ queryKey: ["posts"] });
      for (const [key, data] of queries) {
        if (!data?.pages) continue;
        const pages = data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) =>
            post.id === postId
              ? { ...post, repostedByMe: !reposted, repostsCount: post.repostsCount + (reposted ? -1 : 1) }
              : post
          ),
        }));
        queryClient.setQueryData(key, { ...data, pages });
      }
      return { queries };
    },
    onError: (_err, { postId, reposted }, context) => {
      // Revert optimistic update
      if (!context) return;
      const queries = queryClient.getQueriesData<{ pages: { posts: Post[] }[] }>({ queryKey: ["posts"] });
      for (const [key, data] of queries) {
        if (!data?.pages) continue;
        const pages = data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) =>
            post.id === postId
              ? { ...post, repostedByMe: reposted, repostsCount: post.repostsCount + (reposted ? 1 : -1) }
              : post
          ),
        }));
        queryClient.setQueryData(key, { ...data, pages });
      }
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: string }) => {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Gagal memberi reaksi");
      return res.json();
    },
    onMutate: async ({ postId, type }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const queries = queryClient.getQueriesData<{ pages: { posts: Post[] }[] }>({ queryKey: ["posts"] });
      for (const [key, data] of queries) {
        if (!data?.pages) continue;
        const pages = data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post.id !== postId) return post;
            const reactions = { ...(post.reactions ?? {}) };
            const prevReaction = post.myReaction;

            if (prevReaction && reactions[prevReaction]) {
              reactions[prevReaction] = Math.max(0, reactions[prevReaction] - 1);
              if (reactions[prevReaction] === 0) delete reactions[prevReaction];
            }

            if (prevReaction === type) {
              return { ...post, reactions, myReaction: null };
            }

            reactions[type] = (reactions[type] ?? 0) + 1;
            return { ...post, reactions, myReaction: type };
          }),
        }));
        queryClient.setQueryData(key, { ...data, pages });
      }
    },
  });
}
