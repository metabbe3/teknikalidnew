"use client";

import Link from "next/link";
import { useState } from "react";

interface TagFilterStripProps {
  popularTags: string[];
  allTags: string[];
  activeTag?: string;
}

export function TagFilterStrip({ popularTags, allTags, activeTag }: TagFilterStripProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = allTags.length > popularTags.length;
  const visibleTags = expanded ? allTags : popularTags;

  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      <Link
        href="/berita"
        className="akademi-filter-pill"
        data-active={!activeTag ? "true" : undefined}
      >
        Semua
      </Link>
      {visibleTags.map((tag) => (
        <Link
          key={tag}
          href={`/berita?tag=${encodeURIComponent(tag)}`}
          className="akademi-filter-pill"
          data-active={activeTag === tag ? "true" : undefined}
        >
          {tag}
        </Link>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="akademi-filter-pill text-accent cursor-pointer"
        >
          {expanded ? "Sembunyikan" : `+${allTags.length - popularTags.length} lainnya`}
        </button>
      )}
    </div>
  );
}
