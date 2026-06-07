import Link from "next/link";

interface TopPredictor {
  id: string;
  username: string;
  name: string | null;
  image: string;
  total: number;
  correct: number;
  accuracyPct: number;
}

export function TopPredictorList({ users }: { users: TopPredictor[] }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
        <p className="text-lg font-bold text-gray-900">Belum Ada Prediktor</p>
        <p className="text-sm text-gray-500 mt-1">
          User dengan minimal 5 prediksi akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <h3 className="text-sm font-bold text-gray-900">Top Prediktor</h3>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Minimal 5 prediksi terverifikasi</p>
      </div>
      <div className="divide-y divide-gray-50">
        {users.map((user, i) => {
          const rank = i + 1;
          const rankStyle = getRankStyle(rank);

          return (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span
                className={`text-[11px] font-bold w-4 text-center ${
                  rank <= 3 ? rankStyle.color : "text-gray-300"
                }`}
              >
                {rank}
              </span>
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.username}
                  className={`w-7 h-7 rounded-full object-cover ${
                    rank <= 3 ? `ring-2 ${rankStyle.bg}` : ""
                  }`}
                  loading="lazy"
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    rank <= 3 ? rankStyle.bg + " " + rankStyle.color : "bg-accent/10 text-accent"
                  }`}
                >
                  {(user.name || user.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-900 truncate">
                  {user.name ?? user.username}
                </p>
                <p className="text-[10px] text-gray-400">
                  {user.correct}/{user.total} benar
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[13px] font-bold ${
                  user.accuracyPct >= 70
                    ? "text-emerald-600"
                    : user.accuracyPct >= 50
                      ? "text-amber-600"
                      : "text-red-500"
                }`}>
                  {user.accuracyPct}%
                </span>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">akurasi</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getRankStyle(rank: number): { color: string; bg: string } {
  const styles: Record<number, { color: string; bg: string }> = {
    1: { color: "text-amber-600", bg: "bg-amber-50 ring-amber-200" },
    2: { color: "text-gray-500", bg: "bg-gray-50 ring-gray-200" },
    3: { color: "text-orange-600", bg: "bg-orange-50 ring-orange-200" },
  };
  return styles[rank] ?? { color: "text-gray-300", bg: "" };
}
