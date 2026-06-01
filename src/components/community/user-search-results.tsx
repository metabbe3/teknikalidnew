"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { FollowButton } from "./follow-button";
import { ReputationBadge } from "./reputation-badge";

interface TopUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  engagementScore: number;
}

interface SearchUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  reputation: number;
  isFollowing: boolean;
}

export function UserSearchResults({ topContributors }: { topContributors: TopUser[] }) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["user-search", query],
    queryFn: async () => {
      if (!query) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data as SearchUser[];
    },
    enabled: query.length > 0,
  });

  const users = query ? searchResults ?? [] : topContributors;
  const loading = query && !searchResults;

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pengguna..."
          className="w-full rounded-lg border border-gray-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-gray-400">Mencari...</div>
      )}

      {!loading && users.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          {query ? "Pengguna tidak ditemukan" : "Belum ada kontributor"}
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-2">
          {users.map((user) => {
            const image = user.image || "https://www.gravatar.com/avatar/?d=mp&s=80";
            const reputation = "reputation" in user ? user.reputation : 0;
            return (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Link href={`/profile/${user.username}`} className="shrink-0">
                  <img src={image} alt="" className="w-9 h-9 rounded-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/profile/${user.username}`} className="text-sm font-bold text-gray-900 hover:underline truncate">
                      {user.name ?? user.username}
                    </Link>
                    {reputation > 0 && <ReputationBadge reputation={reputation} />}
                  </div>
                  <span className="text-xs text-gray-400">@{user.username}</span>
                </div>
                {session?.user?.id !== user.id && "isFollowing" in user && (
                  <FollowButton userId={user.id} initialFollowing={user.isFollowing} size="sm" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
