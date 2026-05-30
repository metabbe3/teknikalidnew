"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";

interface StockAlert {
  ticker: string;
  alerts: { type: string; message: string }[];
}

export function useStockAlerts(ticker: string | null) {
  const socket = useSocket();
  const [latestAlert, setLatestAlert] = useState<StockAlert | null>(null);

  useEffect(() => {
    if (!socket || !ticker) return;

    const onAlert = (alert: StockAlert) => {
      if (alert.ticker === ticker) setLatestAlert(alert);
    };

    socket.on("stock-alert", onAlert);
    return () => {
      socket.off("stock-alert", onAlert);
    };
  }, [socket, ticker]);

  return { latestAlert };
}
