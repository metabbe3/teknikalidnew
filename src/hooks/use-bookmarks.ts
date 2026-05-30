"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useBookmarkStatus(postId: string | undefined) {
  return useQuery({
    queryKey: ["bookmark-status", postId],
    queryFn: async () => {
      const bookmarks = await fetch("/api/bookmarks").then((r) => r.json());
      const ids = bookmarks.data.map((b: { id: string }) => b.id);
      return { bookmarked: ids.includes(postId) };
    },
    enabled: !!postId,
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ bookmarked: boolean }>;
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-status", postId] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
