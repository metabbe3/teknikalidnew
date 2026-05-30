"use client";

import { useStockRoom } from "@/hooks/use-stock-room";

export function PresenceBadge({ ticker }: { ticker: string }) {
  const { viewerCount } = useStockRoom(ticker);

  if (viewerCount <= 1) return null;

  return (
    <span className="text-xs text-text-tertiary flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse" />
      {viewerCount} orang sedang melihat
    </span>
  );
}
