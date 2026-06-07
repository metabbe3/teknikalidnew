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

const agents: Record<AgentType, BaseAgent> = {
  site_health: new SiteHealthAgent(),
  seo_optimizer: new SeoOptimizerAgent(),
  content_quality: new ContentQualityAgent(),
  market_intel: new MarketIntelAgent(),
  stock_alert: new StockAlertAgent(),
  anomaly_detection: new AnomalyDetectionAgent(),
  community_sentiment: new CommunitySentimentAgent(),
  user_engagement: new UserEngagementAgent(),
};

export function getAgent(type: AgentType): BaseAgent {
  return agents[type];
}

export function getAllAgents(): Record<AgentType, BaseAgent> {
  return agents;
}
