"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  RotateCw,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface CronLogEntry {
  id: number;
  jobName: string;
  status: string;
  startedAt: string;
  durationMs: number;
  result?: Record<string, unknown>;
  errorMessage?: string;
  triggeredBy: string;
}

interface JobStat {
  jobName: string;
  displayName: string;
  description: string;
  schedule: string;
  method: string;
  route: string;
  totalRuns7d: number;
  successRate7d: number;
  avgDurationMs: number | null;
  lastRun: {
    status: string;
    startedAt: string;
    durationMs: number;
    triggeredBy: string;
  } | null;
  hasData: boolean;
}

interface OverviewStats {
  total: number;
  successes: number;
  failed: number;
  successRate: number;
  avgDurationMs: number | null;
}

interface CronMonitorData {
  overview: OverviewStats;
  jobStats: JobStat[];
  recentLogs: CronLogEntry[];
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function jobStatusColor(job: JobStat): string {
  if (!job.lastRun) return "bg-gray-300";
  if (job.lastRun.status === "failed") return "bg-red-500";
  const hoursSince = (Date.now() - new Date(job.lastRun.startedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince > 24) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function CronMonitorPage() {
  const [filterJob, setFilterJob] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery<CronMonitorData>({
    queryKey: ["admin-cron-monitor"],
    queryFn: async () => {
      const r = await fetch("/api/admin/cron-monitor");
      if (!r.ok) return undefined;
      const json = await r.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const filteredLogs = filterJob === "all"
    ? data?.recentLogs
    : data?.recentLogs.filter((l) => l.jobName === filterJob);

  const overview = data?.overview;

  const jobColumns = [
    {
      header: "Status",
      cell: (job: JobStat) => (
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${jobStatusColor(job)}`} />
        </div>
      ),
    },
    {
      header: "Job",
      cell: (job: JobStat) => (
        <div>
          <div className="text-sm font-semibold text-gray-800">{job.displayName}</div>
          <div className="text-xs text-gray-400 mt-0.5">{job.description}</div>
        </div>
      ),
    },
    {
      header: "Schedule",
      cell: (job: JobStat) => (
        <span className="text-xs text-gray-500 font-mono">{job.schedule}</span>
      ),
    },
    {
      header: "Last Run",
      cell: (job: JobStat) => (
        job.lastRun
          ? (
            <div>
              <div className="text-xs text-gray-600">
                {timeAgo(job.lastRun.startedAt)}
              </div>
              <Badge
                variant={job.lastRun.status === "success" ? "default" : "destructive"}
                className={`text-[10px] px-1.5 py-0 ${job.lastRun.status === "success" ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
              >
                {job.lastRun.status}
                {job.lastRun.triggeredBy === "manual" && " (manual)"}
              </Badge>
            </div>
          )
          : <span className="text-xs text-gray-400">Never</span>
      ),
    },
    {
      header: "Success (7d)",
      cell: (job: JobStat) => (
        <div className="text-center">
          {job.totalRuns7d > 0
            ? (
              <span className={`text-sm font-bold tabular-nums ${job.successRate7d >= 90 ? "text-emerald-600" : job.successRate7d >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {job.successRate7d}%
              </span>
            )
            : <span className="text-xs text-gray-400">-</span>
          }
          {job.totalRuns7d > 0 && (
            <div className="text-[10px] text-gray-400">{job.totalRuns7d} runs</div>
          )}
        </div>
      ),
    },
    {
      header: "Avg Duration",
      cell: (job: JobStat) => (
        <span className="text-xs font-mono tabular-nums text-blue-600">
          {formatDuration(job.avgDurationMs)}
        </span>
      ),
    },
    {
      header: "Trigger",
      cell: (job: JobStat) => (
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/admin/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: job.jobName }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || `Trigger failed (${res.status})`);
              }
              refetch();
            } catch (e) {
              alert("Trigger failed: network error");
            }
          }}
          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
          title={`Trigger ${job.displayName}`}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  const logColumns = [
    {
      header: "Status",
      cell: (log: CronLogEntry) => (
        <Badge
          variant={log.status === "success" ? "default" : "destructive"}
          className={`text-[10px] px-1.5 py-0 ${log.status === "success" ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
        >
          {log.status}
        </Badge>
      ),
    },
    {
      header: "Job",
      cell: (log: CronLogEntry) => (
        <span className="text-xs font-semibold text-gray-700">{log.jobName}</span>
      ),
    },
    {
      header: "Duration",
      cell: (log: CronLogEntry) => (
        <span className="text-xs font-mono tabular-nums text-blue-600">{formatDuration(log.durationMs)}</span>
      ),
    },
    {
      header: "Time",
      cell: (log: CronLogEntry) => (
        <span className="text-xs text-gray-400 font-mono">{timeAgo(log.startedAt)}</span>
      ),
    },
    {
      header: "Details",
      cell: (log: CronLogEntry) => (
        log.errorMessage
          ? <span className="text-xs text-red-500 truncate max-w-[200px] block">{log.errorMessage.slice(0, 100)}</span>
          : log.result
            ? <span className="text-xs text-gray-400 truncate max-w-[200px] block">{JSON.stringify(log.result).slice(0, 100)}</span>
            : <span className="text-xs text-gray-300">-</span>
      ),
    },
    {
      header: "Source",
      cell: (log: CronLogEntry) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {log.triggeredBy}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Cron Monitor"
        description="Unified view of all cron job executions with persistent history"
        icon={Clock}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard
          title="Total Runs (24h)"
          icon={Activity}
          value={overview?.total ?? 0}
          loading={isLoading}
          gradient="blue"
        />
        <AdminKpiCard
          title="Success Rate (24h)"
          icon={CheckCircle}
          value={overview ? `${overview.successRate}%` : "-"}
          loading={isLoading}
          gradient="emerald"
        />
        <AdminKpiCard
          title="Failed Runs (24h)"
          icon={XCircle}
          value={overview?.failed ?? 0}
          loading={isLoading}
          gradient="rose"
        />
        <AdminKpiCard
          title="Avg Duration (24h)"
          icon={Clock}
          value={formatDuration(overview?.avgDurationMs ?? null)}
          loading={isLoading}
          gradient="amber"
        />
      </div>

      {/* Job Status Table */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Activity className="h-4 w-4 text-blue-500" />
            Job Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={jobColumns}
            data={data?.jobStats}
            loading={isLoading}
            emptyMessage="No cron jobs registered"
            keyFn={(job) => job.jobName}
          />
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Clock className="h-4 w-4 text-indigo-500" />
              Execution History
            </CardTitle>
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">All Jobs</option>
              {data?.jobStats.map((job) => (
                <option key={job.jobName} value={job.jobName}>{job.displayName}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={logColumns}
            data={filteredLogs}
            loading={isLoading}
            emptyMessage="No execution history yet"
            keyFn={(log) => log.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
