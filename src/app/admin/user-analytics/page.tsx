"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Users, UserPlus, Activity, BarChart3 } from "lucide-react";
import { formatVolume } from "@/lib/utils";

interface UserAnalyticsData {
  overview: {
    totalUsers: number;
    dau: number;
    mau: number;
    newUsersThisWeek: number;
  };
  dailyStats: { date: string; count: number }[];
  retentionCohorts: Array<{
    label: string;
    signupCount: number;
    activeCount: number;
    pct: number;
  }>;
  peakHours: Array<{ day: string; hours: number[] }>;
  providers: Array<{ provider: string; count: number }>;
  topReputation: Array<{
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    reputation: number;
  }>;
}

export default function UserAnalyticsPage() {
  const { data, isLoading } = useQuery<UserAnalyticsData>({
    queryKey: ["admin-user-analytics"],
    queryFn: () => fetch("/api/admin/user-analytics").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Total Users", icon: Users, value: formatVolume(data?.overview.totalUsers ?? 0), gradient: "blue" as const },
    { title: "DAU", icon: Activity, value: formatVolume(data?.overview.dau ?? 0), subtitle: "Active today", gradient: "emerald" as const },
    { title: "MAU", icon: BarChart3, value: formatVolume(data?.overview.mau ?? 0), subtitle: "Active last 30 days", gradient: "amber" as const },
    { title: "New This Week", icon: UserPlus, value: formatVolume(data?.overview.newUsersThisWeek ?? 0), gradient: "rose" as const },
  ];

  const dailyStats = data?.dailyStats ?? [];
  const maxDaily = Math.max(1, ...dailyStats.map((d) => d.count));

  // Peak hours heatmap
  const peakHours = data?.peakHours ?? [];
  const maxPeak = Math.max(1, ...peakHours.flatMap((d) => d.hours));

  const reputationColumns = [
    {
      header: "User",
      cell: (r: UserAnalyticsData["topReputation"][0]) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={r.image ?? undefined} />
            <AvatarFallback className="bg-blue-500 text-white text-[10px]">
              {(r.username ?? r.name ?? "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">@{r.username ?? "unknown"}</span>
        </div>
      ),
    },
    {
      header: "Reputation",
      cell: (r: UserAnalyticsData["topReputation"][0]) => (
        <span className="text-sm font-bold text-amber-600 tabular-nums">{r.reputation}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="User Growth & Retention"
        description="Registration trends, active users, and engagement patterns"
        icon={Users}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* Registration trend */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Registration Trend (14 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ) : dailyStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No registration data yet</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {dailyStats.map((day) => {
                const height = Math.max(4, (day.count / maxDaily) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} signups`}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums">{day.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Retention cohorts */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-700">Retention Cohorts</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <div className="space-y-3">
                {(data?.retentionCohorts ?? []).map((cohort) => (
                  <div key={cohort.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 shrink-0">{cohort.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${cohort.pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold tabular-nums text-gray-700 w-14 text-right">{cohort.pct}%</span>
                    <span className="text-[10px] text-gray-400 w-28 text-right">{cohort.activeCount}/{cohort.signupCount} active</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* OAuth distribution */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-700">Auth Provider Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <div className="space-y-3">
                {(data?.providers ?? []).map((p) => {
                  const total = data?.providers.reduce((sum, x) => sum + x.count, 0) || 1;
                  const pct = Math.round((p.count / total) * 100);
                  const color = p.provider === "google" ? "bg-blue-500" : "bg-violet-500";
                  return (
                    <div key={p.provider} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-24 capitalize">{p.provider}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold tabular-nums text-gray-700 w-16 text-right">{p.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak hours heatmap */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Peak Activity Hours (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : peakHours.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex items-center gap-px mb-1 pl-12">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[8px] text-gray-400 tabular-nums">
                      {h % 3 === 0 ? `${h}` : ""}
                    </div>
                  ))}
                </div>
                {/* Grid */}
                {peakHours.map((row) => (
                  <div key={row.day} className="flex items-center gap-px mb-px">
                    <span className="w-12 text-[10px] text-gray-500 font-medium shrink-0">{row.day}</span>
                    {row.hours.map((count, h) => {
                      const intensity = count / maxPeak;
                      const bg = count === 0
                        ? "bg-gray-50"
                        : intensity > 0.7
                          ? "bg-blue-500"
                          : intensity > 0.4
                            ? "bg-blue-400"
                            : intensity > 0.15
                              ? "bg-blue-300"
                              : "bg-blue-100";
                      return (
                        <div
                          key={h}
                          className={`flex-1 h-5 rounded-sm ${bg} transition-colors duration-200`}
                          title={`${row.day} ${h}:00 — ${count} activities`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top reputation users */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Top Users by Reputation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={reputationColumns}
            data={data?.topReputation}
            loading={isLoading}
            emptyMessage="No users yet"
            keyFn={(r) => r.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
