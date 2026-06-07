import Anthropic from "@anthropic-ai/sdk";
import { communityAgentRepository } from "./community-agent.repository";
import { communityService } from "@/domains/community/community.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { decimalToNumber } from "@/lib/serialize";
import { BOT_CONFIG } from "./constants";
import { AIGenerationError } from "./community-agent.errors";
import { scanSignals, buildMarketPulseData, type DetectedSignal } from "./signal-detector";
import { buildSignalPostPrompt, buildMarketPulsePrompt, buildReplyPrompt, buildRandomInsightPrompt } from "./prompt-builder";
import { IDX40_TICKERS } from "@/lib/constants";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    baseURL: process.env.ANTHROPIC_BASE_URL,
    timeout: 30_000,
  });
}

export const communityAgentService = {
  // ── Main entry point ──

  async runAgent(): Promise<{
    postsCreated: number;
    repliesCreated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let postsCreated = 0;
    let repliesCreated = 0;

    // 1. Ensure bot user exists
    const botUser = await this.ensureBotUser();

    // 2. Check rate limits
    const postCount = await communityAgentRepository.countBotPostsToday(botUser.id);
    const replyCount = await communityAgentRepository.countBotRepliesToday(botUser.id);
    const canPost = postCount < BOT_CONFIG.MAX_POSTS_PER_DAY;
    const canReply = replyCount < BOT_CONFIG.MAX_REPLIES_PER_DAY;

    if (!canPost && !canReply) {
      return { postsCreated: 0, repliesCreated: 0, errors: ["Daily limits reached"] };
    }

    let aiCallsUsed = 0;

    // 3. Signal-based posts (capped per run)
    if (canPost) {
      const postQuota = Math.min(
        BOT_CONFIG.MAX_POSTS_PER_RUN,
        BOT_CONFIG.MAX_POSTS_PER_DAY - postCount,
      );
      const aiQuota = BOT_CONFIG.MAX_AI_CALLS_PER_RUN - aiCallsUsed;

      try {
        const created = await this.scanAndPostSignals(botUser.id, postQuota, aiQuota);
        postsCreated += created.count;
        aiCallsUsed += created.aiCalls;
        errors.push(...created.errors);
      } catch (err) {
        errors.push(`Signal scan failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Random insight fallback — if no signal post was created, post about a random stock
    if (canPost && postsCreated < BOT_CONFIG.MAX_POSTS_PER_RUN && aiCallsUsed < BOT_CONFIG.MAX_AI_CALLS_PER_RUN) {
      try {
        const created = await this.generateRandomInsight(botUser.id);
        if (created) {
          postsCreated++;
          aiCallsUsed++;
        }
      } catch (err) {
        errors.push(`Random insight failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 5. Market pulse (once per day)
    if (canPost && postsCreated < BOT_CONFIG.MAX_POSTS_PER_RUN && aiCallsUsed < BOT_CONFIG.MAX_AI_CALLS_PER_RUN) {
      try {
        const existing = await communityAgentRepository.findMarketPulseToday(botUser.id);
        if (!existing) {
          const created = await this.generateMarketPulse(botUser.id);
          if (created) {
            postsCreated++;
            aiCallsUsed++;
          }
        }
      } catch (err) {
        errors.push(`Market pulse failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 6. Auto-replies (capped per run)
    if (canReply && aiCallsUsed < BOT_CONFIG.MAX_AI_CALLS_PER_RUN) {
      const replyQuota = Math.min(
        BOT_CONFIG.MAX_REPLIES_PER_RUN,
        BOT_CONFIG.MAX_REPLIES_PER_DAY - replyCount,
        BOT_CONFIG.MAX_AI_CALLS_PER_RUN - aiCallsUsed,
      );

      try {
        const created = await this.scanAndReply(botUser.id, replyQuota);
        repliesCreated += created.count;
        errors.push(...created.errors);
      } catch (err) {
        errors.push(`Reply scan failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { postsCreated, repliesCreated, errors };
  },

  // ── Bot user ──

  async ensureBotUser(): Promise<{ id: string }> {
    let user = await communityAgentRepository.findBotUser();
    if (!user) {
      user = await communityAgentRepository.createBotUser();
      console.log(`[community-agent] Created bot user: ${BOT_CONFIG.USERNAME} (${user.id})`);
    }
    return user;
  },

  // ── Signal scanning + posting ──

  async scanAndPostSignals(
    botUserId: string,
    postQuota: number,
    aiQuota: number,
  ): Promise<{ count: number; aiCalls: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;
    let aiCalls = 0;

    // Fetch IDX40 stocks with indicators
    const allStocks = await stockRepository.findActiveStocksWithPrices();
    const idx40Set = new Set(IDX40_TICKERS);
    const stocks = allStocks.filter((s) => idx40Set.has(s.ticker));

    // Fetch avg volumes for volume spike detection
    const stockIds = stocks.map((s) => s.id);
    const avgVolumes = await stockRepository.findAvgVolumeByStockIds(stockIds);

    // Scan signals
    const signals = scanSignals(stocks, avgVolumes);

    // Process top signals
    const maxToProcess = Math.min(postQuota, aiQuota, signals.length);

    for (let i = 0; i < maxToProcess; i++) {
      const signal = signals[i];

      // Dedup: skip if already posted about this ticker today
      if (signal.ticker !== "IDX") {
        const existing = await communityAgentRepository.findBotPostToday(botUserId, signal.ticker);
        if (existing) continue;
      }

      try {
        const content = await this.generatePostContent(signal);
        if (!content) continue;

        await communityService.createPost(botUserId, {
          content,
          tickerTag: signal.ticker !== "IDX" ? signal.ticker : undefined,
        });

        count++;
        aiCalls++;

        if (aiCalls < maxToProcess) {
          await sleep(2000); // Rate limit between AI calls
        }
      } catch (err) {
        errors.push(`Post ${signal.ticker}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { count, aiCalls, errors };
  },

  // ── Market pulse ──

  async generateMarketPulse(botUserId: string): Promise<boolean> {
    const overview = await stockMarketService.getMarketOverview();

    const signal = buildMarketPulseData(overview.gainers, overview.losers);
    if (!signal) return false;

    const { system, user } = buildMarketPulsePrompt(
      signal.data.gainers as { ticker: string; name: string; close: number; changePercent: number | null }[],
      signal.data.losers as { ticker: string; name: string; close: number; changePercent: number | null }[],
    );

    const content = await this.callAI(system, user);
    if (!content) return false;

    await communityService.createPost(botUserId, {
      content,
      // No tickerTag for market pulse
    });

    return true;
  },

  // ── Random insight (fallback when no strong signals) ──

  async generateRandomInsight(botUserId: string): Promise<boolean> {
    // Fetch IDX40 stocks with indicators
    const allStocks = await stockRepository.findActiveStocksWithPrices();
    const idx40Set = new Set(IDX40_TICKERS);
    const stocks = allStocks.filter((s) => idx40Set.has(s.ticker) && s.indicators[0]);

    // Shuffle and try up to 5 stocks to find one not yet posted today
    const shuffled = [...stocks].sort(() => Math.random() - 0.5);
    let stock = null;
    for (const candidate of shuffled.slice(0, 5)) {
      const existing = await communityAgentRepository.findBotPostToday(botUserId, candidate.ticker);
      if (!existing) {
        stock = candidate;
        break;
      }
    }
    if (!stock || !stock.indicators[0]) return false;

    const ind = stock.indicators[0];
    const close = stock.prices[0] ? Number(stock.prices[0].close) : null;
    const prevClose = stock.prices[1] ? Number(stock.prices[1].close) : null;
    const changePercent = close != null && prevClose != null && prevClose > 0
      ? ((close - prevClose) / prevClose) * 100
      : null;

    const { system, user } = buildRandomInsightPrompt({
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      price: close,
      changePercent,
      rsi14: decimalToNumber(ind.rsi14),
      sma20: decimalToNumber(ind.sma20),
      sma50: decimalToNumber(ind.sma50),
      bbUpper: decimalToNumber(ind.bbUpper),
      bbLower: decimalToNumber(ind.bbLower),
      supertrend: decimalToNumber(ind.supertrend),
      signalLabel: ind.signalLabel,
    });

    const content = await this.callAI(system, user);
    if (!content) return false;

    await communityService.createPost(botUserId, {
      content,
      tickerTag: stock.ticker,
    });

    return true;
  },

  // ── Auto-replies ──

  async scanAndReply(
    botUserId: string,
    replyQuota: number,
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    // Find recent posts from the last 12 hours
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const posts = await communityAgentRepository.findRecentPostsForReply(botUserId, since, replyQuota);

    for (const post of posts) {
      if (count >= replyQuota) break;
      if (!post.tickerTag) continue;

      try {
        // Fetch indicator data for this ticker
        const stock = await stockRepository.findStockByTicker(post.tickerTag);
        if (!stock) continue;

        const indicatorData = await this.getIndicatorSnapshot(post.tickerTag);
        if (!indicatorData) continue;

        const { system, user } = buildReplyPrompt(post.tickerTag, post.content, indicatorData);
        const content = await this.callAI(system, user);
        if (!content) continue;

        await communityService.createPostComment(botUserId, {
          content,
          postId: post.id,
        });

        count++;

        if (count < replyQuota) {
          await sleep(2000);
        }
      } catch (err) {
        errors.push(`Reply ${post.tickerTag}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { count, errors };
  },

  // ── AI calls ──

  async generatePostContent(signal: DetectedSignal): Promise<string | null> {
    const { system, user } = buildSignalPostPrompt(signal);
    return this.callAI(system, user);
  },

  async callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (!process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new AIGenerationError("ANTHROPIC_AUTH_TOKEN not configured");
    }

    try {
      const client = createAnthropicClient();
      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

      const response = await client.messages.create({
        model,
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) return null;

      // Strip any surrounding quotes
      return text.replace(/^["']|["']$/g, "");
    } catch (err) {
      console.error("[community-agent] AI call failed:", err instanceof Error ? err.message : err);
      return null;
    }
  },

  // ── Helper: get quick indicator snapshot for a ticker ──

  async getIndicatorSnapshot(ticker: string): Promise<{
    close: number | null;
    changePercent: number | null;
    rsi14: number | null;
    signalScore: number | null;
    signalLabel: string | null;
    supertrend: number | null;
  } | null> {
    const stocks = await stockRepository.findActiveStocksWithPrices(
      undefined,
      true,
    );
    const stock = stocks.find((s) => s.ticker === ticker);
    if (!stock || !stock.indicators[0]) return null;

    const ind = stock.indicators[0];
    const prices = stock.prices;
    const close = prices[0] ? Number(prices[0].close) : null;
    const prevClose = prices[1] ? Number(prices[1].close) : null;
    const changePercent = close != null && prevClose != null && prevClose > 0
      ? ((close - prevClose) / prevClose) * 100
      : null;

    return {
      close,
      changePercent,
      rsi14: decimalToNumber(ind.rsi14),
      signalScore: decimalToNumber(ind.signalScore),
      signalLabel: ind.signalLabel,
      supertrend: decimalToNumber(ind.supertrend),
    };
  },
};
