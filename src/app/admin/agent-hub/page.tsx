"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Activity,
  Search,
  FileCheck,
  TrendingUp,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Bell,
  MessageSquare,
  Users,
} from "lucide-react";

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  seo_optimizer: Search,
  content_quality: FileCheck,
  market_intel: TrendingUp,
  site_health: Activity,
  stock_alert: Bell,
  anomaly_detection: AlertTriangle,
  community_sentiment: MessageSquare,
  user_engagement: Users,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

interface AgentStat {
  type: string;
  label: string;
  lastRun: string | null;
  lastStatus: string | null;
  successRate: number;
  totalRuns: number;
}

interface JobRow {
  id: string;
  agentType: string;
  status: string;
  priority: number;
  createdAt: string;
  completedAt: string | null;
  startedAt: string | null;
  error: string | null;
}

interface HubStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  agents: AgentStat[];
  recentJobs: JobRow[];
}

export default function AgentHubPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: HubStats }>({
    queryKey: ["agent-hub-stats"],
    queryFn: async () => {
      const r = await fetch("/api/admin/agent-hub");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 15_000, // Auto-refresh every 15s
  });

  const triggerMutation = useMutation({
    mutationFn: async (agentType: string) => {
      const r = await fetch("/api/admin/agent-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType }),
      });
      if (!r.ok) throw new Error("Failed to trigger agent");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-hub-stats"] });
    },
  });

  const stats = data?.data;
  const agents = stats?.agents ?? [];
  const recentJobs = stats?.recentJobs ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">Loading Agent Hub...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-7 w-7 text-indigo-600" />
            AI Agent Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">Centralized agent orchestration — monitor, trigger, and manage AI agents</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {stats?.runningJobs ?? 0} running
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats?.totalJobs ?? 0}</div>
            <div className="text-xs text-gray-500">Total Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingJobs ?? 0}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats?.completedJobs ?? 0}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats?.failedJobs ?? 0}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const Icon = AGENT_ICONS[agent.type] ?? Bot;
            const isRunning = agent.lastStatus === "running";
            const triggerLoading = triggerMutation.isPending && triggerMutation.variables === agent.type;

            return (
              <Card key={agent.type} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-50">
                        <Icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.label}</CardTitle>
                        <p className="text-xs text-gray-400">{agent.type}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerMutation.mutate(agent.type)}
                      disabled={isRunning || triggerLoading}
                    >
                      {triggerLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      Run
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-semibold">{agent.totalRuns}</div>
                      <div className="text-xs text-gray-400">Runs</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{agent.successRate}%</div>
                      <div className="text-xs text-gray-400">Success</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        {agent.lastRun
                          ? `${timeAgo(agent.lastRun)}`
                          : "Never"}
                      </div>
                      <div className="text-xs text-gray-400">Last Run</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Link
                      href={`/admin/agent-hub/${agent.type}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      View Details <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Jobs</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left p-3 font-medium text-gray-500">Agent</th>
                    <th className="text-left p-3 font-medium text-gray-500">Status</th>
                    <th className="text-left p-3 font-medium text-gray-500">Priority</th>
                    <th className="text-left p-3 font-medium text-gray-500">Created</th>
                    <th className="text-left p-3 font-medium text-gray-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400">
                        No jobs yet. Trigger an agent to get started.
                      </td>
                    </tr>
                  ) : (
                    recentJobs.map((job) => (
                      <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50/50">
                        <td className="p-3">
                          <span className="font-mono text-xs">{job.agentType}</span>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="p-3 text-gray-500">{job.priority}</td>
                        <td className="p-3 text-gray-500 text-xs">{timeAgo(job.createdAt)}</td>
                        <td className="p-3 text-gray-500 text-xs">
                          {job.startedAt && job.completedAt
                            ? `${Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)}s`
                            : job.status === "running"
                            ? "Running..."
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
  const icon =
    status === "done" ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
    status === "failed" ? <XCircle className="h-3 w-3 mr-1" /> :
    status === "running" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
    status === "pending" ? <Clock className="h-3 w-3 mr-1" /> :
    <AlertTriangle className="h-3 w-3 mr-1" />;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
