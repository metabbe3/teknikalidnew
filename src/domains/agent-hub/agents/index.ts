import type { AgentType } from "../agent-hub.types";
import type { BaseAgent } from "./base-agent";
import { SiteHealthAgent } from "./site-health.agent";
import { SeoOptimizerAgent } from "./seo-optimizer.agent";
import { ContentQualityAgent } from "./content-quality.agent";
import { MarketIntelAgent } from "./market-intel.agent";
import { StockAlertAgent } from "./stock-alert.agent";
import { AnomalyDetectionAgent } from "./anomaly-detection.agent";
import { CommunitySentimentAgent } from "./community-sentiment.agent";
import { UserEngagementAgent } from "./user-engagement.agent";
import { TechnicalScreenerAgent } from "./technical-screener.agent";
import { GenSnapshotsAgent } from "./gen-snapshots.agent";
import { GenSourcedNewsAgent } from "./gen-sourced-news.agent";
import { GenTrendingNewsAgent } from "./gen-trending-news.agent";
import { GenEvergreenAgent } from "./gen-evergreen.agent";
import { GenFaqAgent } from "./gen-faq.agent";
import { GrowthOrchestratorAgent } from "./growth-orchestrator.agent";
import { SeoAuditorAgent } from "./seo-auditor.agent";
import { ContentExpanderAgent } from "./content-expander.agent";
import { InternalLinkerAgent } from "./internal-linker.agent";
import { SchemaBuilderAgent } from "./schema-builder.agent";
import { GrowthMonitorAgent } from "./growth-monitor.agent";

const agents: Record<AgentType, BaseAgent> = {
  site_health: new SiteHealthAgent(),
  seo_optimizer: new SeoOptimizerAgent(),
  content_quality: new ContentQualityAgent(),
  market_intel: new MarketIntelAgent(),
  stock_alert: new StockAlertAgent(),
  anomaly_detection: new AnomalyDetectionAgent(),
  community_sentiment: new CommunitySentimentAgent(),
  user_engagement: new UserEngagementAgent(),
  technical_screener: new TechnicalScreenerAgent(),
  gen_snapshots: new GenSnapshotsAgent(),
  gen_sourced_news: new GenSourcedNewsAgent(),
  gen_trending_news: new GenTrendingNewsAgent(),
  gen_evergreen: new GenEvergreenAgent(),
  gen_faq: new GenFaqAgent(),
  growth_orchestrator: new GrowthOrchestratorAgent(),
  seo_auditor: new SeoAuditorAgent(),
  content_expander: new ContentExpanderAgent(),
  internal_linker: new InternalLinkerAgent(),
  schema_builder: new SchemaBuilderAgent(),
  growth_monitor: new GrowthMonitorAgent(),
};

export function getAgent(type: AgentType): BaseAgent {
  return agents[type];
}

export function getAllAgents(): Record<AgentType, BaseAgent> {
  return agents;
}
