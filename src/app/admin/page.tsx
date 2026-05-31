"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualTriggerButtons } from "@/components/admin/manual-trigger-buttons";
import { Activity, Database, Radio, Wifi } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface StatusData {
  lastEodSync: { status: string; timestamp: string | null };
  lastIntradaySync: { status: string; timestamp: string | null };
  dbPool: { status: string };
  yahooApi: { status: string; latency: number };
  recentActivity: Array<{
    action: string;
    timestamp: string;
    duration: number;
    status: string;
  }>;
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery<StatusData>({
    queryKey: ["admin-status"],
    queryFn: async () => {
      const r = await fetch("/api/admin/status");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const kpis = [
    {
      title: "Last EOD Sync",
      icon: Activity,
      status: data?.lastEodSync?.status ?? "unknown",
      detail: timeAgo(data?.lastEodSync?.timestamp ?? null),
      gradient: "blue" as const,
    },
    {
      title: "Last Intraday Sync",
      icon: Radio,
      status: data?.lastIntradaySync?.status ?? "unknown",
      detail: timeAgo(data?.lastIntradaySync?.timestamp ?? null),
      gradient: "emerald" as const,
    },
    {
      title: "Database",
      icon: Database,
      status: data?.dbPool?.status ?? "unknown",
      detail: data?.dbPool?.status === "connected" ? "Healthy" : "Error",
      gradient: "amber" as const,
    },
    {
      title: "Yahoo Finance API",
      icon: Wifi,
      status: data?.yahooApi?.status ?? "unknown",
      detail: data?.yahooApi?.latency ? `${data.yahooApi.latency}ms` : undefined,
      gradient: "rose" as const,
    },
  ];

  const activityColumns = [
    {
      header: "Status",
      cell: (e: StatusData["recentActivity"][0]) => (
        <Badge variant={e.status === "success" ? "default" : "destructive"}
          className={e.status === "success" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
          {e.status}
        </Badge>
      ),
    },
    { header: "Action", cell: (e: StatusData["recentActivity"][0]) => <span className="text-sm font-semibold text-gray-800">{e.action}</span> },
    { header: "Duration", cell: (e: StatusData["recentActivity"][0]) => <span className="text-sm font-mono tabular-nums font-semibold text-blue-600">{e.duration}s</span> },
    { header: "Time", cell: (e: StatusData["recentActivity"][0]) => <span className="text-xs text-gray-400 font-mono">{timeAgo(e.timestamp)}</span>, className: "text-right" },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="System Health"
        description="Real-time monitoring dashboard"
        icon={Activity}
        actions={<ManualTriggerButtons />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard
            key={kpi.title}
            title={kpi.title}
            icon={kpi.icon}
            value={kpi.status}
            subtitle={kpi.detail}
            status={kpi.status as "success"}
            loading={isLoading}
            gradient={kpi.gradient}
          />
        ))}
      </div>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={activityColumns}
            data={data?.recentActivity}
            loading={isLoading}
            emptyMessage="No activity recorded yet"
            keyFn={(_, i) => i}
          />
        </CardContent>
      </Card>
    </div>
  );
}
