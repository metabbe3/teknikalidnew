import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import type { ChainedJobSpec } from "./base-agent";
import type { AutoFixRecord } from "../auto-fix.types";
import { prisma } from "@/lib/prisma";
import { communityAgentService } from "@/domains/community-agent/community-agent.service";
import { communityService } from "@/domains/community/community.service";
import { articleService } from "@/domains/article/article.service";

interface Mover {
  ticker: string;
  name: string;
  changePercent: number;
  close: number;
}

export class MarketIntelAgent extends BaseAgent {
  readonly type: AgentType = "market_intel";
  readonly label = "Market Intelligence";

  async execute(_payload: AgentJobPayload): Promise<AgentJobResult> {
    const movers = await this.getTopMovers();
    const recentArticles = await this.getRecentArticles();
    const analysis = await this.analyzeMarket(movers, recentArticles);
    const config = await this.getAgentConfig();

    const actions: AutoFixRecord[] = [];

    // Auto-post community posts (opt-in)
    const autoPostConfig = config?.autoPost as Record<string, unknown> | undefined;
    if (autoPostConfig?.enabled === true) {
      const suggestedPosts = Array.isArray(analysis.suggestedPosts)
        ? (analysis.suggestedPosts as unknown[]).filter((p): p is string => typeof p === "string")
        : [];
      const postResults = await this.autoPostSuggestions(
        suggestedPosts,
        autoPostConfig,
      );
      actions.push(...postResults);
    }

    // Auto-generate articles for breaking events (opt-in)
    const autoArticleConfig = config?.autoGenerateArticle as Record<string, unknown> | undefined;
    const generatedArticleIds: string[] = [];
    if (autoArticleConfig?.enabled === true) {
      const breakingEvents = Array.isArray(analysis.breakingEvents)
        ? (analysis.breakingEvents as Array<Record<string, unknown>>).map((e) => ({
            ticker: String(e.ticker ?? ""),
            event: String(e.event ?? ""),
            impact: String(e.impact ?? "low"),
            suggestedAction: String(e.suggestedAction ?? ""),
          }))
        : [];
      const articleResults = await this.autoGenerateBreakingArticles(
        breakingEvents,
        movers,
        autoArticleConfig,
      );
      actions.push(...articleResults.fixes);
      generatedArticleIds.push(...articleResults.articleIds);
    }

    return {
      summary: analysis.summary ?? "Market intelligence scan completed",
      topGainers: movers.gainers,
      topLosers: movers.losers,
      sentimentScores: analysis.sentimentScores ?? {},
      breakingEvents: analysis.breakingEvents ?? [],
      suggestedPosts: analysis.suggestedPosts ?? [],
      actions,
      generatedArticleIds,
      scannedAt: new Date().toISOString(),
    };
  }

  /** Chain content_quality jobs for auto-generated articles */
  async onComplete(result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    const chains: ChainedJobSpec[] = [];
    const articleIds = (result.generatedArticleIds as string[]) ?? [];

    for (const articleId of articleIds) {
      chains.push({
        agentType: "content_quality",
        payload: { articleId },
        priority: 4,
      });
    }
    return chains;
  }

  // ── Auto-action methods ──────────────────────────────────────────────

  private async autoPostSuggestions(
    posts: string[],
    config: Record<string, unknown>,
  ): Promise<AutoFixRecord[]> {
    const results: AutoFixRecord[] = [];
    const maxPosts = (config.maxPostsPerRun as number) ?? 2;
    const toPost = posts.slice(0, maxPosts);

    if (toPost.length === 0) return results;

    try {
      const botUser = await communityAgentService.ensureBotUser();

      for (const content of toPost) {
        // Truncate to 1000 chars (community post limit)
        const trimmedContent = content.slice(0, 1000);
        try {
          await communityService.createPost(botUser.id, { content: trimmedContent });
          results.push({
            type: "auto_post",
            field: "community_post",
            before: "",
            after: trimmedContent.slice(0, 300),
            applied: true,
          });
        } catch (err) {
          results.push({
            type: "auto_post",
            field: "community_post",
            before: "",
            after: trimmedContent.slice(0, 300),
            applied: false,
            reason: err instanceof Error ? err.message : "Failed to create post",
          });
        }
      }
    } catch (err) {
      results.push({
        type: "auto_post",
        field: "community_post",
        before: "",
        after: "",
        applied: false,
        reason: `Bot user error: ${err instanceof Error ? err.message : "Failed"}`,
      });
    }

    return results;
  }

  private async autoGenerateBreakingArticles(
    events: Array<{ ticker: string; event: string; impact: string; suggestedAction: string }>,
    movers: { gainers: Mover[]; losers: Mover[] },
    config: Record<string, unknown>,
  ): Promise<{ fixes: AutoFixRecord[]; articleIds: string[] }> {
    const fixes: AutoFixRecord[] = [];
    const articleIds: string[] = [];
    const maxArticles = (config.maxArticlesPerRun as number) ?? 1;

    // Filter to high-impact events only
    const significant = events
      .filter((e) => e.impact === "high")
      .slice(0, maxArticles);

    for (const event of significant) {
      try {
        // Find the mover data for context
        const tickerClean = event.ticker?.replace(".JK", "") ?? "";
        const mover = [...movers.gainers, ...movers.losers].find(
          (m) => m.ticker.replace(".JK", "") === tickerClean,
        );

        const context = mover
          ? `${tickerClean} bergerak ${mover.changePercent > 0 ? "+" : ""}${mover.changePercent.toFixed(2)}% ke ${mover.close}. `
          : "";

        const keywords = [
          tickerClean || "IDX",
          "breaking",
          mover && mover.changePercent > 5 ? "rally" : "sell-off",
        ].filter(Boolean);

        const article = await articleService.generateNewsArticle(
          `${context}${event.event}`,
          keywords,
          event.suggestedAction ? [event.suggestedAction] : undefined,
        );

        articleIds.push(article.id);
        fixes.push({
          type: "auto_article",
          field: "article",
          before: "",
          after: `Generated: "${article.title}" (${article.id})`,
          applied: true,
        });
      } catch (err) {
        fixes.push({
          type: "auto_article",
          field: "article",
          before: "",
          after: `Failed for: ${event.event}`,
          applied: false,
          reason: err instanceof Error ? err.message : "Generation failed",
        });
      }
    }

    return { fixes, articleIds };
  }

  // ── Analysis methods (unchanged) ─────────────────────────────────────

  private async getTopMovers(): Promise<{ gainers: Mover[]; losers: Mover[] }> {
    try {
      const rows = await prisma.$queryRaw<Array<{
        ticker: string;
        name: string;
        close: number;
        prev_close: number;
        change_pct: number;
      }>>`
        WITH latest AS (
          SELECT sp."stockId", sp.close, sp.date,
                 ROW_NUMBER() OVER (PARTITION BY sp."stockId" ORDER BY sp.date DESC) as rn
          FROM "StockPrice" sp
          WHERE sp.date >= CURRENT_DATE - INTERVAL '7 days'
        ),
        cur AS (SELECT * FROM latest WHERE rn = 1),
        prev AS (SELECT * FROM latest WHERE rn = 2)
        SELECT s.ticker, s.name,
               ROUND(CAST(c.close AS numeric), 2) as close,
               ROUND(CAST(p.close AS numeric), 2) as prev_close,
               ROUND(CAST(((c.close - p.close) / p.close) * 100 AS numeric), 2) as change_pct
        FROM cur c
        JOIN prev p ON c."stockId" = p."stockId"
        JOIN "Stock" s ON s.id = c."stockId"
        WHERE s."isActive" = true
        ORDER BY change_pct DESC
        LIMIT 30
      `;

      const gainers = rows
        .filter((r) => r.change_pct > 0)
        .slice(0, 5)
        .map((r) => ({
          ticker: r.ticker,
          name: r.name,
          changePercent: Number(r.change_pct),
          close: Number(r.close),
        }));

      const losers = rows
        .filter((r) => r.change_pct < 0)
        .sort((a, b) => Number(a.change_pct) - Number(b.change_pct))
        .slice(0, 5)
        .map((r) => ({
          ticker: r.ticker,
          name: r.name,
          changePercent: Number(r.change_pct),
          close: Number(r.close),
        }));

      return { gainers, losers };
    } catch {
      return { gainers: [], losers: [] };
    }
  }

  private async getRecentArticles(): Promise<Array<{ title: string; createdAt: string }>> {
    try {
      const articles = await prisma.article.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          title: true,
          createdAt: true,
        },
      });
      return articles.map((a) => ({
        title: a.title,
        createdAt: a.createdAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  private async analyzeMarket(
    movers: { gainers: Mover[]; losers: Mover[] },
    recentArticles: Array<{ title: string; createdAt: string }>,
  ) {
    const gainersStr = movers.gainers
      .map((g) => `$${g.ticker.replace(".JK", "")} +${g.changePercent.toFixed(2)}%`)
      .join(", ");

    const losersStr = movers.losers
      .map((l) => `$${l.ticker.replace(".JK", "")} ${l.changePercent.toFixed(2)}%`)
      .join(", ");

    const articlesStr = recentArticles
      .slice(0, 5)
      .map((a) => `- ${a.title}`)
      .join("\n");

    const system = `Kamu adalah market analyst untuk TeknikalID — platform analisa teknikal saham Indonesia (IDX).
Analisis kondisi pasar berdasarkan data yang diberikan.

Output HANYA JSON valid, tanpa teks lain.`;

    const user = `Analisis pasar hari ini:

Top Gainers: ${gainersStr || "Tidak ada data"}
Top Losers: ${losersStr || "Tidak ada data"}

Artikel terbaru:
${articlesStr || "Tidak ada artikel baru"}

Berikan output JSON:
{
  "summary": "ringkasan kondisi pasar 1-2 kalimat",
  "sentimentScores": {
    "MARKET": 0-100,
    "per-ticker score jika relevan": 0-100
  },
  "breakingEvents": [
    {
      "ticker": "BBCA.JK atau null jika market-wide",
      "event": "deskripsi event",
      "impact": "high" | "medium" | "low",
      "suggestedAction": "post komunitas atau null"
    }
  ],
  "suggestedPosts": [
    "draft post komunitas yang bisa dikirim Teknikal Robo (max 280 karakter)"
  ]
}

Aturan:
- sentimentScores: 0=sangat bearish, 50=netral, 100=sangat bullish
- breakingEvents: hanya event yang BENAR-BENAR signifikan (pergerakan >5%, volume spike extreme, dll)
- suggestedPosts: max 2 post, bahasa Indonesia santai trader`;

    const response = await this.callAI(system, user, 2000);

    const parsed = this.parseJsonResponse(response);
    return parsed ?? { summary: "Analysis completed", sentimentScores: {}, breakingEvents: [], suggestedPosts: [] };
  }
}
