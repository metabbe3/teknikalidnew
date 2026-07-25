"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const REACTION_EMOJI: Record<string, string> = {
  BULLISH: "🐂",
  BEARISH: "🐻",
  INSIGHTFUL: "💡",
  ROCKET: "🚀",
  FIRE: "🔥",
};

interface NotificationActor {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

interface NotificationData {
  id: string;
  type: "LIKE" | "COMMENT" | "MENTION" | "FOLLOW" | "STOCK_POST" | "REACTION" | "STOCK_ALERT" | "AGENT_ALERT" | "RE_ENGAGE" | "SCREENER_MATCH" | "THESIS_BREACH";
  read: boolean;
  createdAt: string;
  actor: NotificationActor;
  ticker: string | null;
  meta: { breachKind?: string } | null;
  post: { id: string; content: string } | null;
}

export function useNotifications(enabled: boolean = false) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: NotificationData[]; unreadCount: number }>;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (options?: { id?: string; markAll?: boolean }) => {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options?.id ? { id: options.id } : { markAll: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function notificationText(n: NotificationData): string {
  const name = n.actor.name || `@${n.actor.username}`;
  if (n.type === "THESIS_BREACH") {
    const t = n.ticker ? n.ticker.replace(/\.JK$/i, "") : "Saham";
    switch (n.meta?.breachKind) {
      case "target_hit":
        return `Tesis ${t} — target tercapai 🎯`;
      case "stop_hit":
        return `Tesis ${t} — stop loss tersentuh`;
      case "verdict_flipped":
        return `Tesis ${t} — sinyal berbalik`;
      default:
        return `Tesis ${t} sedang diuji, cek sekarang`;
    }
  }
  switch (n.type) {
    case "LIKE":
      return `${name} menyukai post Anda`;
    case "COMMENT":
      return `${name} mengomentari post Anda`;
    case "MENTION":
      return `${name} menyebut Anda`;
    case "FOLLOW":
      return `${name} mulai mengikuti Anda`;
    case "STOCK_POST":
      return `${name} membahas saham yang Anda ikuti`;
    case "REACTION":
      return `${name} memberikan reaksi di post Anda`;
    case "SCREENER_MATCH":
      return `Saham baru cocok dengan filter screener Anda`;
    case "STOCK_ALERT":
    case "AGENT_ALERT":
    case "RE_ENGAGE":
      return `${name} mengirimkan pemberitahuan`;
    default:
      return `${name} berinteraksi dengan Anda`;
  }
}
