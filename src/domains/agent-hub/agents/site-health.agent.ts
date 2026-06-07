import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import type { AutoFixRecord } from "../auto-fix.types";
import { prisma } from "@/lib/prisma";
import { agentHubRepository } from "../agent-hub.repository";

interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  durationMs: number;
}

export class SiteHealthAgent extends BaseAgent {
  readonly type: AgentType = "site_health";
  readonly label = "Site Health Monitor";

  async execute(_payload: AgentJobPayload): Promise<AgentJobResult> {
    const checks: HealthCheck[] = [];

    // 1. Database connectivity
    checks.push(await this.checkDatabase());

    // 2. Stock data freshness
    checks.push(await this.checkStockDataFreshness());

    // 3. Article generation schedule
    checks.push(await this.checkArticleSchedule());

    // 4. Community agent schedule
    checks.push(await this.checkCommunityAgentSchedule());

    // 5. Page response times
    checks.push(await this.checkPageResponse());

    // 6. Disk / table bloat check
    checks.push(await this.checkTableSizes());

    // 7. Auto-remediate failed/warned checks
    const config = await this.getAgentConfig();
    const remediationConfig = config?.autoRemediate as Record<string, unknown> | undefined;
    const remediations: AutoFixRecord[] = [];

    if (remediationConfig?.enabled === true) {
      for (const check of checks) {
        if (check.status === "fail" || check.status === "warn") {
          const fix = await this.remediate(check, remediationConfig);
          if (fix) remediations.push(fix);
        }
      }
    }

    // 8. AI-powered sitemap analysis (optional, only if basic checks pass)
    let aiAnalysis = null;
    const basicFails = checks.filter((c) => c.status === "fail").length;
    if (basicFails === 0) {
      aiAnalysis = await this.runAIAnalysis(checks);
    }

    const passed = checks.filter((c) => c.status === "pass").length;
    const warned = checks.filter((c) => c.status === "warn").length;
    const failed = checks.filter((c) => c.status === "fail").length;

    return {
      summary: `${passed} passed, ${warned} warnings, ${failed} failed. ${remediations.filter((r) => r.applied).length} auto-remediated.`,
      passed,
      warned,
      failed,
      checks,
      aiAnalysis,
      remediations,
      checkedAt: new Date().toISOString(),
    };
  }

  // ── Auto-remediation ────────────────────────────────────────────────

  private async remediate(
    check: HealthCheck,
    config: Record<string, unknown>,
  ): Promise<AutoFixRecord | null> {
    const baseUrl = process.env.SITE_URL || "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET;

    // Stale stock data → trigger sync-eod
    if (check.name === "Stock Data Freshness" && config.staleStockData !== false) {
      try {
        const response = await fetch(`${baseUrl}/api/cron/sync-eod`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: AbortSignal.timeout(30_000),
        });
        return {
          type: "trigger_sync_eod",
          field: "cron",
          before: check.message,
          after: `Triggered sync-eod: HTTP ${response.status}`,
          applied: response.ok,
          reason: response.ok ? undefined : `HTTP ${response.status}`,
        };
      } catch (err) {
        return {
          type: "trigger_sync_eod",
          field: "cron",
          before: check.message,
          after: "",
          applied: false,
          reason: err instanceof Error ? err.message : "Failed",
        };
      }
    }

    // No articles → trigger generate-articles
    if (check.name === "Article Generation" && config.noArticles !== false) {
      try {
        const response = await fetch(`${baseUrl}/api/cron/generate-articles?count=3`, {
          method: "POST",
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: AbortSignal.timeout(60_000),
        });
        return {
          type: "trigger_generate_articles",
          field: "cron",
          before: check.message,
          after: `Triggered generate-articles: HTTP ${response.status}`,
          applied: response.ok,
        };
      } catch (err) {
        return {
          type: "trigger_generate_articles",
          field: "cron",
          before: check.message,
          after: "",
          applied: false,
          reason: err instanceof Error ? err.message : "Failed",
        };
      }
    }

    // No community posts → trigger community-agent
    if (check.name === "Community Agent (Robo)" && config.noCommunityPosts !== false) {
      try {
        const response = await fetch(`${baseUrl}/api/cron/community-agent`, {
          method: "POST",
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: AbortSignal.timeout(30_000),
        });
        return {
          type: "trigger_community_agent",
          field: "cron",
          before: check.message,
          after: `Triggered community-agent: HTTP ${response.status}`,
          applied: response.ok,
        };
      } catch (err) {
        return {
          type: "trigger_community_agent",
          field: "cron",
          before: check.message,
          after: "",
          applied: false,
          reason: err instanceof Error ? err.message : "Failed",
        };
      }
    }

    // Table bloat → cleanup old AgentJob records
    if (check.name === "Table Sizes" && config.tableBloat !== false) {
      const retentionDays = (config.cleanupRetentionDays as number) ?? 7;
      try {
        const deleted = await agentHubRepository.cleanupOldJobs(retentionDays);
        return {
          type: "cleanup_agent_jobs",
          field: "AgentJob",
          before: check.message,
          after: `Cleaned up ${deleted} old job records (older than ${retentionDays} days)`,
          applied: true,
        };
      } catch (err) {
        return {
          type: "cleanup_agent_jobs",
          field: "AgentJob",
          before: check.message,
          after: "",
          applied: false,
          reason: err instanceof Error ? err.message : "Failed",
        };
      }
    }

    return null;
  }

  // ── Health checks (unchanged) ───────────────────────────────────────

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        name: "Database Connectivity",
        status: "pass",
        message: "PostgreSQL is responsive",
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: "Database Connectivity",
        status: "fail",
        message: `Database error: ${error instanceof Error ? error.message : "unknown"}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkStockDataFreshness(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const latest = await prisma.stockPrice.findFirst({
        orderBy: { date: "desc" },
        select: { date: true, stock: { select: { ticker: true } } },
      });

      if (!latest) {
        return {
          name: "Stock Data Freshness",
          status: "warn",
          message: "No stock price data found",
          durationMs: Date.now() - start,
        };
      }

      const hoursSince = (Date.now() - latest.date.getTime()) / (1000 * 60 * 60);
      const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
      const isMarketHours = new Date().getHours() >= 9 && new Date().getHours() <= 16;

      let status: "pass" | "warn" | "fail" = "pass";
      if (isWeekday && isMarketHours && hoursSince > 2) {
        status = "warn";
      } else if (hoursSince > 48) {
        status = "fail";
      }

      return {
        name: "Stock Data Freshness",
        status,
        message: `Latest price data: ${latest.date.toISOString()} for ${latest.stock.ticker} (${Math.round(hoursSince)}h ago)`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: "Stock Data Freshness",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "unknown"}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkArticleSchedule(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const latestArticle = await prisma.article.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, title: true },
      });

      if (!latestArticle) {
        return {
          name: "Article Generation",
          status: "warn",
          message: "No articles found",
          durationMs: Date.now() - start,
        };
      }

      const hoursSince = (Date.now() - latestArticle.createdAt.getTime()) / (1000 * 60 * 60);
      const status: "pass" | "warn" | "fail" = hoursSince > 48 ? "fail" : hoursSince > 24 ? "warn" : "pass";

      return {
        name: "Article Generation",
        status,
        message: `Latest article: "${latestArticle.title?.slice(0, 50)}" (${Math.round(hoursSince)}h ago)`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: "Article Generation",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "unknown"}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkCommunityAgentSchedule(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const latestPost = await prisma.post.findFirst({
        where: { author: { username: "teknikal_robo" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (!latestPost) {
        return {
          name: "Community Agent (Robo)",
          status: "warn",
          message: "No Teknikal Robo posts found",
          durationMs: Date.now() - start,
        };
      }

      const hoursSince = (Date.now() - latestPost.createdAt.getTime()) / (1000 * 60 * 60);
      const status: "pass" | "warn" | "fail" = hoursSince > 72 ? "fail" : hoursSince > 24 ? "warn" : "pass";

      return {
        name: "Community Agent (Robo)",
        status,
        message: `Latest Robo post: ${Math.round(hoursSince)}h ago`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: "Community Agent (Robo)",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : "unknown"}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkPageResponse(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const baseUrl = process.env.SITE_URL || "http://localhost:3000";
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      const duration = Date.now() - start;

      const status: "pass" | "warn" | "fail" =
        response.ok && duration < 3000 ? "pass" :
        response.ok && duration < 8000 ? "warn" : "fail";

      return {
        name: "Homepage Response",
        status,
        message: `${response.status} in ${duration}ms`,
        durationMs: duration,
      };
    } catch (error) {
      return {
        name: "Homepage Response",
        status: "fail",
        message: `Fetch error: ${error instanceof Error ? error.message : "unknown"}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkTableSizes(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const [stockPrices, indicators, articles, posts] = await Promise.all([
        prisma.stockPrice.count(),
        prisma.stockIndicator.count(),
        prisma.article.count(),
        prisma.post.count(),
      ]);

      const sizes: Record<string, number> = { StockPrice: stockPrices, StockIndicator: indicators, Article: articles, Post: posts };

      const totalRecords = Object.values(sizes).reduce((a, b) => a + b, 0);
      const status: "pass" | "warn" | "fail" = totalRecords > 10_000_000 ? "warn" : "pass";

      return {
        name: "Table Sizes",
        status,
        message: Object.entries(sizes).map(([t, c]) => `${t}: ${c.toLocaleString()}`).join(", "),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: "Table Sizes",
        status: "warn",
        message: `Error: ${error instanceof Error ? error.message : "unknown"}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async runAIAnalysis(checks: HealthCheck[]): Promise<string | null> {
    try {
      const checksSummary = checks.map((c) => `- ${c.name}: ${c.status} (${c.message})`).join("\n");

      const system = `Kamu adalah DevOps engineer untuk TeknikalID — platform analisa teknikal saham Indonesia.
Berikan analisis singkat (maks 200 kata) dalam bahasa Indonesia tentang health check results.
Fokus pada: apakah ada masalah yang perlu ditangani, saran improvement, dan rekomendasi.`;

      const user = `Berikut hasil health check hari ini:

${checksSummary}

Berikan analisis singkat dan rekomendasi.`;

      return await this.callAI(system, user, 1000);
    } catch {
      return null;
    }
  }
}
