"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Shield, Key, Users, UserX } from "lucide-react";
import { formatVolume, timeAgo } from "@/lib/utils";

interface AuthHealthData {
  overview: {
    activeSessions: number;
    totalAccounts: number;
    sessionsToday: number;
    bannedUsers: number;
  };
  providers: Array<{ provider: string; count: number }>;
  recentBans: Array<{
    id: string;
    username: string | null;
    email: string;
    bannedAt: string;
  }>;
  cacheUsage: Array<{
    keyPrefix: string;
    count: number;
    lastFetched: string;
  }>;
}

export default function AuthHealthPage() {
  const { data, isLoading } = useQuery<AuthHealthData>({
    queryKey: ["admin-auth-health"],
    queryFn: async () => {
      const r = await fetch("/api/admin/auth-health");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Active Sessions", icon: Key, value: formatVolume(data?.overview.activeSessions ?? 0), gradient: "blue" as const },
    { title: "Total Accounts", icon: Users, value: formatVolume(data?.overview.totalAccounts ?? 0), gradient: "emerald" as const },
    { title: "Sessions Today", icon: Shield, value: formatVolume(data?.overview.sessionsToday ?? 0), gradient: "amber" as const },
    { title: "Banned Users", icon: UserX, value: formatVolume(data?.overview.bannedUsers ?? 0), gradient: "rose" as const },
  ];

  const bansColumns = [
    {
      header: "User",
      cell: (r: AuthHealthData["recentBans"][0]) => (
        <span className="text-sm font-bold text-gray-800">@{r.username ?? "unknown"}</span>
      ),
    },
    {
      header: "Email",
      cell: (r: AuthHealthData["recentBans"][0]) => (
        <span className="text-sm text-gray-500 font-mono">{r.email}</span>
      ),
    },
    {
      header: "Banned",
      cell: (r: AuthHealthData["recentBans"][0]) => (
        <span className="text-xs text-gray-400 font-mono">{timeAgo(r.bannedAt)}</span>
      ),
    },
  ];

  const cacheColumns = [
    {
      header: "Key Prefix",
      cell: (r: AuthHealthData["cacheUsage"][0]) => (
        <span className="font-mono text-xs text-gray-700">{r.keyPrefix}</span>
      ),
    },
    {
      header: "Calls",
      cell: (r: AuthHealthData["cacheUsage"][0]) => (
        <span className="text-sm font-semibold text-blue-600 tabular-nums">{r.count}</span>
      ),
    },
    {
      header: "Last Fetched",
      cell: (r: AuthHealthData["cacheUsage"][0]) => (
        <span className="text-xs text-gray-400">{timeAgo(r.lastFetched)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Auth & Security"
        description="Session tracking, authentication providers, and security overview"
        icon={Shield}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Provider distribution */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="text-sm font-bold text-gray-800">Auth Provider Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
            ) : (data?.providers.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No accounts yet</p>
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

        {/* Recent bans */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <UserX className="h-4 w-4 text-rose-500" />
              Recent Bans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={bansColumns}
              data={data?.recentBans}
              loading={isLoading}
              emptyMessage="No banned users"
              keyFn={(r) => r.id}
            />
          </CardContent>
        </Card>
      </div>

      {/* API cache usage */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">API Cache Usage</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={cacheColumns}
            data={data?.cacheUsage}
            loading={isLoading}
            emptyMessage="No cached API calls"
            keyFn={(r) => r.keyPrefix}
          />
        </CardContent>
      </Card>
    </div>
  );
}
