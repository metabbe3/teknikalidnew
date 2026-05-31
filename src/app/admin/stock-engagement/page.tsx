"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { BarChart3, Star, MessageSquare, TrendingUp } from "lucide-react";
import { formatVolume } from "@/lib/utils";

interface StockEngagementData {
  overview: {
    totalFollows: number;
    taggedPostsToday: number;
    uniqueTickersThisWeek: number;
    avgFollowers: number;
  };
  topFollowed: Array<{ ticker: string; followers: number; newThisWeek: number }>;
  topDiscussed: Array<{ ticker: string; posts: number }>;
  trending: Array<{ ticker: string; newFollowers: number }>;
  sectorDistribution: Array<{ sector: string; count: number }>;
}

export default function StockEngagementPage() {
  const { data, isLoading } = useQuery<StockEngagementData>({
    queryKey: ["admin-stock-engagement"],
    queryFn: () => fetch("/api/admin/stock-engagement").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Total Follows", icon: Star, value: formatVolume(data?.overview.totalFollows ?? 0), gradient: "blue" as const },
    { title: "Tagged Posts Today", icon: MessageSquare, value: formatVolume(data?.overview.taggedPostsToday ?? 0), gradient: "emerald" as const },
    { title: "Unique Tickers", icon: BarChart3, value: formatVolume(data?.overview.uniqueTickersThisWeek ?? 0), subtitle: "Discussed this week", gradient: "amber" as const },
    { title: "Avg Followers", icon: TrendingUp, value: formatVolume(data?.overview.avgFollowers ?? 0), subtitle: "Per stock", gradient: "rose" as const },
  ];

  const followedColumns = [
    {
      header: "Ticker",
      cell: (r: { ticker: string }) => (
        <span className="font-mono font-extrabold text-sm text-gray-900">{r.ticker.replace(".JK", "")}</span>
      ),
    },
    {
      header: "Followers",
      cell: (r: { followers: number }) => (
        <span className="text-sm font-bold text-blue-600 tabular-nums">{r.followers}</span>
      ),
    },
    {
      header: "+This Week",
      cell: (r: { newThisWeek: number }) => (
        <span className={`text-sm tabular-nums ${r.newThisWeek > 0 ? "text-emerald-600 font-bold" : "text-gray-400"}`}>
          {r.newThisWeek > 0 ? `+${r.newThisWeek}` : "-"}
        </span>
      ),
    },
  ];

  const discussedColumns = [
    {
      header: "Ticker",
      cell: (r: { ticker: string }) => (
        <span className="font-mono font-extrabold text-sm text-gray-900">{r.ticker.replace(".JK", "")}</span>
      ),
    },
    {
      header: "Posts",
      cell: (r: { posts: number }) => (
        <span className="text-sm font-bold text-violet-600 tabular-nums">{r.posts}</span>
      ),
    },
  ];

  const maxSector = Math.max(1, ...(data?.sectorDistribution.map((s) => s.count) ?? []));

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Stock Engagement"
        description="Follow trends, discussions, and sector activity"
        icon={BarChart3}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Most Followed */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Star className="h-4 w-4 text-blue-500" />
              Most Followed Stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={followedColumns}
              data={data?.topFollowed}
              loading={isLoading}
              emptyMessage="No stock follows yet"
              keyFn={(r) => r.ticker}
            />
          </CardContent>
        </Card>

        {/* Most Discussed */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <MessageSquare className="h-4 w-4 text-violet-500" />
              Most Discussed (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={discussedColumns}
              data={data?.topDiscussed}
              loading={isLoading}
              emptyMessage="No stock discussions yet"
              keyFn={(r) => r.ticker}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sector distribution */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Posts by Sector (This Week)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
          ) : (data?.sectorDistribution.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sector data yet</p>
          ) : (
            <div className="space-y-2.5">
              {(data?.sectorDistribution ?? []).map((s) => {
                const pct = Math.round((s.count / maxSector) * 100);
                return (
                  <div key={s.sector} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-700 w-40 shrink-0 truncate">{s.sector}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-gray-600 w-8 text-right">{s.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trending stocks */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Trending — New Followers This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
          ) : (data?.trending.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No trending stocks this week</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {(data?.trending ?? []).map((t) => (
                <div key={t.ticker} className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 shadow-sm">
                  <span className="font-mono font-extrabold text-sm text-gray-900">{t.ticker.replace(".JK", "")}</span>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs">+{t.newFollowers}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
