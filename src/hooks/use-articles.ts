"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

export interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  articleType: string;
  tickerTag: string | null;
  tags: string[];
  publishedAt: string;
  author: { name: string | null; username: string };
}

interface ArticlePage {
  data: ArticleItem[];
  nextCursor: string | null;
}

export function useArticles(
  tag?: string,
  initialData?: { articles: ArticleItem[]; nextCursor: string | null }
) {
  return useInfiniteQuery<ArticlePage>({
    queryKey: ["articles", tag],
    initialPageParam: null as string | null,
    ...(initialData
      ? {
          initialData: {
            pages: [{ data: initialData.articles, nextCursor: initialData.nextCursor }],
            pageParams: [null as string | null],
          },
        }
      : {}),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam as string);
      if (tag) params.set("tag", tag);
      params.set("limit", "12");
      const res = await fetch(`/api/articles?${params}`);
      if (!res.ok) throw new Error("Gagal memuat artikel");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
