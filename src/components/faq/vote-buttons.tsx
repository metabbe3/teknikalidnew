"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";

interface VoteButtonsProps {
  questionId: string;
  helpfulVotes: number;
  unhelpfulVotes: number;
}

export function VoteButtons({ questionId, helpfulVotes, unhelpfulVotes }: VoteButtonsProps) {
  const { data: session } = useSession();
  const [hasVoted, setHasVoted] = useState(false);
  const [localHelpful, setLocalHelpful] = useState(helpfulVotes);
  const [localUnhelpful, setLocalUnhelpful] = useState(unhelpfulVotes);

  const voteMutation = useMutation({
    mutationFn: async (isHelpful: boolean) => {
      const res = await fetch(`/api/faq/${questionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHelpful }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memberi feedback");
      }
      return res.json();
    },
    onSuccess: (_data, isHelpful) => {
      setHasVoted(true);
      if (isHelpful) {
        setLocalHelpful((v) => v + 1);
      } else {
        setLocalUnhelpful((v) => v + 1);
      }
    },
  });

  const isLoggedIn = !!session?.user?.id;

  if (hasVoted) {
    return (
      <div className="flex items-center gap-2 text-sm text-accent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        Terima kasih atas feedback Anda!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">Apakah jawaban ini membantu?</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => voteMutation.mutate(true)}
          disabled={!isLoggedIn || voteMutation.isPending}
          title={!isLoggedIn ? "Login untuk memberi feedback" : undefined}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
            !isLoggedIn
              ? "bg-bg-card text-text-tertiary cursor-not-allowed opacity-50 border border-border"
              : "bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-bullish border border-border hover:border-bullish/30"
          }`}
        >
          {/* Thumbs up icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM6 7.5V16.5a.75.75 0 00.513.713l.354.118a3.5 3.5 0 002.228-.166l.508-.226a6.5 6.5 0 014.147-.49l1.456.324a1.5 1.5 0 001.147-.197.71.71 0 00.276-.591V9.407a1.5 1.5 0 00-1.068-1.437l-1.878-.536a5.5 5.5 0 01-3.238-2.662l-.372-.672A2.25 2.25 0 007.726 3h-.024a2.25 2.25 0 00-2.2 2.226L5.5 7.5H6z" />
          </svg>
          Ya
          <span className="text-xs text-text-tertiary ml-0.5">({localHelpful})</span>
        </button>
        <button
          onClick={() => voteMutation.mutate(false)}
          disabled={!isLoggedIn || voteMutation.isPending}
          title={!isLoggedIn ? "Login untuk memberi feedback" : undefined}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
            !isLoggedIn
              ? "bg-bg-card text-text-tertiary cursor-not-allowed opacity-50 border border-border"
              : "bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-bearish border border-border hover:border-bearish/30"
          }`}
        >
          {/* Thumbs down icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M19 11.75a1.25 1.25 0 11-2.5 0v-7.5a1.25 1.25 0 112.5 0v7.5zM14 12.5V3.5a.75.75 0 00-.513-.713l-.354-.118a3.5 3.5 0 00-2.228.166l-.508.226a6.5 6.5 0 01-4.147.49l-1.456-.324a1.5 1.5 0 00-1.147.197.71.71 0 00-.276.591v7.178a1.5 1.5 0 001.068 1.437l1.878.536a5.5 5.5 0 003.238 2.662l.372.672A2.25 2.25 0 0012.274 17h.024a2.25 2.25 0 002.2-2.226L14.5 12.5H14z" />
          </svg>
          Tidak
          <span className="text-xs text-text-tertiary ml-0.5">({localUnhelpful})</span>
        </button>
      </div>
      {!isLoggedIn && (
        <p className="text-xs text-text-tertiary">
          Login untuk memberi feedback
        </p>
      )}
      {voteMutation.isError && (
        <p className="text-xs text-bearish">
          {voteMutation.error instanceof Error ? voteMutation.error.message : "Terjadi kesalahan"}
        </p>
      )}
    </div>
  );
}
