"use client";

import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import type { Comment } from "./comment-list";
import { stripJk } from "@/lib/utils";

interface StockDiscussionProps {
  ticker: string;
}

export function StockDiscussion({ ticker }: StockDiscussionProps) {
  const { data: session } = useSession();
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const onNewPost = () => {
      queryClient.invalidateQueries({ queryKey: ["stock-comments", ticker] });
    };
    socket.on("new-post", onNewPost);
    return () => { socket.off("new-post", onNewPost); };
  }, [socket, ticker, queryClient]);

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ["stock-comments", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${ticker}/comments`);
      if (!res.ok) throw new Error("Gagal memuat diskusi");
      const json = await res.json();
      return json.data;
    },
  });

  const hasComments = comments && comments.length > 0;

  return (
    <section className="bg-bg-card depth-shadow rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-[18px] h-[18px] text-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">Diskusi</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
            {stripJk(ticker)}
          </span>
          {hasComments && (
            <span className="text-xs text-text-tertiary">
              {comments.length} komentar
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <CommentForm
          stockTicker={ticker}
          placeholder={`Bagikan analisa atau pertanyaan tentang ${stripJk(ticker)}...`}
        />

        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3 py-3">
                <div className="w-7 h-7 rounded-full bg-bg-hover shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 rounded bg-bg-hover" />
                    <div className="h-2.5 w-14 rounded bg-bg-hover" />
                  </div>
                  <div className="h-3 w-full rounded bg-bg-hover" />
                  <div className="h-3 w-3/4 rounded bg-bg-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : hasComments ? (
          <CommentList
            comments={comments}
            stockTicker={ticker}
            currentUserId={session?.user?.id}
            userRole={(session?.user as { role?: string })?.role}
          />
        ) : (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm text-text-secondary">Belum ada diskusi untuk {stripJk(ticker)}</p>
            <p className="text-xs text-text-tertiary mt-1">Jadilah yang pertama berbagi analisa!</p>
          </div>
        )}
      </div>
    </section>
  );
}
