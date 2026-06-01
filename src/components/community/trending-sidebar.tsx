import Link from "next/link";

interface TrendingTag {
  tag: string;
  count: number;
  trendPercent: number;
}

export function TrendingSidebar({ tags }: { tags: TrendingTag[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔥</span>
          <h3 className="text-sm font-bold text-gray-900">Trending</h3>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">7 hari terakhir</p>
      </div>
      <div className="divide-y divide-gray-50">
        {tags.map((tag) => (
          <Link
            key={tag.tag}
            href={`/community?tag=${encodeURIComponent(tag.tag)}`}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-[12px] font-semibold text-gray-900">
                #{tag.tag}
              </p>
              <p className="text-[10px] text-gray-400">
                {tag.count} post
              </p>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                tag.trendPercent > 0
                  ? "text-green-600 bg-green-50"
                  : tag.trendPercent < 0
                    ? "text-red-500 bg-red-50"
                    : "text-gray-400 bg-gray-50"
              }`}
            >
              {tag.trendPercent > 0 ? `↑${tag.trendPercent}%` : tag.trendPercent < 0 ? `↓${Math.abs(tag.trendPercent)}%` : "→"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
