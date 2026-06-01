"use client";

import { useState, useCallback } from "react";
import { CommunityFeed } from "./community-feed";
import type { Post } from "@/hooks/use-posts";

interface CommunitySectionProps {
  initialPosts: Post[];
  initialCursor: string | null;
  activeTab: string;
}

export function CommunitySection({ initialPosts, initialCursor, activeTab }: CommunitySectionProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
  };

  return (
    <>
      {/* Search bar — above the card */}
      <div className="relative mb-4">
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari diskusi..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      {/* Feed card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <CommunityFeed
          initialPosts={initialPosts}
          initialCursor={initialCursor}
          activeTab={activeTab}
          searchQuery={debouncedSearch}
        />
      </div>
    </>
  );
}
