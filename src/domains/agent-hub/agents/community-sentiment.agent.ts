import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

interface SentimentResult {
  ticker: string;
  sentiment: number;       // -1 to 1
  confidence: number;      // 0 to 1
  keyThemes: string[];
  summary: string;
  postCount: number;
}

export class CommunitySentimentAgent extends BaseAgent {
  readonly type: AgentType = "community_sentiment";
  readonly label = "Community Sentiment";

  protected getDefaultSystemPrompt(): string {
    return `You are a stock market sentiment analyst for the Indonesia Stock Exchange (IDX). Analyze community discussion posts about a specific stock ticker and determine the overall market sentiment.

Return a JSON object with:
- sentiment: number from -1 (very bearish) to 1 (very bullish), 0 = neutral
- confidence: number from 0 to 1 indicating how confident you are
- keyThemes: array of 3-5 key themes mentioned in the discussions
- summary: 1-2 sentence summary of the overall sentiment

Focus on:
- Price predictions and directional opinions
- Fundamental analysis mentions (earnings, revenue, etc.)
- Technical analysis mentions (support/resistance, indicators)
- Market sentiment and news impact
- Risk concerns

Be objective — don't amplify hype or panic. If posts are mostly neutral or mixed, return sentiment close to 0.`;
  }

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const config = await this.getAgentConfig();
    const minPosts = (config?.minPostsForAnalysis as number) ?? 3;
    const maxTickers = (config?.maxTickersPerRun as number) ?? 20;

    // Fetch posts from last 24h with ticker tags
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const posts = await prisma.post.findMany({
      where: {
        createdAt: { gte: since },
        tickerTag: { not: null },
      },
      select: {
        content: true,
        tickerTag: true,
      },
    });

    // Group by ticker
    const postsByTicker = new Map<string, string[]>();
    for (const post of posts) {
      if (!post.tickerTag) continue;
      const arr = postsByTicker.get(post.tickerTag) ?? [];
      arr.push(post.content);
      postsByTicker.set(post.tickerTag, arr);
    }

    // Filter by min posts and limit tickers
    const tickers = [...postsByTicker.entries()]
      .filter(([, p]) => p.length >= minPosts)
      .slice(0, maxTickers);

    if (tickers.length === 0) {
      return {
        summary: "No tickers with enough posts for sentiment analysis",
        sentiments: [],
        tickersAnalyzed: 0,
      };
    }

    const sentiments: SentimentResult[] = [];

    for (const [ticker, tickerPosts] of tickers) {
      try {
        const combinedContent = tickerPosts
          .map((c) => c.slice(0, 300))
          .join("\n---\n")
          .slice(0, 4000);

        const systemPrompt = await this.getSystemPrompt();
        const response = await this.callAI(
          systemPrompt,
          `Analyze the sentiment for IDX ticker ${ticker} based on these ${tickerPosts.length} community posts:\n\n${combinedContent}`,
          1000,
        );

        const parsed = this.parseJsonResponse(response);
        if (parsed) {
          sentiments.push({
            ticker,
            sentiment: typeof parsed.sentiment === "number" ? Math.max(-1, Math.min(1, parsed.sentiment)) : 0,
            confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
            keyThemes: Array.isArray(parsed.keyThemes) ? (parsed.keyThemes as string[]).slice(0, 5) : [],
            summary: typeof parsed.summary === "string" ? parsed.summary : "",
            postCount: tickerPosts.length,
          });
        } else {
          sentiments.push({
            ticker,
            sentiment: 0,
            confidence: 0,
            keyThemes: [],
            summary: "Failed to parse AI response",
            postCount: tickerPosts.length,
          });
        }
      } catch (e) {
        sentiments.push({
          ticker,
          sentiment: 0,
          confidence: 0,
          keyThemes: [],
          summary: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
          postCount: tickerPosts.length,
        });
      }
    }

    const bullish = sentiments.filter((s) => s.sentiment > 0.3).length;
    const bearish = sentiments.filter((s) => s.sentiment < -0.3).length;
    const neutral = sentiments.length - bullish - bearish;

    return {
      summary: `Analyzed ${sentiments.length} tickers: ${bullish} bullish, ${bearish} bearish, ${neutral} neutral`,
      sentiments,
      tickersAnalyzed: sentiments.length,
    };
  }
}
