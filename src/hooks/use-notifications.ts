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
  type: "LIKE" | "COMMENT" | "MENTION" | "FOLLOW" | "STOCK_POST" | "REACTION";
  read: boolean;
  createdAt: string;
  actor: NotificationActor;
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
    default:
      return `${name} berinteraksi dengan Anda`;
  }
}
