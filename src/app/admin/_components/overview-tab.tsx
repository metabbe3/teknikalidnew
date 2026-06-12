"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManualTriggerButtons } from "@/components/admin/manual-trigger-buttons";
import { Activity, Database, Radio, Wifi, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { timeAgo } from "@/lib/time";

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

interface HealthData {
  services: {
    yahoo: { status: string; latency: number };
    db: { status: string; latency: number };
    qstash: { status: string };
    sentry: { configured: boolean };
  };
  envVars: Record<string, boolean>;
}

export function OverviewTab() {
  const { data: statusData, isLoading: statusLoading } = useQuery<StatusData>({
    queryKey: ["admin-status"],
    queryFn: async () => {
      const r = await fetch("/api/admin/status");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["admin-health-checks"],
    queryFn: async () => {
      const r = await fetch("/api/admin/health-checks");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const isLoading = statusLoading || healthLoading;

  const serviceCards = [
    {
      title: "Database",
      icon: Database,
      status: healthData?.services.db.status ?? statusData?.dbPool.status ?? "unknown",
      detail: healthData?.services.db.latency ? `${healthData.services.db.latency}ms` : undefined,
      gradient: "blue" as const,
    },
    {
      title: "Yahoo Finance",
      icon: Wifi,
      status: healthData?.services.yahoo.status ?? statusData?.yahooApi.status ?? "unknown",
      detail: healthData?.services.yahoo.latency ? `${healthData.services.yahoo.latency}ms` : statusData?.yahooApi.latency ? `${statusData.yahooApi.latency}ms` : undefined,
      gradient: "emerald" as const,
    },
    {
      title: "QStash",
      icon: Radio,
      status: healthData?.services.qstash.status ?? "unknown",
      detail: undefined,
      gradient: "amber" as const,
    },
    {
      title: "Sentry",
      icon: Shield,
      status: healthData?.services.sentry.configured ? "connected" : "not_configured",
      detail: healthData?.services.sentry.configured ? "Configured" : "Not set",
      gradient: "rose" as const,
    },
  ];

  const syncCards = [
    {
      title: "Last EOD Sync",
      icon: Activity,
      status: statusData?.lastEodSync?.status ?? "unknown",
      detail: timeAgo(statusData?.lastEodSync?.timestamp ?? null),
      gradient: "blue" as const,
    },
    {
      title: "Last Intraday Sync",
      icon: Radio,
      status: statusData?.lastIntradaySync?.status ?? "unknown",
      detail: timeAgo(statusData?.lastIntradaySync?.timestamp ?? null),
      gradient: "emerald" as const,
    },
  ];

  const activityColumns = [
    {
      header: "Status",
      cell: (e: StatusData["recentActivity"][0]) => (
        <Badge
          variant={e.status === "success" ? "default" : "destructive"}
          className={e.status === "success" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
        >
          {e.status}
        </Badge>
      ),
    },
    {
      header: "Action",
      cell: (e: StatusData["recentActivity"][0]) => (
        <span className="text-sm font-semibold text-gray-800">{e.action}</span>
      ),
    },
    {
      header: "Duration",
      cell: (e: StatusData["recentActivity"][0]) => (
        <span className="text-sm font-mono tabular-nums font-semibold text-blue-600">
          {e.duration}s
        </span>
      ),
    },
    {
      header: "Time",
      cell: (e: StatusData["recentActivity"][0]) => (
        <span className="text-xs text-gray-400 font-mono">{timeAgo(e.timestamp)}</span>
      ),
      className: "text-right",
    },
  ];

  const envColumns = [
    {
      header: "Variable",
      cell: (e: [string, boolean]) => (
        <span className="font-mono text-xs text-gray-700">{e[0]}</span>
      ),
    },
    {
      header: "Status",
      cell: (e: [string, boolean]) => (
        <div className="flex items-center gap-1.5">
          {e[1] ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className={`text-xs font-medium ${e[1] ? "text-emerald-600" : "text-amber-600"}`}>
            {e[1] ? "Set" : "Missing"}
          </span>
        </div>
      ),
    },
  ];

  const envEntries = healthData
    ? Object.entries(healthData.envVars)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Service Health Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {serviceCards.map((card) => (
          <AdminKpiCard
            key={card.title}
            title={card.title}
            icon={card.icon}
            value={card.status}
            subtitle={card.detail}
            status={card.status as "success"}
            loading={isLoading}
            gradient={card.gradient}
          />
        ))}
      </div>

      {/* Sync Status + Manual Triggers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {syncCards.map((card) => (
          <AdminKpiCard
            key={card.title}
            title={card.title}
            icon={card.icon}
            value={card.status}
            subtitle={card.detail}
            status={card.status as "success"}
            loading={statusLoading}
            gradient={card.gradient}
          />
        ))}
        <div className="sm:col-span-2 flex items-center">
          <ManualTriggerButtons />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30 lg:col-span-2">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="text-sm font-bold text-gray-800">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={activityColumns}
              data={statusData?.recentActivity}
              loading={statusLoading}
              emptyMessage="No activity recorded yet"
              keyFn={(_, i) => i}
            />
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="text-sm font-bold text-gray-800">Environment Variables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={envColumns}
              data={envEntries}
              loading={healthLoading}
              emptyMessage="No env data available"
              keyFn={(r) => r[0]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
