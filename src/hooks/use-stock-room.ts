"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";

export function useStockRoom(ticker: string | null) {
  const socket = useSocket();
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!socket || !ticker) return;

    socket.emit("join:stock", ticker);

    const onPresence = ({
      ticker: t,
      count,
    }: {
      ticker: string;
      count: number;
    }) => {
      if (t === ticker) setViewerCount(count);
    };

    socket.on("presence:update", onPresence);

    return () => {
      socket.emit("leave:stock", ticker);
      socket.off("presence:update", onPresence);
      setViewerCount(0);
    };
  }, [socket, ticker]);

  return { viewerCount };
}
