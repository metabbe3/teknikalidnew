"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReputationBadge } from "./reputation-badge";

interface LeaderboardEntry {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  reputation: number;
  weeklyScore: number;
}

const RANK_STYLES = [
  "ring-2 ring-amber-400/50 bg-amber-50 text-amber-700",
  "ring-2 ring-slate-300/50 bg-slate-50 text-slate-600",
  "ring-2 ring-orange-300/50 bg-orange-50 text-orange-700",
];

const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-400"];

function LeaderboardSkeleton() {
  return (
    <div
      className="bg-bg-card depth-shadow-strong rounded-xl p-5 space-y-3"
      style={{ borderTop: "3px solid #f59e0b" }}
    >
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-primary">Top Kontributor</h3>
        <span className="text-[9px] font-mono text-text-tertiary tracking-wider uppercase ml-auto">Minggu Ini</span>
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
            <span className="w-5 h-4 rounded bg-bg-hover animate-pulse" />
            <span className="w-7 h-7 rounded-full bg-bg-hover animate-pulse" />
            <span className="flex-1 h-4 rounded bg-bg-hover animate-pulse" />
            <span className="w-10 h-4 rounded bg-bg-hover animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: LeaderboardEntry[] }>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <LeaderboardSkeleton />;

  const entries = data?.data;

  return (
    <div
      className="bg-bg-card depth-shadow-strong rounded-xl p-5 space-y-3"
      style={{ borderTop: "3px solid #f59e0b" }}
    >
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-primary">Top Kontributor</h3>
        <span className="text-[9px] font-mono text-text-tertiary tracking-wider uppercase ml-auto">Minggu Ini</span>
      </div>

      {!entries?.length ? (
        <div className="py-6 text-center">
          <p className="text-xs text-text-tertiary">Belum ada kontributor minggu ini</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {entries.map((entry, i) => (
            <div key={entry.id} className={`flex items-center gap-3 py-2.5 first:pt-1 last:pb-1 ${i === 0 ? "bg-amber-50/40 -mx-2 px-2 rounded-lg" : ""}`}>
              <span className={`text-sm font-bold w-5 text-center font-mono ${i < 3 ? RANK_COLORS[i] : "text-text-tertiary"}`}>
                {i + 1}
              </span>
              {entry.image ? (
                <img src={entry.image} alt="" className={`w-7 h-7 rounded-full object-cover ${i < 3 ? RANK_STYLES[i] : ""}`} />
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i < 3 ? RANK_STYLES[i] : "bg-accent/10 text-accent"}`}>
                  {(entry.name || entry.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${entry.username}`} className="text-sm font-medium hover:underline truncate block">
                  {entry.name || entry.username}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <ReputationBadge reputation={entry.reputation} />
                <span className="text-xs font-mono tabular-nums font-semibold text-text-secondary">{entry.weeklyScore} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
