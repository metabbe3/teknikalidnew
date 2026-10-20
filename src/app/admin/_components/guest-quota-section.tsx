"use client";

/**
 * GuestQuotaSection — panel Retention Loop v2 di admin analytics.
 * Data: ShareEvent target='guest_quota' (beacon dari GuestStockTracker),
 * context = hitungan ticker ke-n hari itu per visitor.
 * Metrik inti: berapa anon yang menjelajah N saham/hari (reach funnel),
 * dan distribusi kedalaman jelajah — apakah kuota 5/hari memicu register.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface QuotaDay {
  day: string;
  visitors: number;
  events: number;
  hitCap: number; // visitors yang capai >=6 ticker (lewat kuota)
}

interface QuotaData {
  series: QuotaDay[];
  totals: { visitors: number; events: number; hitCap: number; avgTickers: number };
  depth: Array<{ bucket: string; visitors: number }>;
}

export function GuestQuotaSection() {
  const { data, isLoading } = useQuery<QuotaData>({
    queryKey: ["admin-guest-quota"],
    queryFn: async () => {
      const res = await fetch("/api/admin/guest-quota?days=14");
      if (!res.ok) throw new Error("Failed to fetch guest quota");
      return (await res.json()).data;
    },
  });

  const t = data?.totals;
  const maxDepth = Math.max(1, ...(data?.depth ?? []).map((d) => d.visitors));

  return (
    <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Eye className="h-4 w-4 text-amber-500" />
          Jelajah Anon (Kuota 5/hari)
          <span className="text-xs font-normal text-gray-400">
            —berapa dalam anon menjelajah sebelum register · live sejak 20 Okt 2026
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading || !t ? (
          <p className="text-sm text-gray-400 py-6 text-center">Memuat…</p>
        ) : t.events === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            Belum ada aktivitas anon tercatat.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs text-gray-500">Anon aktif (14d)</p>
                <p className="text-xl font-bold text-gray-800 tabular-nums">{t.visitors}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs text-gray-500">Saham dijelajah</p>
                <p className="text-xl font-bold text-gray-800 tabular-nums">{t.events}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs text-gray-500">Rata² ticker/visitor</p>
                <p className="text-xl font-bold text-gray-800 tabular-nums">
                  {t.avgTickers.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-600">Capai kuota (≥6)</p>
                <p className="text-xl font-bold text-amber-700 tabular-nums">{t.hitCap}</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-2">
              Distribusi kedalaman jelajah (ticker unik/hari)
            </p>
            <div className="space-y-1.5">
              {data?.depth.map((d) => (
                <div key={d.bucket} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-gray-500 tabular-nums text-right">
                    {d.bucket}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${d.bucket.startsWith("6+") ? "bg-amber-500" : "bg-blue-400"}`}
                      style={{ width: `${(d.visitors / maxDepth) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-xs text-gray-500 tabular-nums">{d.visitors}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">
                Hipotesis: bucket 6+ (amber) = visitor yang lihat banner register —
                bandingkan rasio signup funnel di hari yang sama.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
