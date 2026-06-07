import { subDays } from "date-fns";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { IDX40 } from "@/lib/constants";
import { ALL_TICKERS } from "@/lib/idx-stocks";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { stockRepository } from "@/domains/stock/stock.repository";
import { articleRepository } from "./article.repository";
import { createAIProvider } from "./ai-provider";
import { buildStockAnalysisPrompt, buildEducationalPrompt, buildNewsPrompt, buildGeneralPrompt, pickNextTopic } from "./prompts";
import { buildTemplateArticle, buildDailySnapshot, buildDailySlug } from "./article-template";
import { ArticleNotFoundError, ArticleGenerationError, DuplicateSlugError } from "./article.errors";
import { gatherMarketContext, formatMarketContextForPrompt, factCheckArticle, extractTickersFromText } from "./article-fact-check";
import type { MarketContext } from "./article-fact-check";

export const articleService = {
  async generateStockAnalysis(ticker: string): Promise<{ id: string; title: string; slug: string }> {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new ArticleGenerationError(`Stock ${ticker} not found`);

    const [prices, indicator, prevIndicator, fundamental] = await Promise.all([
      stockRepository.findLatestPrices(stock.id, 2),
      stockRepository.findLatestIndicator(stock.id, "1d"),
      stockRepository.findPrevIndicator(stock.id, "1d"),
      stockRepository.findLatestFundamental(stock.id),
    ]);

    if (!indicator) throw new ArticleGenerationError(`No indicator data for ${ticker}`);

    const latest = prices[0];
    // Skip stocks with stale data (no price in 7+ days)
    if (latest && latest.date < subDays(new Date(), 7)) {
      throw new ArticleGenerationError(`Skipping ${ticker}: stale price data (${latest.date.toISOString().slice(0, 10)})`);
    }

    const week52 = await stockRepository.getWeek52HighLow(stock.id);

    const indicatorData = {
      rsi14: decimalToNumber(indicator.rsi14),
      macdHist: decimalToNumber(indicator.macdHist),
      sma20: decimalToNumber(indicator.sma20),
      sma50: decimalToNumber(indicator.sma50),
      sma200: decimalToNumber(indicator.sma200),
      bbUpper: decimalToNumber(indicator.bbUpper),
      bbLower: decimalToNumber(indicator.bbLower),
      stochK: decimalToNumber(indicator.stochK),
      stochD: decimalToNumber(indicator.stochD),
      adx: decimalToNumber(indicator.adx),
      atr: decimalToNumber(indicator.atr),
      supertrend: decimalToNumber(indicator.supertrend),
      obvTrend: indicator.obvTrend,
    };

    const close = latest ? decimalToNumber(latest.close) : null;
    const prev = prices[1];
    const changePercent = latest && prev
      ? (() => {
          const c = decimalToNumber(latest.close);
          const p = decimalToNumber(prev.close);
          return c !== null && p !== null ? ((c - p) / p) * 100 : null;
        })()
      : null;

    const { system, user } = buildStockAnalysisPrompt({
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      close,
      changePercent,
      rsi14: indicatorData.rsi14 ?? null,
      macdHist: indicatorData.macdHist ?? null,
      sma20: indicatorData.sma20 ?? null,
      sma50: indicatorData.sma50 ?? null,
      sma200: indicatorData.sma200 ?? null,
      bbUpper: indicatorData.bbUpper ?? null,
      bbLower: indicatorData.bbLower ?? null,
      stochK: indicatorData.stochK ?? null,
      stochD: indicatorData.stochD ?? null,
      adx: indicatorData.adx ?? null,
      atr: indicatorData.atr ?? null,
      supertrend: indicatorData.supertrend ?? null,
      obvTrend: indicatorData.obvTrend ?? null,
      week52High: decimalToNumber(week52._max.high),
      week52Low: decimalToNumber(week52._min.low),
      volume: latest ? bigIntToNumber(latest.volume) : null,
    });

    const provider = createAIProvider();
    const result = await provider.generateArticle(system, user).catch((err) => {
      throw new ArticleGenerationError(err instanceof Error ? err.message : "AI generation failed");
    });

    const t = ticker.replace(".JK", "").toLowerCase();
    const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const slug = `analisa-teknikal-${t}`;

    // Evergreen: update existing article or create new
    const existing = await articleRepository.findBySlug(slug);
    const title = result.title || `Analisa Teknikal ${t.toUpperCase()} ${month}`;
    const tags = result.tags.length > 0 ? result.tags : [stock.sector, t.toUpperCase(), "analisa teknikal"];
    const meta = { provider: provider.name, model: process.env.ANTHROPIC_MODEL, timestamp: new Date().toISOString() } as Record<string, string>;

    if (existing) {
      await articleRepository.update(existing.id, {
        title,
        excerpt: result.excerpt?.slice(0, 500) || "",
        content: result.content,
        tags,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
        generationMeta: meta,
        isListed: false,
      });
      await articleRepository.incrementVersion(existing.id);
      return { id: existing.id, title, slug };
    }

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    const article = await articleRepository.create({
      slug,
      title,
      excerpt: result.excerpt?.slice(0, 500) || "",
      content: result.content,
      authorId: adminUser.id,
      tags,
      status: ArticleStatus.PUBLISHED,
      articleType: ArticleType.STOCK_ANALYSIS,
      aiProvider: provider.name,
      tickerTag: ticker,
      generationMeta: meta,
      isListed: false,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async generateTemplateAnalysis(ticker: string): Promise<{ id: string; title: string; slug: string }> {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new ArticleGenerationError(`Stock ${ticker} not found`);

    const [prices, indicator] = await Promise.all([
      stockRepository.findLatestPrices(stock.id, 2),
      stockRepository.findLatestIndicator(stock.id, "1d"),
    ]);

    if (!indicator) throw new ArticleGenerationError(`No indicator data for ${ticker}`);

    const latest = prices[0];
    if (latest && latest.date < subDays(new Date(), 7)) {
      throw new ArticleGenerationError(`Skipping ${ticker}: stale price data`);
    }

    const week52 = await stockRepository.getWeek52HighLow(stock.id);
    const close = latest ? decimalToNumber(latest.close) : null;
    const prev = prices[1];
    const changePercent = latest && prev
      ? (() => {
          const c = decimalToNumber(latest.close);
          const p = decimalToNumber(prev.close);
          return c !== null && p !== null ? ((c - p) / p) * 100 : null;
        })()
      : null;

    const t = ticker.replace(".JK", "").toLowerCase();
    const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const slug = `analisa-teknikal-${t}`;
    const title = `Analisa Teknikal ${t.toUpperCase()} ${month}`;

    const content = buildTemplateArticle({
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      close,
      changePercent,
      rsi14: decimalToNumber(indicator.rsi14),
      macdHist: decimalToNumber(indicator.macdHist),
      sma20: decimalToNumber(indicator.sma20),
      sma50: decimalToNumber(indicator.sma50),
      sma200: decimalToNumber(indicator.sma200),
      bbUpper: decimalToNumber(indicator.bbUpper),
      bbLower: decimalToNumber(indicator.bbLower),
      stochK: decimalToNumber(indicator.stochK),
      stochD: decimalToNumber(indicator.stochD),
      adx: decimalToNumber(indicator.adx),
      atr: decimalToNumber(indicator.atr),
      supertrend: decimalToNumber(indicator.supertrend),
      obvTrend: indicator.obvTrend,
      week52High: decimalToNumber(week52._max.high),
      week52Low: decimalToNumber(week52._min.low),
      volume: latest ? bigIntToNumber(latest.volume) : null,
    });

    const excerpt = `Analisa teknikal ${stock.name} (${t.toUpperCase()}) berdasarkan indikator RSI, MACD, SMA, Bollinger Bands, dan lainnya. Data terkini per ${month}.`.slice(0, 500);
    const tags = [stock.sector, t.toUpperCase(), "analisa teknikal"];
    const meta = { provider: "template", timestamp: new Date().toISOString() } as Record<string, string>;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) {
      await articleRepository.update(existing.id, { title, excerpt, content, tags, status: ArticleStatus.PUBLISHED, publishedAt: new Date(), generationMeta: meta, isListed: false });
      await articleRepository.incrementVersion(existing.id);
      return { id: existing.id, title, slug };
    }

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    const article = await articleRepository.create({
      slug, title, excerpt, content,
      authorId: adminUser.id, tags,
      status: ArticleStatus.PUBLISHED,
      articleType: ArticleType.STOCK_ANALYSIS,
      aiProvider: "template",
      tickerTag: ticker,
      generationMeta: meta,
      isListed: false,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async generateEducational(topicId: string): Promise<{ id: string; title: string; slug: string }> {
    const { buildEducationalPrompt: _bep, EDUCATIONAL_TOPICS } = await import("./prompts");
    const topic = EDUCATIONAL_TOPICS.find((t) => t.id === topicId);
    if (!topic) throw new ArticleGenerationError(`Topic "${topicId}" not found`);

    const { system, user } = buildEducationalPrompt(topic);

    const provider = createAIProvider();
    const result = await provider.generateArticle(system, user).catch((err) => {
      throw new ArticleGenerationError(err instanceof Error ? err.message : "AI generation failed");
    });

    const slug = result.slug || `edukasi-${topic.id}`;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) throw new DuplicateSlugError(slug);

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    const article = await articleRepository.create({
      slug,
      title: result.title || topic.title,
      excerpt: result.excerpt?.slice(0, 500) || "",
      content: result.content,
      authorId: adminUser.id,
      tags: result.tags.length > 0 ? result.tags : topic.keywords,
      status: ArticleStatus.DRAFT,
      articleType: ArticleType.EDUCATIONAL,
      aiProvider: provider.name,
      generationMeta: { provider: provider.name, topicId, timestamp: new Date().toISOString() } as Record<string, string>,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async publishArticle(id: string) {
    const article = await articleRepository.findById(id);
    if (!article) throw new ArticleNotFoundError();
    return articleRepository.update(id, {
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
    });
  },

  async unpublishArticle(id: string) {
    const article = await articleRepository.findById(id);
    if (!article) throw new ArticleNotFoundError();
    return articleRepository.update(id, { status: ArticleStatus.DRAFT });
  },

  async updateArticle(id: string, data: { title?: string; excerpt?: string; content?: string; tags?: string[] }) {
    const article = await articleRepository.findById(id);
    if (!article) throw new ArticleNotFoundError();
    return articleRepository.update(id, data);
  },

  async deleteArticle(id: string) {
    const article = await articleRepository.findById(id);
    if (!article) throw new ArticleNotFoundError();
    return articleRepository.delete(id);
  },

  async researchTopic(query: string, context?: string) {
    const provider = createAIProvider();
    return provider.researchKeywords(query, context);
  },

  async generateNewsArticle(topic: string, keywords: string[], trendingAngles?: string[], context?: string, autoPublish = false, marketCtx?: MarketContext): Promise<{ id: string; title: string; slug: string }> {
    const marketDataSection = marketCtx ? formatMarketContextForPrompt(marketCtx) : undefined;
    const { system, user } = buildNewsPrompt({ topic, keywords, trendingAngles, context, marketDataSection });

    const provider = createAIProvider();
    const result = await provider.generateArticle(system, user).catch((err) => {
      throw new ArticleGenerationError(err instanceof Error ? err.message : "AI generation failed");
    });

    const slug = result.slug || `berita-${topic.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)}`;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) throw new DuplicateSlugError(slug);

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    // Fact-check if market context is available
    let finalContent = result.content;
    let finalTitle = result.title || topic;
    let factCheckMeta: Record<string, string> = {};
    if (marketCtx) {
      const factCheck = await factCheckArticle(result.content, marketCtx, finalTitle);
      if (!factCheck.passed && factCheck.correctedContent) {
        finalContent = factCheck.correctedContent;
        if (factCheck.correctedTitle) {
          finalTitle = factCheck.correctedTitle;
        }
        console.log(`[NewsArticle] Fact-check corrected ${factCheck.mismatches.length} errors in: ${topic}`);
      } else if (factCheck.passed) {
        console.log(`[NewsArticle] Fact-check passed for: ${topic} (${factCheck.meta.claimsChecked} claims checked)`);
      }
      factCheckMeta = {
        factCheckPassed: String(factCheck.passed),
        factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
        factCheckErrors: String(factCheck.mismatches.length),
        factCheckCorrected: String(!factCheck.passed && !!factCheck.correctedContent),
      };
    }

    const status = autoPublish ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;
    const article = await articleRepository.create({
      slug,
      title: finalTitle,
      excerpt: result.excerpt?.slice(0, 500) || "",
      content: finalContent,
      authorId: adminUser.id,
      tags: result.tags.length > 0 ? result.tags : keywords.slice(0, 5),
      status,
      articleType: ArticleType.NEWS,
      aiProvider: provider.name,
      generationMeta: { provider: provider.name, topic, keywords, timestamp: new Date().toISOString(), ...factCheckMeta } as Record<string, string | string[]>,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async generateGeneralArticle(topic: string, keywords: string[], trendingAngles?: string[], style?: string, context?: string): Promise<{ id: string; title: string; slug: string }> {
    const { system, user } = buildGeneralPrompt({ topic, keywords, trendingAngles, style, context });

    const provider = createAIProvider();
    const result = await provider.generateArticle(system, user).catch((err) => {
      throw new ArticleGenerationError(err instanceof Error ? err.message : "AI generation failed");
    });

    const slug = result.slug || `artikel-${topic.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)}`;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) throw new DuplicateSlugError(slug);

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    const article = await articleRepository.create({
      slug,
      title: result.title || topic,
      excerpt: result.excerpt?.slice(0, 500) || "",
      content: result.content,
      authorId: adminUser.id,
      tags: result.tags.length > 0 ? result.tags : keywords.slice(0, 5),
      status: ArticleStatus.DRAFT,
      articleType: ArticleType.GENERAL,
      aiProvider: provider.name,
      generationMeta: { provider: provider.name, topic, keywords, style, timestamp: new Date().toISOString() } as Record<string, string | string[] | undefined>,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async runDailyGeneration(): Promise<{ generated: string[]; errors: string[] }> {
    const generated: string[] = [];
    const errors: string[] = [];

    // Pick stocks not analyzed in 7+ days
    const recentSlugs = await articleRepository.findRecentStockAnalysisSlugs();
    const eligibleStocks = IDX40.filter((s) => {
      const lastDate = recentSlugs.get(s.ticker);
      if (!lastDate) return true;
      return lastDate < subDays(new Date(), 7);
    });

    const stockCount = Number(process.env.AI_DAILY_STOCK_COUNT) || 2;
    const shuffled = eligibleStocks.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, stockCount);

    for (const stock of selected) {
      try {
        const result = await this.generateStockAnalysis(stock.ticker);
        generated.push(`${stock.ticker}: ${result.title}`);
      } catch (err) {
        errors.push(`${stock.ticker}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    // Pick 1 educational topic
    const existingSlugs = await articleRepository.findExistingEducationalSlugs();
    const topic = pickNextTopic(existingSlugs);
    if (topic) {
      try {
        const result = await this.generateEducational(topic.id);
        generated.push(`Edukasi: ${result.title}`);
      } catch (err) {
        errors.push(`Edukasi: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    return { generated, errors };
  },

  async runBatchGeneration(batchSize: number): Promise<{ generated: string[]; errors: string[]; skipped: string[] }> {
    const generated: string[] = [];
    const errors: string[] = [];
    const skipped: string[] = [];

    const tickers = await articleRepository.findTickersNeedingGeneration(batchSize, ALL_TICKERS);
    const idx40Set = new Set(IDX40.map((s) => s.ticker));

    for (const ticker of tickers) {
      try {
        const isIdx40 = idx40Set.has(ticker);
        if (isIdx40) {
          // Tier 1: AI-generated for top stocks
          const result = await this.generateStockAnalysis(ticker);
          generated.push(`${ticker} (AI): ${result.title}`);
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          // Tier 2: Template-based for minor stocks (instant, no rate limit)
          const result = await this.generateTemplateAnalysis(ticker);
          generated.push(`${ticker} (template): ${result.title}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        if (msg.includes("stale price data")) {
          skipped.push(`${ticker}: ${msg}`);
        } else {
          errors.push(`${ticker}: ${msg}`);
        }
      }
    }

    return { generated, errors, skipped };
  },

  async generateDailySnapshot(ticker: string): Promise<{ id: string; title: string; slug: string } | null> {
    const slug = buildDailySlug(ticker);

    // Skip if today's snapshot already exists
    const existing = await articleRepository.findBySlug(slug);
    if (existing) return null;

    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) return null;

    const [prices, indicator, fundamental] = await Promise.all([
      stockRepository.findLatestPrices(stock.id, 2),
      stockRepository.findLatestIndicator(stock.id, "1d"),
      stockRepository.findLatestFundamental(stock.id),
    ]);

    if (!indicator) return null;

    const latest = prices[0];
    if (!latest || latest.date < subDays(new Date(), 7)) return null;

    const week52 = await stockRepository.getWeek52HighLow(stock.id);
    const close = decimalToNumber(latest.close);
    const prev = prices[1];
    const changePercent = prev
      ? (() => { const p = decimalToNumber(prev.close); return p ? ((close! - p) / p) * 100 : null; })()
      : null;

    const t = ticker.replace(".JK", "");
    const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const title = `Saham ${stock.name} (${t}) Hari Ini — ${date}`;

    const content = buildDailySnapshot({
      ticker: stock.ticker, name: stock.name, sector: stock.sector,
      close, changePercent,
      rsi14: decimalToNumber(indicator.rsi14), macdHist: decimalToNumber(indicator.macdHist),
      sma20: decimalToNumber(indicator.sma20), sma50: decimalToNumber(indicator.sma50), sma200: decimalToNumber(indicator.sma200),
      bbUpper: decimalToNumber(indicator.bbUpper), bbLower: decimalToNumber(indicator.bbLower),
      stochK: decimalToNumber(indicator.stochK), stochD: decimalToNumber(indicator.stochD),
      adx: decimalToNumber(indicator.adx), atr: decimalToNumber(indicator.atr),
      supertrend: decimalToNumber(indicator.supertrend), obvTrend: indicator.obvTrend,
      week52High: decimalToNumber(week52._max.high), week52Low: decimalToNumber(week52._min.low),
      volume: bigIntToNumber(latest.volume),
      // New fields
      signalScore: decimalToNumber(indicator.signalScore),
      signalLabel: indicator.signalLabel,
      isGorengan: indicator.isGorengan,
      pe: fundamental ? decimalToNumber(fundamental.pe) : null,
      forwardPe: fundamental ? decimalToNumber(fundamental.forwardPe) : null,
      pb: fundamental ? decimalToNumber(fundamental.pb) : null,
      eps: fundamental ? decimalToNumber(fundamental.eps) : null,
      dividendYield: fundamental ? decimalToNumber(fundamental.dividendYield) : null,
      marketCap: fundamental ? bigIntToNumber(fundamental.marketCap) : null,
      prevClose: prev ? decimalToNumber(prev.close) : null,
      high: decimalToNumber(latest.high),
      low: decimalToNumber(latest.low),
      open: decimalToNumber(latest.open),
      smaCrossSignal: indicator.smaCrossSignal,
      emaCrossSignal: indicator.emaCrossSignal,
    });

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) return null;

    const signalLabel = indicator.signalLabel ?? "Netral";
    const article = await articleRepository.create({
      slug, title,
      excerpt: `Saham ${stock.name} (${t}) hari ini ${date}: ${close !== null ? `Rp ${close.toLocaleString("id-ID")}` : "N/A"} (${changePercent !== null ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "N/A"}). Sinyal: ${signalLabel}.`.slice(0, 500),
      content, authorId: adminUser.id,
      tags: [stock.sector, t, "saham hari ini"],
      status: ArticleStatus.PUBLISHED,
      articleType: "DAILY_SNAPSHOT" as ArticleType,
      aiProvider: "template", tickerTag: ticker,
      generationMeta: { provider: "template", date: new Date().toISOString().slice(0, 10) } as Record<string, string>,
      isListed: false,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async runDailySnapshotGeneration(): Promise<{ generated: number; errors: number; skipped: number }> {
    let generated = 0, errors = 0, skipped = 0;

    for (const ticker of ALL_TICKERS) {
      try {
        const result = await this.generateDailySnapshot(ticker);
        if (result) generated++;
        else skipped++;
      } catch (err) {
        console.error(`[daily-snapshot] ${ticker}:`, err instanceof Error ? err.message : err);
        errors++;
      }
    }

    return { generated, errors, skipped };
  },

  async generateTrendingNews(count: number = 10): Promise<{ generated: string[]; errors: string[] }> {
    const generated: string[] = [];
    const errors: string[] = [];

    const provider = createAIProvider();
    const topics = await provider.discoverTrendingTopics();
    const selected = topics.slice(0, count);

    for (const topic of selected) {
      try {
        // Gather market context for data-grounded generation
        const mentionedTickers = extractTickersFromText(`${topic.title} ${topic.keywords.join(" ")}`);
        const marketCtx = await gatherMarketContext(mentionedTickers);

        const result = await this.generateNewsArticle(topic.title, topic.keywords, [topic.angle], undefined, true, marketCtx);
        generated.push(result.title);
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        errors.push(`${topic.title}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    return { generated, errors };
  },

  async updateCoverImage(articleId: string, imageUrl: string) {
    return articleRepository.update(articleId, { coverImageUrl: imageUrl } as Parameters<typeof articleRepository.update>[1]);
  },
};
