import Link from "next/link";

interface TopContributor {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  engagementScore: number;
}

export function TopKontributorSidebar({ users }: { users: TopContributor[] }) {
  if (users.length === 0) return null;

  const rankStyles: Record<number, { color: string; bg: string }> = {
    1: { color: "text-amber-600", bg: "bg-amber-50 ring-amber-200" },
    2: { color: "text-gray-500", bg: "bg-gray-50 ring-gray-200" },
    3: { color: "text-orange-600", bg: "bg-orange-50 ring-orange-200" },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏆</span>
          <h3 className="text-sm font-bold text-gray-900">Top Kontributor</h3>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Minggu ini</p>
      </div>
      <div className="divide-y divide-gray-50">
        {users.map((user, i) => {
          const rank = i + 1;
          const style = rankStyles[rank];
          const initial = (user.name?.[0] ?? user.username[0]).toUpperCase();

          return (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span
                className={`text-[11px] font-bold w-4 text-center ${
                  rank <= 3 ? (style?.color ?? "text-gray-300") : "text-gray-300"
                }`}
              >
                {rank}
              </span>
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.username}
                  className={`w-7 h-7 rounded-full object-cover ${
                    rank <= 3 ? `ring-2 ${style?.bg}` : ""
                  }`}
                  loading="lazy"
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    rank <= 3
                      ? `${style?.bg} ${style?.color}`
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-900 truncate">
                  {user.name ?? user.username}
                </p>
                <p className="text-[10px] text-gray-400">
                  {user.engagementScore} engagement
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
