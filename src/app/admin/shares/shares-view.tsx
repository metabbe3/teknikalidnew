"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { Share2, Link2, MessageCircle, Send } from "lucide-react";
import { wibDayStart, wibNextDayStart } from "@/lib/datetime-wib";

interface ShareData {
  total: number;
  byTarget: { target: string; count: number }[];
  byContext: { context: string; count: number }[];
  daily: { date: string; count: number }[];
  topPaths: { path: string; count: number }[];
}

const QUICK_RANGES = [
  { label: "Today", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
] as const;

const TARGET_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  whatsapp: { label: "WhatsApp", color: "bg-[#25D366]", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  x: { label: "X", color: "bg-black", icon: <Share2 className="h-3.5 w-3.5" /> },
  telegram: { label: "Telegram", color: "bg-[#0088cc]", icon: <Send className="h-3.5 w-3.5" /> },
  copy: { label: "Copy Link", color: "bg-slate-500", icon: <Link2 className="h-3.5 w-3.5" /> },
  story: { label: "Story", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: <Share2 className="h-3.5 w-3.5" /> },
};

// Calendar-day WIB bounds: Today = today's WIB day; N Days = last N WIB days inclusive.
function buildRange(days: number) {
  const now = new Date();
  const end = wibNextDayStart(now);
  const start = wibDayStart(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  return { start, end };
}

export function SharesView() {
  const [rangeDays, setRangeDays] = useState<number>(7);

  const url = useCallback(() => {
    const { start, end } = buildRange(rangeDays);
    const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
    return `/api/admin/shares?${params}`;
  }, [rangeDays]);

  const { data, isLoading } = useQuery<ShareData>({
    queryKey: ["admin-shares", rangeDays],
    queryFn: async () => {
      const r = await fetch(url());
      if (!r.ok) return undefined;
      const json = await r.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const total = data?.total ?? 0;
  const byTarget = data?.byTarget ?? [];
  const byContext = data?.byContext ?? [];
  const daily = data?.daily ?? [];
  const topPaths = data?.topPaths ?? [];
  const count = (t: string) => byTarget.find((x) => x.target === t)?.count ?? 0;
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));
  const maxTarget = Math.max(1, ...byTarget.map((t) => t.count));

  const kpis = [
    { title: "Total Shares", icon: Share2, value: total, subtitle: "real clicks (bots excluded)", gradient: "blue" as const },
    { title: "WhatsApp", icon: MessageCircle, value: count("whatsapp"), subtitle: undefined, gradient: "emerald" as const },
    { title: "Copy Link", icon: Link2, value: count("copy"), subtitle: undefined, gradient: "amber" as const },
    { title: "Top Context", icon: Share2, value: byContext[0]?.context ?? "-", subtitle: byContext[0] ? `${byContext[0].count} clicks` : undefined, gradient: "rose" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {QUICK_RANGES.map((r) => (
            <Button
              key={r.days}
              variant={rangeDays === r.days ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          Range: 00:00–23:59 WIB (calendar day, not rolling 24h)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily bars */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Shares per day (WIB)</CardTitle></CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No shares in this range.</p>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {daily.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t bg-blue-500/80 hover:bg-blue-600 transition-colors"
                      style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                      title={`${d.date}: ${d.count}`}
                    />
                    <span className="text-[9px] text-slate-400">{d.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By target bars */}
        <Card>
          <CardHeader><CardTitle className="text-sm">By channel</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byTarget.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No data.</p>
            ) : (
              byTarget.map((t) => {
                const meta = TARGET_META[t.target] ?? { label: t.target, color: "bg-slate-400", icon: null };
                return (
                  <div key={t.target} className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 w-24 text-xs text-slate-600">
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white ${meta.color}`}>
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                    <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                      <div className={`h-full ${meta.color}`} style={{ width: `${(t.count / maxTarget) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold text-slate-700">{t.count}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top shared paths */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top shared pages</CardTitle></CardHeader>
        <CardContent>
          {topPaths.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No data.</p>
          ) : (
            <div className="space-y-1">
              {topPaths.map((p) => (
                <div key={p.path} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-600 truncate mr-2">{p.path}</span>
                  <span className="font-semibold text-slate-700">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
