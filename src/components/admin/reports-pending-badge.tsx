"use client";

import { useQuery } from "@tanstack/react-query";

export function ReportsPendingBadge() {
  const { data } = useQuery({
    queryKey: ["reports-pending-count"],
    queryFn: async () => {
      const r = await fetch("/api/admin/reports/pending-count");
      if (!r.ok) throw new Error("Gagal memuat jumlah laporan pending");
      return (await r.json()) as { data: { count: number } };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const count = data?.data?.count ?? 0;
  if (!count) return null;

  return (
    <span className="ml-auto shrink-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500/90 px-1 text-[10px] font-semibold tabular-nums text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
