"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeCommunity() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.emit("join:community");

    const onNewPost = () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    };

    socket.on("community:new-post", onNewPost);

    return () => {
      socket.emit("leave:community");
      socket.off("community:new-post", onNewPost);
    };
  }, [socket, queryClient]);
}
