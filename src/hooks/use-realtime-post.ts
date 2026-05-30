"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimePost(postId: string | null) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !postId) return;

    socket.emit("join:post", postId);

    const onNewComment = () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    };

    const onPostUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    };

    socket.on("community:new-comment", onNewComment);
    socket.on("community:post-updated", onPostUpdated);

    return () => {
      socket.emit("leave:post", postId);
      socket.off("community:new-comment", onNewComment);
      socket.off("community:post-updated", onPostUpdated);
    };
  }, [socket, postId, queryClient]);
}
