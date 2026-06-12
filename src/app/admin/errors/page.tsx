"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Activity,
  Bot,
  Clock,
  Search,
  AlertCircle,
} from "lucide-react";
import { timeAgo } from "@/lib/time";

interface ErrorEntry {
  id: string;
  source: "cron" | "agent";
  sourceName: string;
  message: string;
  severity: "error";
  createdAt: string;
  context: {
    durationMs?: number;
    triggeredBy?: string;
    priority?: number;
  };
}

interface ErrorOverview {
  totalErrors: number;
  cronErrors: number;
  agentErrors: number;
  unresolvedAgentJobs: number;
}

interface ErrorData {
  overview: ErrorOverview;
  errors: ErrorEntry[];
}

function formatDuration(ms: number | undefined): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ErrorHubPage() {
  const [source, setSource] = useState<string>("all");
  const [period, setPeriod] = useState<string>("24h");
  const [search, setSearch] = useState<string>("");

  const { data, isLoading } = useQuery<ErrorData>({
    queryKey: ["admin-errors", source, period, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (source !== "all") params.set("source", source);
      params.set("period", period);
      if (search.trim()) params.set("search", search.trim());

      const r = await fetch(`/api/admin/errors?${params.toString()}`);
      if (!r.ok) return undefined;
      const json = await r.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const overview = data?.overview;

  const errorColumns = [
    {
      header: "Source",
      cell: (entry: ErrorEntry) => (
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${
            entry.source === "cron"
              ? "border-blue-300 text-blue-600 bg-blue-50"
              : "border-violet-300 text-violet-600 bg-violet-50"
          }`}
        >
          {entry.source === "cron" ? "Cron" : "Agent"}
        </Badge>
      ),
    },
    {
      header: "Job",
      cell: (entry: ErrorEntry) => (
        <span className="text-xs font-semibold text-gray-700">
          {entry.sourceName}
        </span>
      ),
    },
    {
      header: "Message",
      cell: (entry: ErrorEntry) => (
        <span className="text-xs text-red-500 truncate max-w-[300px] block" title={entry.message}>
          {entry.message.length > 120 ? `${entry.message.slice(0, 120)}...` : entry.message}
        </span>
      ),
    },
    {
      header: "Time",
      cell: (entry: ErrorEntry) => (
        <span className="text-xs text-gray-400 font-mono">
          {timeAgo(entry.createdAt, "en")}
        </span>
      ),
    },
    {
      header: "Context",
      cell: (entry: ErrorEntry) => {
        if (entry.source === "cron" && entry.context.durationMs != null) {
          return (
            <span className="text-xs font-mono tabular-nums text-blue-600">
              {formatDuration(entry.context.durationMs)}
            </span>
          );
        }
        if (entry.source === "agent" && entry.context.priority != null) {
          return (
            <span className="text-xs text-gray-500">
              P{entry.context.priority}
            </span>
          );
        }
        return <span className="text-xs text-gray-300">-</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Error Hub"
        description="Unified view of all system errors"
        icon={AlertTriangle}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard
          title="Total Errors (24h)"
          icon={Activity}
          value={overview?.totalErrors ?? 0}
          loading={isLoading}
          gradient="blue"
        />
        <AdminKpiCard
          title="Cron Failures"
          icon={Clock}
          value={overview?.cronErrors ?? 0}
          loading={isLoading}
          gradient="amber"
        />
        <AdminKpiCard
          title="Agent Failures"
          icon={Bot}
          value={overview?.agentErrors ?? 0}
          loading={isLoading}
          gradient="rose"
        />
        <AdminKpiCard
          title="Unresolved"
          icon={AlertCircle}
          value={overview?.unresolvedAgentJobs ?? 0}
          loading={isLoading}
          gradient="rose"
        />
      </div>

      {/* Error Feed Table */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Error Feed
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="all">All Sources</option>
                <option value="cron">Cron</option>
                <option value="agent">Agent</option>
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
              </select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search errors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md pl-7 pr-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={errorColumns}
            data={data?.errors}
            loading={isLoading}
            emptyMessage="No errors found"
            keyFn={(entry) => entry.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
