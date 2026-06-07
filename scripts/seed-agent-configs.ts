/**
 * Seed default AgentConfig rows for all registered agents.
 *
 * Run: npx tsx scripts/seed-agent-configs.ts
 */

import { prisma } from "../src/lib/prisma";

const DEFAULT_CONFIGS = [
  {
    agentType: "seo_optimizer",
    isEnabled: true,
    scheduleCron: "0 8 * * 1-5", // weekdays 08:00 WIB
    scheduleMeta: { preset: "daily_weekdays_08", label: "Daily 08:00 WIB (weekdays)" },
    config: {
      autoApply: true,
      fixes: {
        titleLength: true,
        metaDescription: true,
        tags: true,
        titleOptimization: false,
        tagEnrichment: false,
        headingStructure: false,
      },
    },
  },
  {
    agentType: "content_quality",
    isEnabled: true,
    scheduleCron: null, // triggered by article generation, not cron
    scheduleMeta: { preset: "chained", label: "After article generation" },
    config: {
      autoPublishThreshold: 70,
      autoRejectThreshold: 40,
      autoFix: {
        enabled: true,
        grammar: true,
        clickbait: true,
        structure: true,
        duplicate: true,
      },
    },
  },
  {
    agentType: "market_intel",
    isEnabled: true,
    scheduleCron: "*/30 9-14 * * 1-5", // every 30 min during market hours
    scheduleMeta: { preset: "market_hours_30", label: "Every 30 min during market hours" },
    config: {
      autoPost: { enabled: false, maxPostsPerRun: 2 },
      autoGenerateArticle: { enabled: false, maxArticlesPerRun: 1 },
    },
  },
  {
    agentType: "site_health",
    isEnabled: true,
    scheduleCron: "0 1,7,13,19 * * *", // every 6 hours
    scheduleMeta: { preset: "every_6h", label: "Every 6 hours" },
    config: {
      autoRemediate: {
        enabled: false,
        staleStockData: true,
        noArticles: true,
        noCommunityPosts: true,
        tableBloat: true,
        cleanupRetentionDays: 7,
      },
    },
  },
  {
    agentType: "stock_alert",
    isEnabled: true,
    scheduleCron: "*/30 9-14 * * 1-5",
    scheduleMeta: { preset: "market_hours_30", label: "Every 30 min during market hours" },
    config: {
      notifyWatchlist: true,
      notifyStockFollows: true,
      maxAlertsPerRun: 50,
    },
  },
  {
    agentType: "anomaly_detection",
    isEnabled: true,
    scheduleCron: "*/30 9-14 * * 1-5",
    scheduleMeta: { preset: "market_hours_30", label: "Every 30 min during market hours" },
    config: {
      notifyAlerts: true,
      maxAlertsPerRun: 30,
      priceChangeThreshold: 5,
      volumeSpikeMultiplier: 3,
    },
  },
  {
    agentType: "community_sentiment",
    isEnabled: true,
    scheduleCron: "0 1,7,13,19 * * *",
    scheduleMeta: { preset: "every_6h", label: "Every 6 hours" },
    config: {
      minPostsForAnalysis: 3,
      maxTickersPerRun: 20,
    },
  },
  {
    agentType: "user_engagement",
    isEnabled: true,
    scheduleCron: "0 1 * * 1-5",
    scheduleMeta: { preset: "daily_weekdays_08", label: "Daily 08:00 WIB (weekdays)" },
    config: {
      reEngageAfterDays: 7,
      maxNotificationsPerRun: 100,
      priceChangeThreshold: 3,
      enableReEngagement: true,
      enableCommunityDigest: true,
    },
  },
];

async function main() {
  console.log("Seeding AgentConfig rows...");

  for (const cfg of DEFAULT_CONFIGS) {
    const result = await prisma.agentConfig.upsert({
      where: { agentType: cfg.agentType },
      update: {
        scheduleCron: cfg.scheduleCron,
        scheduleMeta: cfg.scheduleMeta as any,
        config: cfg.config as any,
      },
      create: {
        agentType: cfg.agentType,
        isEnabled: cfg.isEnabled,
        scheduleCron: cfg.scheduleCron,
        scheduleMeta: cfg.scheduleMeta as any,
        config: cfg.config as any,
      },
    });
    console.log(`  ✓ ${cfg.agentType}: ${result.id}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
