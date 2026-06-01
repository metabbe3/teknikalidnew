"use client";

import { useQuery } from "@tanstack/react-query";

interface Achievement {
  type: string;
  label: string;
  desc: string;
  icon: string;
  unlockedAt: string;
}

export function ProfileAchievements({ userId }: { userId: string }) {
  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      const res = await fetch(`/api/achievements?userId=${userId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-amber-500 rounded-full" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Pencapaian</h2>
        <span className="text-xs text-text-tertiary font-mono">{achievements.length}</span>
      </div>
      <div className="bg-bg-card depth-shadow rounded-xl p-4 border border-border">
        <div className="flex flex-wrap gap-2">
          {achievements.map((a) => (
            <span
              key={a.type}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700"
              title={a.desc}
            >
              <span className="text-sm">{a.icon}</span>
              {a.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
