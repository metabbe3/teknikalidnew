"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeNotifications() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [socket, queryClient]);
}
