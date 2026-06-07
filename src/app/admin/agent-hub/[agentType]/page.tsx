"use client";

import { useState } from "react";
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
  ArrowLeft,
  Save,
  RotateCcw,
  Settings,
  Calendar,
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

const SCHEDULE_OPTIONS = [
  { value: "every_30m", label: "Every 30 minutes", cron: "*/30 * * * *" },
  { value: "hourly", label: "Hourly", cron: "0 * * * *" },
  { value: "every_6h", label: "Every 6 hours", cron: "0 1,7,13,19 * * *" },
  { value: "daily_08", label: "Daily 08:00 WIB", cron: "0 1 * * *" },
  { value: "daily_weekdays_08", label: "Daily 08:00 WIB (weekdays)", cron: "0 8 * * 1-5" },
  { value: "market_hours_30", label: "Every 30 min (market hours)", cron: "*/30 9-14 * * 1-5" },
  { value: "chained", label: "After article generation (chained)", cron: null },
  { value: "disabled", label: "Disabled", cron: null },
  { value: "custom", label: "Custom cron...", cron: null },
];

interface AgentConfig {
  id: string;
  agentType: string;
  isEnabled: boolean;
  systemPrompt: string | null;
  scheduleCron: string | null;
  scheduleMeta: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  updatedAt: string;
}

interface AgentDetail {
  type: string;
  label: string;
  description: string;
  icon: string;
  defaultSchedule: string;
  estimatedAiCalls: number;
  totalRuns: number;
  successCount: number;
  successRate: number;
  lastRun: string | null;
  lastStatus: string | null;
  lastResult: Record<string, unknown> | null;
  lastError: string | null;
  isRunning: boolean;
  config: AgentConfig | null;
  jobs: {
    jobs: Array<{
      id: string;
      agentType: string;
      status: string;
      priority: number;
      createdAt: string;
      completedAt: string | null;
      startedAt: string | null;
      error: string | null;
      result: Record<string, unknown> | null;
      attempts: number;
      parentJobId: string | null;
    }>;
    total: number;
  };
}

export default function AgentDetailPage() {
  const agentType = typeof window !== "undefined"
    ? window.location.pathname.split("/admin/agent-hub/")[1]?.replace(/\/$/, "") ?? ""
    : "";

  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "prompt" | "schedule" | "settings">("overview");

  // Prompt editor state
  const [promptDraft, setPromptDraft] = useState<string>("");
  const [promptLoaded, setPromptLoaded] = useState(false);

  // Schedule state
  const [schedulePreset, setSchedulePreset] = useState<string>("");
  const [customCron, setCustomCron] = useState<string>("");

  const { data, isLoading } = useQuery<{ data: AgentDetail }>({
    queryKey: ["agent-detail", agentType],
    queryFn: async () => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`);
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 10_000,
  });

  const detail = data?.data;
  const config = detail?.config;

  // Initialize prompt draft from config
  if (config && !promptLoaded) {
    setPromptDraft(config.systemPrompt ?? "");
    setPromptLoaded(true);
  }

  // Initialize schedule from config
  if (config && !schedulePreset) {
    const currentCron = config.scheduleCron;
    if (!currentCron) {
      const meta = config.scheduleMeta as Record<string, string> | null;
      setSchedulePreset(meta?.preset ?? "chained");
    } else {
      const match = SCHEDULE_OPTIONS.find((o) => o.cron === currentCron);
      setSchedulePreset(match?.value ?? "custom");
      if (!match) setCustomCron(currentCron);
    }
  }

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to trigger agent");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-detail", agentType] }),
  });

  const savePromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompt || null }),
      });
      if (!r.ok) throw new Error("Failed to save prompt");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-detail", agentType] }),
  });

  const resetPromptMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPrompt: true }),
      });
      if (!r.ok) throw new Error("Failed to reset prompt");
      return r.json();
    },
    onSuccess: () => {
      setPromptDraft("");
      setPromptLoaded(false);
      qc.invalidateQueries({ queryKey: ["agent-detail", agentType] });
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async ({ cron, preset }: { cron: string | null; preset: string }) => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleCron: cron,
          scheduleMeta: { preset, label: SCHEDULE_OPTIONS.find((o) => o.value === preset)?.label ?? "Custom" },
        }),
      });
      if (!r.ok) throw new Error("Failed to save schedule");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-detail", agentType] }),
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!r.ok) throw new Error("Failed to toggle agent");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-detail", agentType] }),
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configUpdate: Record<string, unknown>) => {
      const r = await fetch(`/api/admin/agent-hub/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configUpdate }),
      });
      if (!r.ok) throw new Error("Failed to save config");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-detail", agentType] }),
  });

  const Icon = AGENT_ICONS[agentType] ?? Bot;
  const jobs = detail?.jobs?.jobs ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/agent-hub" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Icon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{detail?.label ?? agentType}</h1>
                {config && (
                  <Badge variant={config.isEnabled ? "default" : "secondary"} className={config.isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                    {config.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">{detail?.description ?? ""}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => toggleEnabledMutation.mutate(!config?.isEnabled)}
          variant="outline"
          size="sm"
          disabled={!config}
        >
          {config?.isEnabled ? "Disable" : "Enable"}
        </Button>
        <Button
          onClick={() => triggerMutation.mutate()}
          disabled={detail?.isRunning || triggerMutation.isPending}
          size="sm"
        >
          {triggerMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {detail?.isRunning ? "Running..." : "Run Now"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: "overview", label: "Overview", icon: Activity },
          { key: "prompt", label: "Prompt", icon: FileCheck },
          { key: "schedule", label: "Schedule", icon: Calendar },
          { key: "settings", label: "Settings", icon: Settings },
        ] as const).map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <TabIcon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{detail?.totalRuns ?? 0}</div>
                <div className="text-xs text-gray-500">Total Runs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{detail?.successRate ?? 0}%</div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{detail?.estimatedAiCalls ?? 0}</div>
                <div className="text-xs text-gray-500">AI Calls/Run</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Schedule</div>
                <div className="text-sm font-medium">
                  {(config?.scheduleMeta as Record<string, string>)?.label ?? detail?.defaultSchedule ?? "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Last Run</div>
                <div className="text-sm font-medium">{detail?.lastRun ? timeAgo(detail.lastRun) : "Never"}</div>
              </CardContent>
            </Card>
          </div>

          {/* Last Result */}
          {detail?.lastResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(detail.lastResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Last Error */}
          {detail?.lastError && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm text-red-600">Last Error</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-red-50 p-3 rounded-lg text-red-800 overflow-auto">
                  {detail.lastError}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Job History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Job History ({detail?.jobs?.total ?? 0} total)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left p-3 font-medium text-gray-500">ID</th>
                      <th className="text-left p-3 font-medium text-gray-500">Status</th>
                      <th className="text-left p-3 font-medium text-gray-500">Priority</th>
                      <th className="text-left p-3 font-medium text-gray-500">Attempts</th>
                      <th className="text-left p-3 font-medium text-gray-500">Created</th>
                      <th className="text-left p-3 font-medium text-gray-500">Duration</th>
                      <th className="text-left p-3 font-medium text-gray-500">Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-400">
                          No jobs yet.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50/50">
                          <td className="p-3 font-mono text-xs">{job.id.slice(0, 12)}...</td>
                          <td className="p-3">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="p-3 text-gray-500">{job.priority}</td>
                          <td className="p-3 text-gray-500">{job.attempts}</td>
                          <td className="p-3 text-gray-500 text-xs">{timeAgo(job.createdAt)}</td>
                          <td className="p-3 text-gray-500 text-xs">
                            {job.startedAt && job.completedAt
                              ? `${Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)}s`
                              : job.status === "running"
                              ? "Running..."
                              : "-"}
                          </td>
                          <td className="p-3 text-gray-500 text-xs font-mono">
                            {job.parentJobId ? job.parentJobId.slice(0, 10) + "..." : "-"}
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
      )}

      {/* Tab: Prompt Editor */}
      {activeTab === "prompt" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">System Prompt</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPromptMutation.mutate()}
                    disabled={resetPromptMutation.isPending}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset to Default
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => savePromptMutation.mutate(promptDraft)}
                    disabled={savePromptMutation.isPending}
                  >
                    {savePromptMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-3">
                Override the default system prompt for this agent. Leave empty to use the code default.
                Changes take effect on the next job run.
              </p>
              <textarea
                className="w-full h-64 p-3 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                placeholder="Leave empty to use the default prompt..."
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
              />
              {savePromptMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-2">Prompt saved successfully.</p>
              )}
              {savePromptMutation.isError && (
                <p className="text-xs text-red-600 mt-2">Failed to save prompt.</p>
              )}
              {resetPromptMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-2">Prompt reset to default.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Schedule */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Schedule Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Preset</label>
                <select
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                  value={schedulePreset}
                  onChange={(e) => setSchedulePreset(e.target.value)}
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {schedulePreset === "custom" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Cron Expression</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg text-sm font-mono"
                    placeholder="0 8 * * 1-5"
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Format: minute hour dayOfMonth month dayOfWeek (in WIB timezone)
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">Current:</span>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {config?.scheduleCron ?? "No schedule (chained/manual only)"}
                </code>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  const selected = SCHEDULE_OPTIONS.find((o) => o.value === schedulePreset);
                  const cron = schedulePreset === "custom" ? customCron : (selected?.cron ?? null);
                  saveScheduleMutation.mutate({ cron, preset: schedulePreset });
                }}
                disabled={saveScheduleMutation.isPending}
              >
                {saveScheduleMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save Schedule
              </Button>

              {saveScheduleMutation.isSuccess && (
                <p className="text-xs text-green-600">Schedule saved.</p>
              )}
              {saveScheduleMutation.isError && (
                <p className="text-xs text-red-600">Failed to save schedule.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SEO Optimizer settings */}
              {agentType === "seo_optimizer" && (
                <SeoSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* Content Quality settings */}
              {agentType === "content_quality" && (
                <ContentQualitySettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* Market Intel settings */}
              {agentType === "market_intel" && (
                <MarketIntelSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* Site Health settings */}
              {agentType === "site_health" && (
                <SiteHealthSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* Stock Alert settings */}
              {agentType === "stock_alert" && (
                <StockAlertSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* Anomaly Detection settings */}
              {agentType === "anomaly_detection" && (
                <AnomalyDetectionSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* Community Sentiment settings */}
              {agentType === "community_sentiment" && (
                <CommunitySentimentSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}

              {/* User Engagement settings */}
              {agentType === "user_engagement" && (
                <UserEngagementSettings
                  config={config?.config ?? null}
                  onSave={(cfg) => saveConfigMutation.mutate(cfg)}
                  isSaving={saveConfigMutation.isPending}
                  isSaved={saveConfigMutation.isSuccess}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Toggle({ value, onChange, label, description }: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SeoSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const fixes = (config?.fixes as Record<string, boolean>) ?? {};
  const [autoApply, setAutoApply] = useState((config?.autoApply as boolean) ?? true);
  const [titleLength, setTitleLength] = useState(fixes.titleLength ?? true);
  const [metaDescription, setMetaDescription] = useState(fixes.metaDescription ?? true);
  const [tags, setTags] = useState(fixes.tags ?? true);
  const [titleOptimization, setTitleOptimization] = useState(fixes.titleOptimization ?? false);
  const [tagEnrichment, setTagEnrichment] = useState(fixes.tagEnrichment ?? false);
  const [headingStructure, setHeadingStructure] = useState(fixes.headingStructure ?? false);

  return (
    <div className="space-y-4">
      <Toggle value={autoApply} onChange={setAutoApply}
        label="Auto-Apply Fixes" description="Apply fixes automatically when issues are found" />

      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Critical Fixes (always on)</p>
        <Toggle value={titleLength} onChange={setTitleLength}
          label="Fix Short Titles" description="Generate SEO titles when too short or missing" />
        <Toggle value={metaDescription} onChange={setMetaDescription}
          label="Fix Missing Excerpts" description="Generate meta descriptions when empty" />
        <Toggle value={tags} onChange={setTags}
          label="Fix Missing Tags" description="Generate tags when none exist" />
      </div>

      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Warning-Level Fixes (opt-in)</p>
        <Toggle value={titleOptimization} onChange={setTitleOptimization}
          label="Optimize Titles" description="Improve OK titles to be more keyword-rich" />
        <Toggle value={tagEnrichment} onChange={setTagEnrichment}
          label="Enrich Tags" description="Add missing relevant tags to articles" />
        <Toggle value={headingStructure} onChange={setHeadingStructure}
          label="Add Heading Structure" description="Insert H2/H3 markers in flat content" />
      </div>

      <Button size="sm" onClick={() => onSave({ autoApply, fixes: { titleLength, metaDescription, tags, titleOptimization, tagEnrichment, headingStructure } })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function ContentQualitySettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const autoFix = (config?.autoFix as Record<string, boolean>) ?? {};
  const [publishThreshold, setPublishThreshold] = useState((config?.autoPublishThreshold as number) ?? 70);
  const [rejectThreshold, setRejectThreshold] = useState((config?.autoRejectThreshold as number) ?? 40);
  const [fixEnabled, setFixEnabled] = useState(autoFix.enabled !== false);
  const [fixGrammar, setFixGrammar] = useState(autoFix.grammar !== false);
  const [fixClickbait, setFixClickbait] = useState(autoFix.clickbait !== false);
  const [fixStructure, setFixStructure] = useState(autoFix.structure !== false);
  const [fixDuplicate, setFixDuplicate] = useState(autoFix.duplicate !== false);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Auto-Publish Threshold</label>
        <p className="text-xs text-gray-500 mb-2">Publish articles scoring above this</p>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} value={publishThreshold}
            onChange={(e) => setPublishThreshold(Number(e.target.value))} className="flex-1" />
          <span className="text-sm font-mono w-10 text-right">{publishThreshold}</span>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Auto-Reject Threshold</label>
        <p className="text-xs text-gray-500 mb-2">Unlist articles scoring below this</p>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} value={rejectThreshold}
            onChange={(e) => setRejectThreshold(Number(e.target.value))} className="flex-1" />
          <span className="text-sm font-mono w-10 text-right">{rejectThreshold}</span>
        </div>
      </div>

      <div className="border-t pt-3 space-y-3">
        <Toggle value={fixEnabled} onChange={(v) => { setFixEnabled(v); if (!v) return; }}
          label="Auto-Fix Issues" description="Automatically fix grammar, clickbait, structure, and duplicates before re-scoring" />
        {fixEnabled && (
          <div className="pl-2 space-y-3 border-l-2 border-indigo-100">
            <Toggle value={fixGrammar} onChange={setFixGrammar}
              label="Fix Grammar & Readability" description="AI rewrites content to fix grammar and typos" />
            <Toggle value={fixClickbait} onChange={setFixClickbait}
              label="Fix Clickbait Titles" description="Rewrite sensational titles to be factual" />
            <Toggle value={fixStructure} onChange={setFixStructure}
              label="Fix Structure" description="Add missing intro/conclusion paragraphs" />
            <Toggle value={fixDuplicate} onChange={setFixDuplicate}
              label="Remove Duplicates" description="Auto-remove repeated paragraphs" />
          </div>
        )}
      </div>

      <Button size="sm" onClick={() => onSave({
        autoPublishThreshold: publishThreshold,
        autoRejectThreshold: rejectThreshold,
        autoFix: { enabled: fixEnabled, grammar: fixGrammar, clickbait: fixClickbait, structure: fixStructure, duplicate: fixDuplicate },
      })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function MarketIntelSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const autoPost = (config?.autoPost as Record<string, unknown>) ?? {};
  const autoArticle = (config?.autoGenerateArticle as Record<string, unknown>) ?? {};
  const [postEnabled, setPostEnabled] = useState((autoPost.enabled as boolean) ?? false);
  const [maxPosts, setMaxPosts] = useState((autoPost.maxPostsPerRun as number) ?? 2);
  const [articleEnabled, setArticleEnabled] = useState((autoArticle.enabled as boolean) ?? false);
  const [maxArticles, setMaxArticles] = useState((autoArticle.maxArticlesPerRun as number) ?? 1);

  return (
    <div className="space-y-4">
      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Auto-Post Community Updates</p>
        <Toggle value={postEnabled} onChange={setPostEnabled}
          label="Auto-Post via Teknikal Robo" description="Automatically post market updates to the community" />
        {postEnabled && (
          <div className="pl-2">
            <label className="text-sm font-medium">Max Posts Per Run</label>
            <input type="number" min={1} max={5} value={maxPosts}
              onChange={(e) => setMaxPosts(Number(e.target.value))}
              className="ml-3 w-16 text-sm border rounded px-2 py-1" />
          </div>
        )}
      </div>

      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Auto-Generate Breaking News</p>
        <Toggle value={articleEnabled} onChange={setArticleEnabled}
          label="Auto-Generate Articles for Breaking Events" description="Create news articles for high-impact market events (>5% moves)" />
        {articleEnabled && (
          <div className="pl-2">
            <label className="text-sm font-medium">Max Articles Per Run</label>
            <input type="number" min={1} max={3} value={maxArticles}
              onChange={(e) => setMaxArticles(Number(e.target.value))}
              className="ml-3 w-16 text-sm border rounded px-2 py-1" />
          </div>
        )}
      </div>

      <Button size="sm" onClick={() => onSave({
        autoPost: { enabled: postEnabled, maxPostsPerRun: maxPosts },
        autoGenerateArticle: { enabled: articleEnabled, maxArticlesPerRun: maxArticles },
      })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function SiteHealthSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const remediate = (config?.autoRemediate as Record<string, unknown>) ?? {};
  const [enabled, setEnabled] = useState((remediate.enabled as boolean) ?? false);
  const [staleStockData, setStaleStockData] = useState(remediate.staleStockData !== false);
  const [noArticles, setNoArticles] = useState(remediate.noArticles !== false);
  const [noCommunityPosts, setNoCommunityPosts] = useState(remediate.noCommunityPosts !== false);
  const [tableBloat, setTableBloat] = useState(remediate.tableBloat !== false);
  const [retentionDays, setRetentionDays] = useState((remediate.cleanupRetentionDays as number) ?? 7);

  return (
    <div className="space-y-4">
      <Toggle value={enabled} onChange={setEnabled}
        label="Auto-Remediate Issues" description="Automatically trigger fixes when health checks fail" />

      {enabled && (
        <div className="pl-2 space-y-3 border-l-2 border-indigo-100">
          <Toggle value={staleStockData} onChange={setStaleStockData}
            label="Fix Stale Stock Data" description="Trigger sync-eod when price data is stale" />
          <Toggle value={noArticles} onChange={setNoArticles}
            label="Fix Missing Articles" description="Trigger generate-articles when no recent articles" />
          <Toggle value={noCommunityPosts} onChange={setNoCommunityPosts}
            label="Fix Missing Community Posts" description="Trigger community-agent when no recent posts" />
          <Toggle value={tableBloat} onChange={setTableBloat}
            label="Cleanup Old Job Records" description="Remove completed AgentJob records older than retention period" />
          {tableBloat && (
            <div>
              <label className="text-sm font-medium">Retention Days</label>
              <input type="number" min={1} max={90} value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="ml-3 w-20 text-sm border rounded px-2 py-1" />
            </div>
          )}
        </div>
      )}

      <Button size="sm" onClick={() => onSave({
        autoRemediate: { enabled, staleStockData, noArticles, noCommunityPosts, tableBloat, cleanupRetentionDays: retentionDays },
      })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function StockAlertSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const [notifyWatchlist, setNotifyWatchlist] = useState((config?.notifyWatchlist as boolean) ?? true);
  const [notifyStockFollows, setNotifyStockFollows] = useState((config?.notifyStockFollows as boolean) ?? true);
  const [maxAlerts, setMaxAlerts] = useState((config?.maxAlertsPerRun as number) ?? 50);

  return (
    <div className="space-y-4">
      <Toggle value={notifyWatchlist} onChange={setNotifyWatchlist}
        label="Notify Watchlist Users" description="Send alerts to users who have the stock in their watchlist" />
      <Toggle value={notifyStockFollows} onChange={setNotifyStockFollows}
        label="Notify Stock Follow Users" description="Send alerts to users who follow the stock" />

      <div>
        <label className="text-sm font-medium">Max Alerts Per Run</label>
        <p className="text-xs text-gray-500 mb-2">Limit the number of alerts generated per execution</p>
        <input type="number" min={10} max={200} value={maxAlerts}
          onChange={(e) => setMaxAlerts(Number(e.target.value))}
          className="w-24 text-sm border rounded px-2 py-1" />
      </div>

      <Button size="sm" onClick={() => onSave({ notifyWatchlist, notifyStockFollows, maxAlertsPerRun: maxAlerts })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function AnomalyDetectionSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const [notifyAlerts, setNotifyAlerts] = useState((config?.notifyAlerts as boolean) ?? true);
  const [maxAlerts, setMaxAlerts] = useState((config?.maxAlertsPerRun as number) ?? 30);
  const [priceThreshold, setPriceThreshold] = useState((config?.priceChangeThreshold as number) ?? 5);
  const [volumeMultiplier, setVolumeMultiplier] = useState((config?.volumeSpikeMultiplier as number) ?? 3);

  return (
    <div className="space-y-4">
      <Toggle value={notifyAlerts} onChange={setNotifyAlerts}
        label="Notify Critical Anomalies" description="Send alerts for confluence anomalies (3+ signals)" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Max Alerts Per Run</label>
          <input type="number" min={10} max={100} value={maxAlerts}
            onChange={(e) => setMaxAlerts(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Price Change %</label>
          <input type="number" min={1} max={20} value={priceThreshold}
            onChange={(e) => setPriceThreshold(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Volume Spike Multiplier</label>
          <input type="number" min={2} max={10} value={volumeMultiplier}
            onChange={(e) => setVolumeMultiplier(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1" />
        </div>
      </div>

      <Button size="sm" onClick={() => onSave({ notifyAlerts, maxAlertsPerRun: maxAlerts, priceChangeThreshold: priceThreshold, volumeSpikeMultiplier: volumeMultiplier })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function CommunitySentimentSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const [minPosts, setMinPosts] = useState((config?.minPostsForAnalysis as number) ?? 3);
  const [maxTickers, setMaxTickers] = useState((config?.maxTickersPerRun as number) ?? 20);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Min Posts for Analysis</label>
          <p className="text-xs text-gray-500">Skip tickers with fewer posts</p>
          <input type="number" min={1} max={10} value={minPosts}
            onChange={(e) => setMinPosts(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1 mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Max Tickers Per Run</label>
          <p className="text-xs text-gray-500">Limit AI calls per execution</p>
          <input type="number" min={5} max={50} value={maxTickers}
            onChange={(e) => setMaxTickers(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1 mt-1" />
        </div>
      </div>

      <Button size="sm" onClick={() => onSave({ minPostsForAnalysis: minPosts, maxTickersPerRun: maxTickers })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
    </div>
  );
}

function UserEngagementSettings({
  config,
  onSave,
  isSaving,
  isSaved,
}: {
  config: Record<string, unknown> | null;
  onSave: (cfg: Record<string, unknown>) => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const [enableReEngagement, setEnableReEngagement] = useState((config?.enableReEngagement as boolean) ?? true);
  const [enableCommunityDigest, setEnableCommunityDigest] = useState((config?.enableCommunityDigest as boolean) ?? true);
  const [reEngageDays, setReEngageDays] = useState((config?.reEngageAfterDays as number) ?? 7);
  const [maxNotifs, setMaxNotifs] = useState((config?.maxNotificationsPerRun as number) ?? 100);
  const [priceThreshold, setPriceThreshold] = useState((config?.priceChangeThreshold as number) ?? 3);

  return (
    <div className="space-y-4">
      <Toggle value={enableReEngagement} onChange={setEnableReEngagement}
        label="Re-engage Inactive Users" description="Notify inactive users about watchlist stock movements" />
      <Toggle value={enableCommunityDigest} onChange={setEnableCommunityDigest}
        label="Community Sentiment Digest" description="Send sentiment alerts for strongly discussed stocks" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Re-engage After (days)</label>
          <input type="number" min={3} max={30} value={reEngageDays}
            onChange={(e) => setReEngageDays(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Max Notifications Per Run</label>
          <input type="number" min={10} max={500} value={maxNotifs}
            onChange={(e) => setMaxNotifs(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Price Change %</label>
          <input type="number" min={1} max={10} value={priceThreshold}
            onChange={(e) => setPriceThreshold(Number(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1" />
        </div>
      </div>

      <Button size="sm" onClick={() => onSave({ enableReEngagement, enableCommunityDigest, reEngageAfterDays: reEngageDays, maxNotificationsPerRun: maxNotifs, priceChangeThreshold: priceThreshold })} disabled={isSaving}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        Save
      </Button>
      {isSaved && <p className="text-xs text-green-600">Settings saved.</p>}
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
