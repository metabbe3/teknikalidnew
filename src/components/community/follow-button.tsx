"use client";

import { useSession } from "next-auth/react";
import { useFollowStatus, useToggleFollow, useStockFollowStatus, useToggleStockFollow } from "@/hooks/use-follow";

export function FollowButton({ userId, size = "sm", initialFollowing }: { userId: string; size?: "sm" | "md"; initialFollowing?: boolean }) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const isSelf = session?.user?.id === userId;
  const { data } = useFollowStatus(isLoggedIn && !isSelf ? userId : undefined, true);
  const toggle = useToggleFollow();

  if (!isLoggedIn || isSelf) return null;

  const following = data?.following ?? initialFollowing ?? false;
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-4 py-1.5 text-sm";

  return (
    <button
      onClick={() => toggle.mutate(userId)}
      disabled={toggle.isPending}
      className={`${sizeClass} rounded-full font-semibold transition-all duration-200 cursor-pointer ${
        following
          ? "bg-bg-hover border border-border text-text-secondary hover:text-bearish hover:border-red-200"
          : "bg-teal-600 text-white hover:bg-teal-700"
      }`}
    >
      {following ? "Mengikuti" : "Ikuti"}
    </button>
  );
}

export function StockFollowButton({ ticker }: { ticker: string }) {
  const { data: session } = useSession();
  const { data } = useStockFollowStatus(session?.user ? ticker : undefined);
  const toggle = useToggleStockFollow();

  if (!session?.user) return null;

  const following = data?.following ?? false;

  return (
    <button
      onClick={() => toggle.mutate(ticker)}
      disabled={toggle.isPending}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all press-scale ${
        following
          ? "bg-bg-card border border-border text-text-secondary hover:text-bearish hover:border-bearish/30"
          : "bg-accent text-white hover:bg-accent/90"
      }`}
    >
      {following ? `Mengikuti ${ticker}` : `Ikuti ${ticker}`}
    </button>
  );
}
