"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useWatchlistStatus, useToggleWatchlist } from "@/hooks/use-watchlist";

interface WatchlistButtonProps {
  ticker: string;
}

export function WatchlistButton({ ticker }: WatchlistButtonProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [showTooltip, setShowTooltip] = useState(false);

  const { data: watchlistStatus } = useWatchlistStatus(isAuthenticated ? ticker : undefined);
  const toggleWatchlist = useToggleWatchlist();

  const inWatchlist = watchlistStatus?.inWatchlist ?? false;

  const handleClick = () => {
    if (!isAuthenticated) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    toggleWatchlist.mutate({
      ticker,
      action: inWatchlist ? "remove" : "add",
    });
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={toggleWatchlist.isPending}
        className="p-2 rounded-full hover:bg-bg-hover transition-colors disabled:opacity-50"
        aria-label={inWatchlist ? "Hapus dari watchlist" : "Tambah ke watchlist"}
      >
        {inWatchlist ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-accent"
          >
            <path
              fillRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-secondary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        )}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-text-primary text-white text-xs whitespace-nowrap depth-shadow">
          Masuk untuk menambah watchlist
        </div>
      )}
    </div>
  );
}
