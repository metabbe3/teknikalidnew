"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

interface RetentionOverview {
  weekStart: string;
  weekEnd: string;
  returningIps: number;
  totalIps: number;
  returningPct: number | null;
  guardPct: number;
  guardOk: boolean;
  sparkline: Array<{ weekStart: string; returningPct: number | null }>;
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

/** ponytail: inline-SVG sparkline 0 dep — math follows /admin/retention pattern */
function NorthStarSparkline({
  points,
  guard,
}: {
  points: Array<{ weekStart: string; returningPct: number | null }>;
  guard: number;
}) {
  const vals = points.map((p) => p.returningPct).filter((v): v is number => v !== null);
  if (vals.length < 2) return <div className="text-xs text-gray-400">Data belum cukup</div>;
  const w = 280, h = 44, pad = 5;
  const min = Math.min(...vals, guard);
  const max = Math.max(...vals, guard);
  const span = max - min || 1;
  const yOf = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const coords = points.map((p, i) => ({
    x: pad + (i * (w - 2 * pad)) / (points.length - 1),
    y: p.returningPct === null ? null : yOf(p.returningPct),
  }));
  const drawn = coords.filter((c): c is { x: number; y: number } => c.y !== null);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" role="img" aria-label="Returning IP % 8 minggu">
      <line x1={pad} y1={yOf(guard)} x2={w - pad} y2={yOf(guard)} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
      <polyline
        fill="none"
        points={drawn.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")}
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {drawn.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#2563eb" />
      ))}
    </svg>
  );
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

  const { data: nsData, isLoading: nsLoading } = useQuery<RetentionOverview>({
    queryKey: ["admin-retention-ns"],
    queryFn: async () => {
      const r = await fetch("/api/admin/retention");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 300_000,
  });

  const isLoading = statusLoading || healthLoading || nsLoading;

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
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">North Star — Weekly Returning Visitor %</div>
              <div className="text-3xl font-extrabold text-gray-900 tabular-nums">
                {nsLoading ? "…" : nsData ? `${nsData.returningPct?.toFixed(1) ?? "—"}%` : "—"}
              </div>
              <div className="text-xs text-gray-500">
                {nsData ? `${nsData.returningIps}/${nsData.totalIps} IP nobot · minggu ${nsData.weekStart} s/d ${nsData.weekEnd} (WIB)` : "Memuat data retensi…"}
              </div>
            </div>
            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${!nsData ? "bg-gray-100 text-gray-500" : nsData.guardOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`} title={`Guard ${nsData?.guardPct ?? 12}%`}>
              {nsData ? (nsData.guardOk ? "OK" : "BELOW GUARD") : "…"} · guard {nsData?.guardPct ?? 12}%
            </span>
            <Link href="/admin/retention" className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">Detail Retensi →</Link>
          </div>
          <div className="mt-3"><NorthStarSparkline points={nsData?.sparkline ?? []} guard={nsData?.guardPct ?? 12} /></div>
        </CardContent>
      </Card>

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
