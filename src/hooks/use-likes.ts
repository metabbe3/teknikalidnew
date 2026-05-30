"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Gagal menyukai post");
      return res.json();
    },
    // Optimistic update handled in PostCard component
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
