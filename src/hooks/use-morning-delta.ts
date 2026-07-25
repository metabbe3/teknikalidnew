"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { DeltaBullet } from "@/domains/stock/morning-delta.service";

export interface MorningDelta {
  asOf: string | null;
  trackedCount: number;
  bullets: DeltaBullet[];
}

export function useMorningDelta() {
  const { status } = useSession();
  return useQuery<MorningDelta>({
    queryKey: ["morning-delta"],
    queryFn: async () => {
      const res = await fetch("/api/me/morning-delta");
      if (!res.ok) throw new Error("Gagal memuat ringkasan");
      const json = await res.json();
      return json.data as MorningDelta;
    },
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
}
