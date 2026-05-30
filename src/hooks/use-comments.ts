"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CommentData {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  author: { id: string; username: string; name: string | null; image: string | null };
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      content: string;
      postId?: string;
      stockTicker?: string;
      parentId?: string;
    }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menambah komentar");
      }
      return res.json();
    },
    onMutate: async (variables) => {
      const queryKey = variables.postId
        ? ["comments", variables.postId]
        : variables.stockTicker
          ? ["stock-comments", variables.stockTicker]
          : null;

      if (!queryKey || variables.parentId) return {};

      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentData[]>(queryKey);

      const optimistic: CommentData = {
        id: `temp-${Date.now()}`,
        content: variables.content,
        postId: variables.postId ?? "",
        authorId: "me",
        parentId: null,
        createdAt: new Date().toISOString(),
        author: { id: "me", username: "you", name: null, image: null },
      };

      queryClient.setQueryData<CommentData[]>(queryKey, (old) =>
        old ? [optimistic, ...old] : [optimistic]
      );

      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      if (variables.postId) {
        queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
      if (variables.stockTicker) {
        queryClient.invalidateQueries({ queryKey: ["stock-comments", variables.stockTicker] });
      }
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus komentar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["stock-comments"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
