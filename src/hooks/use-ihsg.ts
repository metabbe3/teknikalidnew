"use client";

import { useQuery } from "@tanstack/react-query";

export interface IhsgData {
  close: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  date: string | null;
}

export function useIhsg() {
  return useQuery<IhsgData>({
    queryKey: ["ihsg"],
    queryFn: async () => {
      const res = await fetch("/api/market/ihsg");
      if (!res.ok) throw new Error("Gagal memuat IHSG");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });
}
