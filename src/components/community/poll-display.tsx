"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post } from "@/hooks/use-posts";

interface PollOption {
  id: string;
  text: string;
  votesCount: number;
}

interface PollData {
  id: string;
  options: PollOption[];
  myVote?: string | null;
}

export function PollDisplay({ poll, postId }: { poll: PollData; postId: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const hasVoted = !!poll.myVote;
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votesCount, 0);

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      if (!res.ok) throw new Error("Gagal memilih");
      return res.json();
    },
    onMutate: async (optionId) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const queries = queryClient.getQueriesData<{ pages: { posts: Post[] }[] }>({ queryKey: ["posts"] });
      const previousData = new Map(queries);

      for (const [key, data] of queries) {
        if (!data?.pages) continue;
        const pages = data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post.id !== postId || !post.poll) return post;
            const prevVote = post.poll.myVote;
            const options = post.poll.options.map((o) => {
              let count = o.votesCount;
              if (prevVote === o.id) count -= 1;
              if (o.id === optionId) count += 1;
              return { ...o, votesCount: Math.max(0, count) };
            });

            if (prevVote === optionId) {
              // Unvote
              return { ...post, poll: { ...post.poll, options, myVote: null } };
            }
            return { ...post, poll: { ...post.poll, options, myVote: optionId } };
          }),
        }));
        queryClient.setQueryData(key, { ...data, pages });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.previousData) {
        queryClient.setQueryData(key, data);
      }
    },
  });

  const handleVote = (optionId: string) => {
    if (!session?.user || voteMutation.isPending) return;
    voteMutation.mutate(optionId);
  };

  return (
    <div className="mt-2 space-y-1.5">
      {poll.options.map((option) => {
        const percentage = totalVotes > 0
          ? Math.round((option.votesCount / totalVotes) * 100)
          : 0;
        const isVoted = poll.myVote === option.id;

        return (
          <button
            key={option.id}
            onClick={() => handleVote(option.id)}
            disabled={!session?.user || voteMutation.isPending}
            className="w-full relative overflow-hidden rounded-lg border text-left transition-all"
          >
            {/* Progress bar background */}
            {hasVoted && (
              <div
                className={`absolute inset-0 top-0 h-full transition-all duration-500 ${
                  isVoted ? "bg-teal-100" : "bg-gray-50"
                }`}
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className={`relative flex items-center justify-between px-3 py-2 ${
              !session?.user
                ? "border-gray-200 cursor-default"
                : !hasVoted
                  ? "border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer"
                  : "border-gray-100 cursor-pointer hover:border-teal-200"
            }`}>
              <div className="flex items-center gap-2">
                {isVoted && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-teal-600 shrink-0" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span className={`text-sm ${isVoted ? "font-semibold text-teal-700" : "text-gray-700"}`}>
                  {option.text}
                </span>
              </div>
              {hasVoted && (
                <span className="text-xs font-medium text-gray-500 tabular-nums">{percentage}%</span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-[11px] text-gray-400 pt-0.5">
        {totalVotes} suara
        {!session?.user && " · Masuk untuk memilih"}
      </p>
    </div>
  );
}
