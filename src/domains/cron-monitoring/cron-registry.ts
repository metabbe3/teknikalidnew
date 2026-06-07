export interface CronJobDefinition {
  jobName: string;
  displayName: string;
  description: string;
  schedule: string;
  method: "GET" | "POST";
  route: string;
}

export const CRON_JOB_REGISTRY: CronJobDefinition[] = [
  {
    jobName: "sync-intraday",
    displayName: "Intraday Price Sync",
    description: "Fetches real-time prices for all active IDX stocks via Yahoo Finance",
    schedule: "Every 5 minutes",
    method: "GET",
    route: "/api/cron/sync-intraday",
  },
  {
    jobName: "sync-eod",
    displayName: "EOD Data Sync",
    description: "Fetches closing prices and recalculates technical indicators",
    schedule: "Weekdays 17:00 WIB",
    method: "GET",
    route: "/api/cron/sync-eod",
  },
  {
    jobName: "generate-articles",
    displayName: "Article Generation",
    description: "AI-powered article generation: daily snapshots, trending news, evergreen analysis",
    schedule: "3x daily (7:30, 12:30, 15:30 WIB)",
    method: "POST",
    route: "/api/cron/generate-articles",
  },
  {
    jobName: "community-agent",
    displayName: "Community AI Agent",
    description: "AI agent that posts market commentary and engages with community",
    schedule: "Every 30-60 min weekdays (08:00-21:00 WIB)",
    method: "POST",
    route: "/api/cron/community-agent",
  },
  {
    jobName: "resolve-predictions",
    displayName: "Prediction Resolution",
    description: "Resolves expired stock predictions by comparing targets to actual prices",
    schedule: "Manual trigger",
    method: "GET",
    route: "/api/cron/resolve-predictions",
  },
  {
    jobName: "agent-hub-scheduler",
    displayName: "Agent Hub Scheduler",
    description: "Evaluates AgentConfig schedules and dispatches AgentJobs",
    schedule: "Every hour",
    method: "POST",
    route: "/api/cron/agent-hub-scheduler",
  },
  {
    jobName: "sync-stocks",
    displayName: "IDX Stock List Sync",
    description: "Syncs the stock master list from IDX API",
    schedule: "Monthly",
    method: "POST",
    route: "/api/cron/sync-stocks",
  },
];
