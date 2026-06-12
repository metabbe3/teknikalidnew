"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Eye, Users, UserCheck, UserX, Globe, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatVolume } from "@/lib/utils";

interface PageViewsData {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    authedViews: number;
    anonViews: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
    changePct: number | null;
  }>;
  dailyViews: Array<{
    date: string;
    views: number;
    uniqueVisitors: number;
  }>;
  topReferrers: Array<{
    referrer: string | null;
    count: number;
  }>;
}

export function PageViewsTab() {
  const { data, isLoading } = useQuery<PageViewsData>({
    queryKey: ["admin-page-views"],
    queryFn: async () => {
      const r = await fetch("/api/admin/page-views");
      if (!r.ok) return undefined;
      const json = await r.json();
      return json.data ?? json;
    },
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Total Views", icon: Eye, value: formatVolume(data?.overview.totalViews ?? 0), gradient: "blue" as const },
    { title: "Unique Visitors", icon: Users, value: formatVolume(data?.overview.uniqueVisitors ?? 0), gradient: "emerald" as const },
    { title: "Authed Views", icon: UserCheck, value: formatVolume(data?.overview.authedViews ?? 0), gradient: "amber" as const },
    { title: "Anon Views", icon: UserX, value: formatVolume(data?.overview.anonViews ?? 0), gradient: "rose" as const },
  ];

  const topPagesColumns = [
    {
      header: "Path",
      cell: (r: PageViewsData["topPages"][0]) => (
        <span className="font-mono text-sm text-gray-800 font-medium truncate max-w-[300px] block">
          {r.path}
        </span>
      ),
    },
    {
      header: "Views",
      cell: (r: PageViewsData["topPages"][0]) => (
        <span className="text-sm font-bold text-blue-600 tabular-nums">{r.views}</span>
      ),
    },
    {
      header: "Unique Visitors",
      cell: (r: PageViewsData["topPages"][0]) => (
        <span className="text-sm font-semibold tabular-nums text-gray-600">{r.uniqueVisitors}</span>
      ),
    },
    {
      header: "Change",
      cell: (r: PageViewsData["topPages"][0]) => {
        if (r.changePct === null) {
          return <span className="text-xs text-gray-400">-</span>;
        }
        const isUp = r.changePct >= 0;
        return (
          <div className={`flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
            {isUp ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            <span className="text-sm font-bold tabular-nums">{Math.abs(r.changePct)}%</span>
          </div>
        );
      },
    },
  ];

  const referrerColumns = [
    {
      header: "Referrer",
      cell: (r: PageViewsData["topReferrers"][0]) => (
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700 truncate max-w-[300px] block font-medium">
            {r.referrer ?? "Direct / Unknown"}
          </span>
        </div>
      ),
    },
    {
      header: "Visits",
      cell: (r: PageViewsData["topReferrers"][0]) => (
        <span className="text-sm font-bold text-blue-600 tabular-nums">{r.count}</span>
      ),
    },
  ];

  // Daily views bar chart
  const dailyViews = data?.dailyViews ?? [];
  const maxDailyViews = Math.max(1, ...dailyViews.map((d) => d.views));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* Daily Views Chart */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Daily Page Views</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ) : dailyViews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No page view data yet</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {dailyViews.map((day) => {
                const height = Math.max(4, (day.views / maxDailyViews) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.views} views, ${day.uniqueVisitors} unique`}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums font-medium">
                      {day.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-cyan-400" />
              <span className="text-[10px] text-gray-500 font-medium">Page Views</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Pages */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Eye className="h-4 w-4 text-blue-500" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={topPagesColumns}
              data={data?.topPages}
              loading={isLoading}
              emptyMessage="No page view data"
              keyFn={(r) => r.path}
            />
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Globe className="h-4 w-4 text-emerald-500" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={referrerColumns}
              data={data?.topReferrers}
              loading={isLoading}
              emptyMessage="No referrer data"
              keyFn={(r) => r.referrer ?? "direct"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
