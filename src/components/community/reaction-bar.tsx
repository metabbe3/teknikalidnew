"use client";

import { useState } from "react";
import { useToggleReaction, type ReactionCounts } from "@/hooks/use-posts";

const REACTION_OPTIONS = [
  { type: "LIKE", emoji: "❤️", label: "Suka" },
  { type: "BULLISH", emoji: "📈", label: "Bullish" },
  { type: "BEARISH", emoji: "📉", label: "Bearish" },
  { type: "INSIGHTFUL", emoji: "💡", label: "Insightful" },
  { type: "ROCKET", emoji: "🚀", label: "Rocket" },
  { type: "FIRE", emoji: "🔥", label: "Fire" },
] as const;

export function ReactionBar({
  postId,
  reactions,
  myReaction,
}: {
  postId: string;
  reactions?: ReactionCounts;
  myReaction?: string | null;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const toggleReaction = useToggleReaction();

  const totalReactions = reactions
    ? Object.values(reactions).reduce((sum, n) => sum + n, 0)
    : 0;

  // Show top 3 reactions by count
  const topReactions = reactions
    ? Object.entries(reactions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => REACTION_OPTIONS.find((r) => r.type === type))
        .filter(Boolean)
    : [];

  const handleReact = (type: string) => {
    toggleReaction.mutate({ postId, type });
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
      >
        {myReaction ? (
          <>
            <span className="text-sm">{REACTION_OPTIONS.find((r) => r.type === myReaction)?.emoji ?? "❤️"}</span>
            <span className="text-xs font-medium text-gray-500">{totalReactions > 0 ? totalReactions : ""}</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {totalReactions > 0 && (
              <span className="text-xs font-medium">{totalReactions}</span>
            )}
          </>
        )}
      </button>

      {topReactions.length > 0 && !showPicker && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex -space-x-1">
          {topReactions.map((r) => r ? (
            <span key={r.type} className="text-[11px] w-5 h-5 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100">
              {r.emoji}
            </span>
          ) : null)}
        </div>
      )}

      {showPicker && (
        <div className="absolute left-0 bottom-full mb-2 z-30 flex gap-0.5 bg-white rounded-full shadow-lg border border-gray-200 px-1.5 py-1">
          {REACTION_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => handleReact(option.type)}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-base transition-all hover:scale-125 ${
                myReaction === option.type
                  ? "bg-gray-100 scale-110"
                  : "hover:bg-gray-50"
              }`}
              title={option.label}
            >
              {option.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
