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
    schedule: "On-demand via manual trigger (pipeline intraday dorman; 1 run/30d)",
    method: "GET",
    route: "/api/cron/sync-intraday",
  },
  {
    jobName: "sync-eod",
    displayName: "EOD Data Sync",
    description: "Fetches closing prices and recalculates technical indicators",
    schedule: "Daily 16:30 WIB (launchd com.teknikalid.eod-sync)",
    method: "GET",
    route: "/api/cron/sync-eod",
  },
  {
    jobName: "generate-articles",
    displayName: "Article Generation",
    description: "AI-powered article generation: daily snapshots, trending news, evergreen analysis",
    schedule: "Daily ~17:00 WIB (launchd com.teknikalid.generate-articles)",
    method: "POST",
    route: "/api/cron/generate-articles",
  },
  {
    jobName: "community-agent",
    displayName: "Community AI Agent",
    description: "AI agent that posts market commentary and engages with community",
    schedule: "Weekdays 08:00-21:00 WIB tiap 30-60 min",
    method: "POST",
    route: "/api/cron/community-agent",
  },
  {
    jobName: "resolve-predictions",
    displayName: "Prediction Resolution",
    description: "Resolves expired stock predictions by comparing targets to actual prices",
    schedule: "Manual trigger (LaunchAgent com.teknikalid.resolve-predictions)",
    method: "GET",
    route: "/api/cron/resolve-predictions",
  },
  {
    jobName: "agent-hub-scheduler",
    displayName: "Agent Hub Scheduler",
    description: "Evaluates AgentConfig schedules and dispatches AgentJobs",
    schedule: "Every 30 min",
    method: "POST",
    route: "/api/cron/agent-hub-scheduler",
  },
  {
    jobName: "sync-stocks",
    displayName: "IDX Stock List Sync",
    description: "Syncs the stock master list from IDX API",
    schedule: "Weekly Senin 06:00 WIB (launchd com.teknikalid.idx-sync)",
    method: "POST",
    route: "/api/cron/sync-stocks",
  },
  {
    jobName: "cleanup-snapshots",
    displayName: "Snapshot Cleanup",
    description: "Deletes old price snapshots; job mati sejak 11 Jun — legacy log entries only",
    schedule: "Dormant (last run 11 Jun 2026)",
    method: "POST",
    route: "/api/cron/cleanup-snapshots",
  },
];
