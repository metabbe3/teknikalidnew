export const AGENT_TYPES = [
  "seo_optimizer",
  "content_quality",
  "market_intel",
  "site_health",
  "stock_alert",
  "anomaly_detection",
  "community_sentiment",
  "user_engagement",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const JOB_STATUSES = ["pending", "running", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface AgentJobPayload {
  [key: string]: unknown;
}

export interface AgentJobResult {
  [key: string]: unknown;
}

export interface AgentJobRow {
  id: string;
  agentType: AgentType;
  status: JobStatus;
  priority: number;
  payload: AgentJobPayload;
  result: AgentJobResult | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMeta {
  type: AgentType;
  label: string;
  description: string;
  icon: string;
  defaultSchedule: string;
  estimatedAiCalls: number;
}

export const AGENT_META: Record<AgentType, AgentMeta> = {
  seo_optimizer: {
    type: "seo_optimizer",
    label: "SEO Optimizer",
    description: "Analyzes articles for SEO improvements — meta tags, keywords, heading structure, internal links.",
    icon: "Search",
    defaultSchedule: "Daily at 08:00 WIB",
    estimatedAiCalls: 2,
  },
  content_quality: {
    type: "content_quality",
    label: "Content Quality",
    description: "Reviews articles for factual accuracy, readability, grammar, and clickbait detection.",
    icon: "FileCheck",
    defaultSchedule: "After article generation",
    estimatedAiCalls: 1,
  },
  market_intel: {
    type: "market_intel",
    label: "Market Intelligence",
    description: "Monitors RSS news, stock movements, and market sentiment for breaking events.",
    icon: "TrendingUp",
    defaultSchedule: "Every 30 min during market hours",
    estimatedAiCalls: 2,
  },
  site_health: {
    type: "site_health",
    label: "Site Health",
    description: "Checks database connectivity, page response times, cron schedules, and sitemap coverage.",
    icon: "Activity",
    defaultSchedule: "Every 6 hours",
    estimatedAiCalls: 0,
  },
  stock_alert: {
    type: "stock_alert",
    label: "Stock Alert",
    description: "Detects technical signal breakouts (RSI, MACD, SMA cross, Bollinger, Supertrend) and notifies users who follow or watchlist the stock.",
    icon: "Bell",
    defaultSchedule: "Every 30 min during market hours",
    estimatedAiCalls: 0,
  },
  anomaly_detection: {
    type: "anomaly_detection",
    label: "Anomaly Detection",
    description: "Detects unusual market patterns — price surges, volume spikes, RSI divergence, gorengan alerts.",
    icon: "AlertTriangle",
    defaultSchedule: "Every 30 min during market hours",
    estimatedAiCalls: 0,
  },
  community_sentiment: {
    type: "community_sentiment",
    label: "Community Sentiment",
    description: "Analyzes community posts per ticker using AI to generate bullish/bearish/neutral sentiment scores.",
    icon: "MessageSquare",
    defaultSchedule: "Every 6 hours",
    estimatedAiCalls: 1,
  },
  user_engagement: {
    type: "user_engagement",
    label: "User Engagement",
    description: "Sends personalized notifications from watchlist/stock follow data, re-engages inactive users.",
    icon: "Users",
    defaultSchedule: "Daily 08:00 WIB",
    estimatedAiCalls: 0,
  },
};

export interface AgentConfigRow {
  id: string;
  agentType: AgentType;
  isEnabled: boolean;
  systemPrompt: string | null;
  scheduleCron: string | null;
  scheduleMeta: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface SchedulePreset {
  value: string;
  label: string;
  cron: string | null;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { value: "every_30m", label: "Every 30 minutes", cron: "*/30 * * * *" },
  { value: "hourly", label: "Hourly", cron: "0 * * * *" },
  { value: "every_6h", label: "Every 6 hours", cron: "0 1,7,13,19 * * *" },
  { value: "daily_08", label: "Daily 08:00 WIB", cron: "0 1 * * *" },
  { value: "daily_weekdays_08", label: "Daily 08:00 WIB (weekdays)", cron: "0 8 * * 1-5" },
  { value: "market_hours_30", label: "Every 30 min (market hours)", cron: "*/30 9-14 * * 1-5" },
  { value: "chained", label: "After article generation (chained)", cron: null },
  { value: "disabled", label: "Disabled", cron: null },
];

export interface AgentHubStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  agents: {
    type: AgentType;
    label: string;
    lastRun: Date | null;
    lastStatus: JobStatus | null;
    successRate: number;
    totalRuns: number;
  }[];
  recentJobs: AgentJobRow[];
  configs?: AgentConfigRow[];
}
