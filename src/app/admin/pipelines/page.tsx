"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { ManualTriggerButtons } from "@/components/admin/manual-trigger-buttons";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw,
  Radio,
  FileText,
  Settings,
  Wifi,
} from "lucide-react";
import { timeAgo } from "@/lib/time";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = "cron" | "sync" | "indicators" | "services";

const TABS: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: "cron", label: "Cron Jobs", icon: Clock },
  { key: "sync", label: "Sync Logs", icon: Database },
  { key: "indicators", label: "Indicators", icon: Activity },
  { key: "services", label: "Services & Config", icon: Settings },
];

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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

interface SyncLog {
  date: string;
  pricesWritten: number;
  indicatorsWritten: number;
}

interface ActivityEntry {
  action: string;
  timestamp: string;
  duration: number;
  status: string;
}

interface EodData {
  syncLogs: SyncLog[];
  activityEntries: ActivityEntry[];
}

interface TickerFreshness {
  ticker: string;
  lastUpdate: string;
}

interface IntradayData {
  activityEntries: ActivityEntry[];
  tickerFreshness: TickerFreshness[];
}

interface HealthData {
  services: {
    yahoo: { status: string; latency: number };
    db: { status: string; latency: number };
    qstash: { status: string };
    sentry: { configured: boolean };
  };
  envVars: Record<string, boolean>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function jobStatusColor(job: JobStat): string {
  if (!job.lastRun) return "bg-gray-300";
  if (job.lastRun.status === "failed") return "bg-red-500";
  const hoursSince =
    (Date.now() - new Date(job.lastRun.startedAt).getTime()) /
    (1000 * 60 * 60);
  if (hoursSince > 24) return "bg-amber-500";
  return "bg-emerald-500";
}

function freshnessStatus(lastUpdate: string): {
  label: string;
  variant: "default" | "secondary" | "destructive";
  className: string;
} {
  const age = Date.now() - new Date(lastUpdate).getTime();
  if (age < 3_600_000)
    return {
      label: "Fresh",
      variant: "default",
      className: "bg-emerald-500 hover:bg-emerald-600",
    };
  if (age < 14_400_000)
    return {
      label: "1-4h",
      variant: "secondary",
      className: "bg-amber-500 hover:bg-amber-600 text-white",
    };
  return { label: "Stale", variant: "destructive", className: "" };
}

function serviceStatusIcon(status: string) {
  if (["connected", "healthy", "ok"].includes(status))
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (["error", "down"].includes(status))
    return <XCircle className="h-4 w-4 text-red-500" />;
  return <div className="h-4 w-4 rounded-full bg-gray-300" />;
}

const CRON_SCHEDULES = [
  {
    name: "EOD Sync",
    schedule: "16:30 WIB (market close)",
    route: "/api/cron/sync-eod",
    description:
      "Fetches end-of-day prices and calculates technical indicators for all active stocks",
    color: "blue",
  },
  {
    name: "Intraday Sync",
    schedule: "Every 15 min during market hours",
    route: "/api/cron/sync-intraday",
    description: "Updates real-time prices for IDX40 + watchlisted stocks",
    color: "emerald",
  },
];

// ===========================================================================
// Main Page Component
// ===========================================================================

export default function PipelinesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("cron");

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Data Pipelines"
        description="Consolidated view of cron jobs, sync logs, indicators, and service health"
        icon={Database}
      />

      {/* Tab Bar */}
      <div className="flex items-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className={
                isActive
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "cron" && <CronJobsTab />}
      {activeTab === "sync" && <SyncLogsTab />}
      {activeTab === "indicators" && <IndicatorsTab />}
      {activeTab === "services" && <ServicesConfigTab />}
    </div>
  );
}

// ===========================================================================
// Tab 1: Cron Jobs
// ===========================================================================

function CronJobsTab() {
  const [filterJob, setFilterJob] = useState<string>("all");
  const queryClient = useQueryClient();

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

  const triggerMutation = useMutation({
    mutationFn: async (jobName: string) => {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: jobName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Trigger failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const filteredLogs =
    filterJob === "all"
      ? data?.recentLogs
      : data?.recentLogs.filter((l) => l.jobName === filterJob);

  const overview = data?.overview;

  // -- Job Status columns --
  const jobColumns = [
    {
      header: "Status",
      cell: (job: JobStat) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${jobStatusColor(job)}`}
          />
        </div>
      ),
    },
    {
      header: "Job",
      cell: (job: JobStat) => (
        <div>
          <div className="text-sm font-semibold text-gray-800">
            {job.displayName}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {job.description}
          </div>
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
      cell: (job: JobStat) =>
        job.lastRun ? (
          <div>
            <div className="text-xs text-gray-600">
              {timeAgo(job.lastRun.startedAt)}
            </div>
            <Badge
              variant={
                job.lastRun.status === "success" ? "default" : "destructive"
              }
              className={`text-[10px] px-1.5 py-0 ${
                job.lastRun.status === "success"
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : ""
              }`}
            >
              {job.lastRun.status}
              {job.lastRun.triggeredBy === "manual" && " (manual)"}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Never</span>
        ),
    },
    {
      header: "Success (7d)",
      cell: (job: JobStat) => (
        <div className="text-center">
          {job.totalRuns7d > 0 ? (
            <span
              className={`text-sm font-bold tabular-nums ${
                job.successRate7d >= 90
                  ? "text-emerald-600"
                  : job.successRate7d >= 50
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {job.successRate7d}%
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
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
          onClick={() => triggerMutation.mutate(job.jobName)}
          disabled={triggerMutation.isPending}
          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          title={`Trigger ${job.displayName}`}
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${
              triggerMutation.isPending ? "animate-spin" : ""
            }`}
          />
        </button>
      ),
    },
  ];

  // -- Execution History columns --
  const logColumns = [
    {
      header: "Status",
      cell: (log: CronLogEntry) => (
        <Badge
          variant={log.status === "success" ? "default" : "destructive"}
          className={`text-[10px] px-1.5 py-0 ${
            log.status === "success"
              ? "bg-emerald-500 hover:bg-emerald-600"
              : ""
          }`}
        >
          {log.status}
        </Badge>
      ),
    },
    {
      header: "Job",
      cell: (log: CronLogEntry) => (
        <span className="text-xs font-semibold text-gray-700">
          {log.jobName}
        </span>
      ),
    },
    {
      header: "Duration",
      cell: (log: CronLogEntry) => (
        <span className="text-xs font-mono tabular-nums text-blue-600">
          {formatDuration(log.durationMs)}
        </span>
      ),
    },
    {
      header: "Time",
      cell: (log: CronLogEntry) => (
        <span className="text-xs text-gray-400 font-mono">
          {timeAgo(log.startedAt)}
        </span>
      ),
    },
    {
      header: "Details",
      cell: (log: CronLogEntry) =>
        log.errorMessage ? (
          <span className="text-xs text-red-500 truncate max-w-[200px] block">
            {log.errorMessage.slice(0, 100)}
          </span>
        ) : log.result ? (
          <span className="text-xs text-gray-400 truncate max-w-[200px] block">
            {JSON.stringify(log.result).slice(0, 100)}
          </span>
        ) : (
          <span className="text-xs text-gray-300">-</span>
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
    <div className="space-y-6">
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
                <option key={job.jobName} value={job.jobName}>
                  {job.displayName}
                </option>
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

      {/* Manual Trigger Section */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <RotateCw className="h-4 w-4 text-amber-500" />
            Manual Triggers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ManualTriggerButtons />
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// Tab 2: Sync Logs
// ===========================================================================

function SyncLogsTab() {
  const [syncSubTab, setSyncSubTab] = useState<"eod" | "intraday">("eod");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  // EOD data
  const eodQuery = useQuery<EodData>({
    queryKey: ["admin-eod-logs", from, to],
    queryFn: async () => {
      const r = await fetch(`/api/admin/eod-logs?from=${from}&to=${to}`);
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  // Intraday data
  const intradayQuery = useQuery<IntradayData>({
    queryKey: ["admin-intraday-logs"],
    queryFn: async () => {
      const r = await fetch("/api/admin/intraday-logs");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 30_000,
  });

  // -- EOD columns --
  const syncColumns = [
    {
      header: "Date",
      cell: (r: SyncLog) => (
        <span className="font-bold text-gray-900">{r.date}</span>
      ),
    },
    {
      header: "Prices",
      cell: (r: SyncLog) => (
        <span className="tabular-nums font-bold text-blue-600">
          {r.pricesWritten}
        </span>
      ),
    },
    {
      header: "Indicators",
      cell: (r: SyncLog) => (
        <span className="tabular-nums font-bold text-violet-600">
          {r.indicatorsWritten}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r: SyncLog) => (
        <Badge
          variant={r.pricesWritten > 0 ? "default" : "destructive"}
          className={
            r.pricesWritten > 0 ? "bg-emerald-500 hover:bg-emerald-600" : ""
          }
        >
          {r.pricesWritten > 0 ? "OK" : "Empty"}
        </Badge>
      ),
    },
  ];

  // -- Shared activity columns --
  const eodActivityColumns = [
    {
      header: "Status",
      cell: (r: ActivityEntry) => (
        <Badge
          variant={r.status === "success" ? "default" : "destructive"}
          className={
            r.status === "success"
              ? "bg-emerald-500 hover:bg-emerald-600"
              : ""
          }
        >
          {r.status}
        </Badge>
      ),
    },
    {
      header: "Action",
      cell: (r: ActivityEntry) => (
        <span className="text-sm font-semibold text-gray-800">{r.action}</span>
      ),
    },
    {
      header: "Duration",
      cell: (r: ActivityEntry) => (
        <span className="text-sm font-mono tabular-nums font-semibold text-blue-600">
          {r.duration}s
        </span>
      ),
    },
    {
      header: "Time",
      cell: (r: ActivityEntry) => (
        <span className="text-xs text-gray-400 font-mono">
          {timeAgo(r.timestamp)}
        </span>
      ),
      className: "text-right",
    },
  ];

  // -- Ticker Freshness columns --
  const freshnessColumns = [
    {
      header: "Ticker",
      cell: (r: TickerFreshness) => (
        <span className="font-mono font-bold text-sm text-gray-900">
          {r.ticker}
        </span>
      ),
    },
    {
      header: "Last Update",
      cell: (r: TickerFreshness) => (
        <span className="text-xs text-gray-400">
          {timeAgo(r.lastUpdate)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r: TickerFreshness) => {
        const { label, variant, className } = freshnessStatus(r.lastUpdate);
        return (
          <Badge variant={variant} className={className}>
            {label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={syncSubTab === "eod" ? "default" : "outline"}
          size="sm"
          onClick={() => setSyncSubTab("eod")}
          className={
            syncSubTab === "eod"
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          EOD Sync
        </Button>
        <Button
          variant={syncSubTab === "intraday" ? "default" : "outline"}
          size="sm"
          onClick={() => setSyncSubTab("intraday")}
          className={
            syncSubTab === "intraday"
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }
        >
          <Radio className="h-3.5 w-3.5 mr-1.5" />
          Intraday Sync
        </Button>
      </div>

      {/* EOD Sync */}
      {syncSubTab === "eod" && (
        <>
          <div className="flex items-center justify-end">
            <DateRangeFilter
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </div>

          <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
              <CardTitle className="text-sm font-bold text-gray-800">
                Daily Sync Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminDataTable
                columns={syncColumns}
                data={eodQuery.data?.syncLogs}
                loading={eodQuery.isLoading}
                emptyMessage="No EOD sync data in selected range"
                keyFn={(r) => r.date}
              />
            </CardContent>
          </Card>

          <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <Activity className="h-4 w-4 text-blue-500" />
                Recent EOD Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminDataTable
                columns={eodActivityColumns}
                data={eodQuery.data?.activityEntries}
                loading={eodQuery.isLoading}
                emptyMessage="No EOD activity recorded since last restart"
                keyFn={(_, i) => i}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Intraday Sync */}
      {syncSubTab === "intraday" && (
        <>
          <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <Radio className="h-4 w-4 text-emerald-500" />
                Recent Intraday Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminDataTable
                columns={eodActivityColumns}
                data={intradayQuery.data?.activityEntries}
                loading={intradayQuery.isLoading}
                emptyMessage="No intraday activity recorded since last restart"
                keyFn={(_, i) => i}
              />
            </CardContent>
          </Card>

          <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
              <CardTitle className="text-sm font-bold text-gray-800">
                Ticker Freshness
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminDataTable
                columns={freshnessColumns}
                data={intradayQuery.data?.tickerFreshness}
                loading={intradayQuery.isLoading}
                emptyMessage="No ticker data available"
                keyFn={(r) => r.ticker}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ===========================================================================
// Tab 3: Indicators
// ===========================================================================

function IndicatorsTab() {
  return (
    <div className="space-y-6">
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Activity className="h-4 w-4 text-violet-500" />
            Technical Indicator Management
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-50">
              <Activity className="h-6 w-6 text-violet-500" />
            </div>
            <p className="text-sm text-gray-600">
              Technical indicators are recalculated automatically during EOD sync.
            </p>
            <p className="text-xs text-gray-400">
              Indicators include RSI, MACD, SMA (20/50/200), EMA, Bollinger Bands,
              Stochastic, ADX, and ATR for all IDX40 stocks.
            </p>
            <p className="text-xs text-gray-400">
              Use the{" "}
              <span className="font-semibold text-gray-500">Manual Triggers</span>{" "}
              in the Cron Jobs tab to force a recalculation via{" "}
              <code className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                recalculate-indicators
              </code>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// Tab 4: Services & Config
// ===========================================================================

function ServicesConfigTab() {
  const { data, isLoading } = useQuery<HealthData>({
    queryKey: ["admin-health-checks"],
    queryFn: async () => {
      const r = await fetch("/api/admin/health-checks");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const services = [
    {
      name: "Yahoo Finance API",
      icon: Wifi,
      status: data?.services.yahoo.status ?? "unknown",
      detail:
        (data?.services.yahoo.latency ?? 0) > 0
          ? `${data!.services.yahoo.latency}ms`
          : undefined,
    },
    {
      name: "Database (PostgreSQL)",
      icon: Database,
      status: data?.services.db.status ?? "unknown",
      detail:
        (data?.services.db.latency ?? 0) > 0
          ? `${data!.services.db.latency}ms`
          : undefined,
    },
    {
      name: "QStash (Queue)",
      icon: Clock,
      status: data?.services.qstash.status ?? "unknown",
    },
    {
      name: "Sentry (Monitoring)",
      icon: CheckCircle,
      status: data?.services.sentry.configured ? "configured" : "missing",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Service Health Cards */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Wifi className="h-4 w-4 text-blue-500" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.name}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200/80 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {svc.name}
                      </p>
                      {svc.detail && (
                        <p className="text-xs text-gray-400 font-mono">
                          {svc.detail}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {serviceStatusIcon(svc.status)}
                    <Badge
                      variant={
                        ["connected", "healthy", "configured", "ok"].includes(
                          svc.status
                        )
                          ? "default"
                          : ["error", "down"].includes(svc.status)
                          ? "destructive"
                          : "outline"
                      }
                      className={
                        ["connected", "healthy", "configured", "ok"].includes(
                          svc.status
                        )
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : ""
                      }
                    >
                      {svc.status}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Env Vars Status */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Settings className="h-4 w-4 text-gray-500" />
            Environment Variables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-gray-50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            Object.entries(data?.envVars ?? {}).map(([key, configured]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                <span className="text-sm font-mono text-gray-700">{key}</span>
                {configured ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]">
                    Set
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    Missing
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Queue Monitor Info */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Clock className="h-4 w-4 text-amber-500" />
            Queue Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                data?.services.qstash.status === "connected"
                  ? "bg-emerald-500"
                  : data?.services.qstash.status === "error"
                  ? "bg-red-500"
                  : "bg-gray-300"
              }`}
            />
            <span className="text-sm text-gray-600">
              {data?.services.qstash.status === "connected"
                ? "QStash queue is connected and operational."
                : data?.services.qstash.status === "error"
                ? "QStash connection error. Check configuration."
                : "QStash is not configured. Cron jobs run via HTTP triggers only."}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Static Cron Schedule List */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Clock className="h-4 w-4 text-blue-500" />
            Scheduled Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {CRON_SCHEDULES.map((cron) => (
            <div
              key={cron.name}
              className={`flex items-start justify-between p-4 rounded-xl border border-gray-200/80 bg-white shadow-md shadow-gray-200/30 admin-accent-${cron.color}-left`}
            >
              <div>
                <p className="text-sm font-bold text-gray-800">{cron.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {cron.description}
                </p>
                <p className="text-xs font-mono text-gray-400 mt-1">
                  {cron.route}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-violet-50 text-violet-700 border-violet-200 shrink-0"
              >
                {cron.schedule}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
