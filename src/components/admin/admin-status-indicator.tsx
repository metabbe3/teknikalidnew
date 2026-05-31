"use client";

import { useQuery } from "@tanstack/react-query";

export function AdminStatusIndicator() {
  const { data } = useQuery<{ dbPool: { status: string } }>({
    queryKey: ["admin-status-dot"],
    queryFn: async () => {
      const r = await fetch("/api/admin/status");
      if (!r.ok) return null;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const healthy = data?.dbPool?.status === "connected";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ml-1 ${healthy ? "bg-emerald-400 text-emerald-400 admin-pulse-dot" : "bg-rose-400"}`}
      title={healthy ? "DB Connected" : "DB Error"}
    />
  );
}
