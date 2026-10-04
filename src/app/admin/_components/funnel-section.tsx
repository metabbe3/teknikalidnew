"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface FunnelDay {
  day: string;
  views: number;
  signin: number;
  register: number;
  complete: number;
  authed: number;
  signups: number;
}

interface FunnelData {
  series: FunnelDay[];
  totals: { views: number; signin: number; register: number; complete: number; signups: number };
  registerByUtm?: { utmSource: string | null; views: number }[];
}

/**
 * Conversion funnel section: human pageviews → /auth page views → registrations.
 * /auth tracking started 2026-09-07 — earlier days show 0 auth stages by design.
 */
export function FunnelSection() {
  const { data, isLoading } = useQuery<FunnelData>({
    queryKey: ["admin-funnel"],
    queryFn: async () => {
      const res = await fetch("/api/admin/funnel?days=30");
      if (!res.ok) throw new Error("Failed to fetch funnel");
      return (await res.json()).data;
    },
  });

  const totals = data?.totals;
  const stages = [
    { label: "Pageviews (manusia)", value: totals?.views ?? 0, color: "bg-blue-500", note: "" },
    {
      label: "Lihat /auth/signin",
      value: totals?.signin ?? 0,
      color: "bg-indigo-500",
      note: "tracking mulai 7 Sep 2026",
    },
    {
      label: "Lihat /auth/register",
      value: totals?.register ?? 0,
      color: "bg-purple-500",
      note: "",
    },
    { label: "Registrasi baru", value: totals?.signups ?? 0, color: "bg-emerald-500", note: "" },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));

  const recent = (data?.series ?? []).slice(0, 14);

  return (
    <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Filter className="h-4 w-4 text-emerald-500" />
          Conversion Funnel
          <span className="text-xs font-normal text-gray-400">— 30 hari · hari kalender WIB</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
        ) : !data ? (
          <p className="text-sm text-gray-400">Gagal memuat funnel.</p>
        ) : (
          <div className="space-y-4">
            {/* Stage bars */}
            <div className="space-y-2.5">
              {stages.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs text-gray-600">{s.label}</span>
                  <div className="flex-1">
                    <div className="h-5 rounded bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded transition-all`}
                        style={{ width: `${Math.max(s.value > 0 ? 3 : 0, (s.value / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-14 text-right font-mono text-xs font-bold text-gray-700 tabular-nums">
                    {s.value.toLocaleString("id-ID")}
                  </span>
                  <span className="w-24 text-[10px] text-gray-400">{s.note}</span>
                </div>
              ))}
            </div>

            {/* Rates */}
            <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-xs">
              <span className="text-gray-500">
                View → signin page:{" "}
                <strong className="text-gray-700">
                  {totals && totals.views > 0 ? ((totals.signin / totals.views) * 100).toFixed(1) : "0.0"}%
                </strong>
              </span>
              <span className="text-gray-500">
                Signin → register page:{" "}
                <strong className="text-gray-700">
                  {totals && totals.signin > 0 ? ((totals.register / totals.signin) * 100).toFixed(1) : "—"}
                </strong>
              </span>
              <span className="text-gray-500">
                Register page → akun baru:{" "}
                <strong className="text-gray-700">
                  {totals && totals.register > 0 ? ((totals.signups / totals.register) * 100).toFixed(1) : "—"}
                </strong>
              </span>
            </div>

            {/* Register views per UTM source (attribution of the signup hook) */}
            {data.registerByUtm && data.registerByUtm.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs">
                <span className="text-gray-500">Register views per sumber:</span>
                {data.registerByUtm.map((u) => (
                  <span key={u.utmSource ?? "direct"} className="font-mono text-gray-700">
                    {u.utmSource ?? "organic/direct"}:{" "}
                    <strong className="text-gray-800">{u.views.toLocaleString("id-ID")}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Recent days table */}
            {recent.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  Per hari (14 terakhir)
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-400">
                        <th className="py-1.5 pr-3 font-medium">Tanggal</th>
                        <th className="py-1.5 pr-3 font-medium">Views</th>
                        <th className="py-1.5 pr-3 font-medium">Signin</th>
                        <th className="py-1.5 pr-3 font-medium">Register</th>
                        <th className="py-1.5 pr-3 font-medium">Signup</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums text-gray-600">
                      {recent.map((d) => (
                        <tr key={d.day} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3">{String(d.day).slice(0, 10)}</td>
                          <td className="py-1.5 pr-3">{d.views}</td>
                          <td className="py-1.5 pr-3">{d.signin}</td>
                          <td className="py-1.5 pr-3">{d.register}</td>
                          <td className="py-1.5 pr-3 font-bold text-emerald-600">{d.signups || "·"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
