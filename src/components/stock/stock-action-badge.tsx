"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useWatchlistStatus, useToggleWatchlist } from "@/hooks/use-watchlist";
import { useStockFollowStatus, useToggleStockFollow } from "@/hooks/use-follow";

interface StockActionBadgeProps {
  ticker: string;
}

export function StockActionBadge({ ticker }: StockActionBadgeProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [showTooltip, setShowTooltip] = useState(false);

  const { data: watchlistData } = useWatchlistStatus(isAuthenticated ? ticker : undefined);
  const toggleWatchlist = useToggleWatchlist();
  const { data: followData } = useStockFollowStatus(isAuthenticated ? ticker : undefined);
  const toggleFollow = useToggleStockFollow();

  const isActive = isAuthenticated
    ? (watchlistData?.inWatchlist ?? false) || (followData?.following ?? false)
    : false;
  const isPending = toggleWatchlist.isPending || toggleFollow.isPending;

  const handleClick = () => {
    if (!isAuthenticated) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    toggleWatchlist.mutate({ ticker, action: isActive ? "remove" : "add" });
    toggleFollow.mutate(ticker);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all press-scale disabled:opacity-50 ${
          isActive
            ? "bg-accent/10 text-accent border border-accent/20"
            : "border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        }`}
        aria-label={isActive ? "Berhenti memantau" : "Pantau saham ini"}
      >
        {isActive ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        )}
        {isActive ? "Dipantau" : "Pantau"}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-text-primary text-white text-xs whitespace-nowrap depth-shadow">
          Masuk untuk memantau saham ini
        </div>
      )}
    </div>
  );
}
