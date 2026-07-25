"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SocialCardGenerator from "./_components/SocialCardGenerator";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
}

export default function SocialCardsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/social-cards/articles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setArticles(data);
        } else {
          setError("Failed to load articles");
        }
      })
      .catch(() => setError("Failed to fetch"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">📱 Social Cards</h1>
            <p className="text-gray-400 mt-1">
              Generate TikTok/Reels images from news articles
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-20 text-gray-400">
            Loading articles...
          </div>
        )}
        {error && (
          <div className="text-center py-20 text-red-400">{error}</div>
        )}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            No published news articles found.
          </div>
        )}
        {!loading && !error && articles.length > 0 && (
          <SocialCardGenerator articles={articles} />
        )}
      </div>
    </div>
  );
}
