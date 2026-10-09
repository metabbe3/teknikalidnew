import { subDays } from "date-fns";
import { wibDayKey } from "@/lib/datetime-wib";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { IDX40 } from "@/lib/constants";
import { IDX40_TICKERS } from "@/lib/idx-stocks";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { articleRepository } from "./article.repository";
import { createAIProvider } from "./ai-provider";
import { buildStockAnalysisPrompt, buildEducationalPrompt, buildNewsPrompt, buildGeneralPrompt, pickNextTopic } from "./prompts";
import { buildTemplateArticle, buildDailySnapshot, buildDailySlug } from "./article-template";
import { ArticleNotFoundError, ArticleGenerationError, DuplicateSlugError } from "./article.errors";
import { gatherMarketContext, formatMarketContextForPrompt, factCheckArticle, factCheckVerdict, extractTickersFromText } from "./article-fact-check";
import type { MarketContext } from "./article-fact-check";
import { validateArticle } from "./quality-validator";
import { resolveTitle } from "./title-guard";
import { sanitizeGeneratedContent } from "./content-sanitizer";

export const articleService = {
  async generateStockAnalysis(ticker: string): Promise<{ id: string; title: string; slug: string }> {
    const stock = await stockMarketService.findStockByTicker(ticker);
    if (!stock) throw new ArticleGenerationError(`Stock ${ticker} not found`);

    const [prices, indicator, prevIndicator, fundamental] = await Promise.all([
      stockMarketService.findLatestPrices(stock.id, 2),
      stockMarketService.findLatestIndicator(stock.id, "1d"),
      stockMarketService.findPrevIndicator(stock.id, "1d"),
      stockMarketService.findLatestFundamental(stock.id),
    ]);

    if (!indicator) throw new ArticleGenerationError(`No indicator data for ${ticker}`);

    const latest = prices[0];
    // Skip stocks with stale data (no price in 7+ days)
    if (latest && latest.date < subDays(new Date(), 7)) {
      throw new ArticleGenerationError(`Skipping ${ticker}: stale price data (${latest.date.toISOString().slice(0, 10)})`);
    }

    const week52 = await stockMarketService.getWeek52HighLow(stock.id);

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
    const cleanContent = sanitizeGeneratedContent(result.content);

    const t = ticker.replace(".JK", "").toLowerCase();
    const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const slug = `analisa-teknikal-${t}`;

    // Evergreen: update existing article or create new
    const existing = await articleRepository.findBySlug(slug);
    const priceStr = close !== null ? `Rp${close.toLocaleString("id-ID")}` : "";
    const changeStr = changePercent !== null ? ` (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)` : "";
    const signalLabel = indicatorData.macdHist !== null
      ? (indicatorData.macdHist > 0 ? "Bullish" : indicatorData.macdHist < 0 ? "Bearish" : "Netral")
      : null;
    const signalStr = signalLabel ? ` — Sinyal ${signalLabel}` : "";
    const defaultTitle = `Analisa Teknikal ${stock.name} (${t.toUpperCase()}) Hari Ini ${priceStr}${changeStr}${signalStr}`;
    const title = resolveTitle(sanitizeGeneratedContent(result.title), cleanContent, defaultTitle);
    const tags = result.tags.length > 0 ? result.tags : [stock.sector, t.toUpperCase(), "analisa teknikal"];
    const meta = { provider: provider.name, model: process.env.ANTHROPIC_MODEL, timestamp: new Date().toISOString() } as Record<string, string>;

    if (existing) {
      await articleRepository.update(existing.id, {
        title,
        excerpt: sanitizeGeneratedContent(result.excerpt ?? "").slice(0, 500),
        content: cleanContent,
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
      excerpt: sanitizeGeneratedContent(result.excerpt ?? "").slice(0, 500),
      content: cleanContent,
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
    const stock = await stockMarketService.findStockByTicker(ticker);
    if (!stock) throw new ArticleGenerationError(`Stock ${ticker} not found`);

    const [prices, indicator] = await Promise.all([
      stockMarketService.findLatestPrices(stock.id, 2),
      stockMarketService.findLatestIndicator(stock.id, "1d"),
    ]);

    if (!indicator) throw new ArticleGenerationError(`No indicator data for ${ticker}`);

    const latest = prices[0];
    if (latest && latest.date < subDays(new Date(), 7)) {
      throw new ArticleGenerationError(`Skipping ${ticker}: stale price data`);
    }

    const week52 = await stockMarketService.getWeek52HighLow(stock.id);
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
    const priceStr = close !== null ? `Rp${close.toLocaleString("id-ID")}` : "";
    const changeStr = changePercent !== null ? ` (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)` : "";
    const sma50Val = decimalToNumber(indicator.sma50);
    const outlook = close !== null && sma50Val !== null
      ? (close > sma50Val ? "Bullish" : close < sma50Val ? "Bearish" : "Netral")
      : null;
    const signalStr = outlook ? ` — Sinyal ${outlook}` : "";
    const title = `Analisa Teknikal ${stock.name} (${t.toUpperCase()}) ${priceStr}${changeStr}${signalStr}`;

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
    const cleanContent = sanitizeGeneratedContent(result.content);

    const slug = result.slug || `edukasi-${topic.id}`;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) throw new DuplicateSlugError(slug);

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    const article = await articleRepository.create({
      slug,
      title: resolveTitle(sanitizeGeneratedContent(result.title), cleanContent, topic.title),
      excerpt: sanitizeGeneratedContent(result.excerpt ?? "").slice(0, 500),
      content: cleanContent,
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

  async generateNewsArticle(topic: string, keywords: string[], trendingAngles?: string[], context?: string, autoPublish = false, marketCtx?: MarketContext, opts?: { minWords?: number }): Promise<{ id: string; title: string; slug: string }> {
    const marketDataSection = marketCtx ? formatMarketContextForPrompt(marketCtx) : undefined;
    const recentPromptTitles = await articleRepository.findRecentTitles(5).catch(() => [] as string[]);
    const { system, user } = buildNewsPrompt({ topic, keywords, trendingAngles, context, marketDataSection, recentTitles: recentPromptTitles });

    const provider = createAIProvider();
    const result = await provider.generateArticle(system, user).catch((err) => {
      throw new ArticleGenerationError(err instanceof Error ? err.message : "AI generation failed");
    });
    const cleanContent = sanitizeGeneratedContent(result.content);

    // ── Gate 1: Quality validation (instant, deterministic, zero tokens) ──
    const quality = validateArticle(cleanContent, result.title || topic, keywords, opts);
    console.info(`[QualityGate] Score: ${quality.score}/100 | Passed: ${quality.passed} | Words: ${quality.meta.wordCount} | H2: ${quality.meta.h2Count} | Tickers: ${quality.meta.tickerCount}`);
    if (!quality.passed) {
      const errorIssues = quality.issues.filter((i) => i.severity === "error");
      console.warn(`[QualityGate] REJECTED — Issues: ${errorIssues.map((i) => `${i.rule}(${i.severity})`).join(", ")}`);
      throw new ArticleGenerationError(
        `Article rejected by quality gate: ${errorIssues.map((i) => i.message).join("; ")}`
      );
    }

    // ── Gate 2: Dedup check (1 AI call — skip if too similar to recent articles) ──
    const recentTitles = await articleRepository.findRecentTitles(30);
    const dedup = await provider.checkArticleSimilarity(result.title || topic, recentTitles);
    console.info(`[DedupCheck] Similarity: ${dedup.similarityScore}% | Duplicate: ${dedup.isDuplicate}${dedup.similarTo ? ` | Similar to: "${dedup.similarTo.slice(0, 60)}..."` : ""}`);
    if (dedup.isDuplicate) {
      throw new ArticleGenerationError(`Skipped: article too similar (score ${dedup.similarityScore}%) to existing article: "${dedup.similarTo}"`);
    }

    const slug = result.slug || `berita-${topic.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)}`;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) throw new DuplicateSlugError(slug);

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    // Fact-check gate — runs on every publish path. Callers pass marketCtx when
    // they already gathered one (brief/trending); otherwise gather from content
    // tickers. Gate unavailable (gather failed) never blocks publishing.
    let finalContent = cleanContent;
    let finalTitle = resolveTitle(sanitizeGeneratedContent(result.title), cleanContent, topic);
    let factCheckMeta: Record<string, string> = {};
    let factCheckHeld = false;
    const gateCtx = marketCtx ?? await gatherMarketContext(extractTickersFromText(`${topic} ${cleanContent}`)).catch((err) => {
      console.warn("[FactCheckGate] path=news gatherMarketContext failed, gate skipped:", err instanceof Error ? err.message : err);
      return null;
    });
    if (gateCtx) {
      const factCheck = await factCheckArticle(cleanContent, gateCtx, finalTitle);
      const verdict = factCheckVerdict(factCheck);
      if (verdict.applyCorrection) {
        finalContent = sanitizeGeneratedContent(factCheck.correctedContent!);
        if (factCheck.correctedTitle) {
          finalTitle = sanitizeGeneratedContent(factCheck.correctedTitle);
        }
      }
      if (verdict.holdAsDraft) {
        factCheckHeld = true;
        console.warn(`[FactCheckGate] HELD AS DRAFT — fact-check failed with no correction. slug=${slug}`);
      }
      console.info(`[FactCheckGate] path=news claims=${factCheck.meta.claimsChecked} mismatch=${factCheck.mismatches.length} hold=${verdict.holdAsDraft}`);
      factCheckMeta = {
        factCheckPassed: String(factCheck.passed),
        factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
        factCheckErrors: String(factCheck.mismatches.length),
        factCheckCorrected: String(verdict.applyCorrection),
        ...(verdict.holdAsDraft ? { factCheckHeld: "true" } : {}),
      };
    } else {
      factCheckMeta = { factCheckPassed: "skipped_no_ctx" };
    }

    // Gate: fact-check failure with no correction overrides autoPublish — held as DRAFT
    const status = autoPublish && !factCheckHeld ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;
    const article = await articleRepository.create({
      slug,
      title: finalTitle,
      excerpt: sanitizeGeneratedContent(result.excerpt ?? "").slice(0, 500),
      content: finalContent,
      authorId: adminUser.id,
      tags: result.tags.length > 0 ? result.tags : keywords.slice(0, 5),
      status,
      articleType: ArticleType.NEWS,
      aiProvider: provider.name,
      isListed: true,
      generationMeta: { provider: provider.name, topic, keywords, timestamp: new Date().toISOString(), ...factCheckMeta,
        qualityScore: String(quality.score),
        qualityPassed: String(quality.passed),
        qualityWordCount: String(quality.meta.wordCount),
        dedupScore: String(dedup.similarityScore),
        dedupDuplicate: String(dedup.isDuplicate),
      } as Record<string, string | string[]>,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async generateGeneralArticle(topic: string, keywords: string[], trendingAngles?: string[], style?: string, context?: string): Promise<{ id: string; title: string; slug: string }> {
    const { system, user } = buildGeneralPrompt({ topic, keywords, trendingAngles, style, context });

    const provider = createAIProvider();
    const result = await provider.generateArticle(system, user).catch((err) => {
      throw new ArticleGenerationError(err instanceof Error ? err.message : "AI generation failed");
    });
    const cleanContent = sanitizeGeneratedContent(result.content);

    const slug = result.slug || `artikel-${topic.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)}`;

    const existing = await articleRepository.findBySlug(slug);
    if (existing) throw new DuplicateSlugError(slug);

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) throw new ArticleGenerationError("No admin user found");

    // Fact-check only when the article names real tickers AND quotes prices/RSI —
    // pure-concept edu articles have nothing to verify (skip the AI call).
    let finalContent = cleanContent;
    let finalTitle = resolveTitle(sanitizeGeneratedContent(result.title), cleanContent, topic);
    let factCheckMeta: Record<string, string> = {};
    const mentionedTickers = extractTickersFromText(cleanContent);
    if (mentionedTickers.length > 0 && /Rp\s?\d|RSI/i.test(cleanContent)) {
      try {
        const marketCtx = await gatherMarketContext(mentionedTickers);
        const factCheck = await factCheckArticle(cleanContent, marketCtx, finalTitle);
        const verdict = factCheckVerdict(factCheck);
        if (verdict.applyCorrection) {
          finalContent = sanitizeGeneratedContent(factCheck.correctedContent!);
          if (factCheck.correctedTitle) {
            finalTitle = sanitizeGeneratedContent(factCheck.correctedTitle);
          }
        }
        // General articles are always DRAFT — hold just records why it must stay unpublished
        if (verdict.holdAsDraft) {
          console.warn(`[FactCheckGate] HELD AS DRAFT — fact-check failed with no correction. slug=${slug}`);
        }
        console.info(`[FactCheckGate] path=general claims=${factCheck.meta.claimsChecked} mismatch=${factCheck.mismatches.length} hold=${verdict.holdAsDraft}`);
        factCheckMeta = {
          factCheckPassed: String(factCheck.passed),
          factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
          factCheckErrors: String(factCheck.mismatches.length),
          factCheckCorrected: String(verdict.applyCorrection),
          ...(verdict.holdAsDraft ? { factCheckHeld: "true" } : {}),
        };
      } catch (err) {
        // Gate must never kill edu generation — a failed check just leaves the draft unverified
        console.warn("[FactCheckGate] path=general fact-check skipped:", err instanceof Error ? err.message : err);
      }
    }

    const article = await articleRepository.create({
      slug,
      title: finalTitle,
      excerpt: sanitizeGeneratedContent(result.excerpt ?? "").slice(0, 500),
      content: finalContent,
      authorId: adminUser.id,
      tags: result.tags.length > 0 ? result.tags : keywords.slice(0, 5),
      status: ArticleStatus.DRAFT,
      articleType: ArticleType.GENERAL,
      aiProvider: provider.name,
      generationMeta: { provider: provider.name, topic, keywords, style, timestamp: new Date().toISOString(), ...factCheckMeta } as Record<string, string | string[] | undefined>,
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

    const tickers = await articleRepository.findTickersNeedingGeneration(batchSize, IDX40_TICKERS);
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

    const stock = await stockMarketService.findStockByTicker(ticker);
    if (!stock) return null;

    const [prices, indicator, fundamental] = await Promise.all([
      stockMarketService.findLatestPrices(stock.id, 30),
      stockMarketService.findLatestIndicator(stock.id, "1d"),
      stockMarketService.findLatestFundamental(stock.id),
    ]);

    if (!indicator) return null;

    const latest = prices[0];
    if (!latest || latest.date < subDays(new Date(), 7)) return null;

    const week52 = await stockMarketService.getWeek52HighLow(stock.id);
    const close = decimalToNumber(latest.close);
    const prev = prices[1];
    const changePercent = prev
      ? (() => { const p = decimalToNumber(prev.close); return p ? ((close! - p) / p) * 100 : null; })()
      : null;

    // Extract 30-day price history for mini chart (reverse to get chronological order)
    const priceHistory = prices
      .map(p => decimalToNumber(p.close))
      .filter((p): p is number => p !== null)
      .reverse();

    const t = ticker.replace(".JK", "");
    // 2026-09-17: IDX master data ships truncated company names ("Bank Rakyat Indonesia (Persero")
    // which produced broken titles "(Persero (BRIS)". Strip dangling unbalanced suffix before use.
    const cleanStockName = stock.name
      .replace(/\s*\((Perser(?:o)?)\s*$/i, "")   // dangling "(Persero" / "(Perser" at end
      .replace(/\s*\(Persero\)\s*Tbk\.?$/i, "") // full legal suffix — too long for SEO titles
      .trim();
    const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const signalLabelForTitle = indicator.signalLabel ?? "Netral";
    const signalEmoji = signalLabelForTitle.includes("Bullish") ? "🟢" : signalLabelForTitle.includes("Bearish") ? "🔴" : "🟡";
    const priceStr = close !== null ? `Rp${close.toLocaleString("id-ID")}` : "";
    const changeStr = changePercent !== null ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "";
    const title = `Harga Saham ${cleanStockName} (${t}) Hari Ini ${priceStr} ${changeStr} — Analisis & Sinyal ${signalEmoji}`;

    // Compute support/resistance for excerpt
    const bbLower = decimalToNumber(indicator.bbLower);
    const bbUpper = decimalToNumber(indicator.bbUpper);
    const sma50v = decimalToNumber(indicator.sma50);
    const supertrendV = decimalToNumber(indicator.supertrend);
    const w52Low = decimalToNumber(week52._min.low);
    const w52High = decimalToNumber(week52._max.high);
    const supportArr: number[] = [];
    const resistArr: number[] = [];
    if (bbLower !== null) supportArr.push(bbLower);
    if (supertrendV !== null && close !== null && supertrendV < close) supportArr.push(supertrendV);
    if (sma50v !== null && close !== null && sma50v < close) supportArr.push(sma50v);
    if (bbUpper !== null) resistArr.push(bbUpper);
    if (supertrendV !== null && close !== null && supertrendV > close) resistArr.push(supertrendV);
    if (sma50v !== null && close !== null && sma50v > close) resistArr.push(sma50v);
    const supportVal = supportArr.length > 0 ? Math.max(...supportArr) : w52Low;
    const resistanceVal = resistArr.length > 0 ? Math.min(...resistArr) : w52High;

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
      priceHistory,
    });

    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) return null;

    const signalLabel2 = indicator.signalLabel ?? "Netral";
    const fmtPrice = (v: number | null) => v !== null ? `Rp ${v.toLocaleString("id-ID")}` : "N/A";
    const excerpt = `Harga saham ${stock.name} (${t}) hari ini ${date}: ${close !== null ? `Rp ${close.toLocaleString("id-ID")}` : "N/A"} (${changePercent !== null ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "N/A"}). Analisis teknikal ${t}: sinyal ${signalLabel2}, support ${fmtPrice(supportVal)}, resistance ${fmtPrice(resistanceVal)}.`.slice(0, 500);
    const tags = [stock.sector, t, "saham hari ini", "analisis teknikal", `harga saham ${t}`];
    const generationMeta = { provider: "template", date: new Date().toISOString().slice(0, 10) } as Record<string, string>;

    // Evergreen upsert: update if exists, create if not
    const existing = await articleRepository.findBySlug(slug);
    if (existing) {
      await articleRepository.update(existing.id, {
        title,
        excerpt,
        content,
        tags,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
        generationMeta,
      });
      return { id: existing.id, title, slug };
    }

    const article = await articleRepository.create({
      slug, title,
      excerpt,
      content, authorId: adminUser.id,
      tags,
      status: ArticleStatus.PUBLISHED,
      articleType: "DAILY_SNAPSHOT" as ArticleType,
      aiProvider: "template", tickerTag: ticker,
      generationMeta,
      isListed: true,
    });

    return { id: article.id, title: article.title, slug: article.slug };
  },

  async runDailySnapshotGeneration(): Promise<{ generated: number; errors: number; skipped: number }> {
    let generated = 0, errors = 0, skipped = 0;

    for (const ticker of IDX40_TICKERS) {
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

  /**
   * The daily market brief — market-wide NEWS article (tickerTag null) featured
   * on /berita and cross-linked from any stock page whose ticker it mentions
   * (rehype stock linker auto-links tickers at render). One per WIB day.
   */
  async generateDailyBrief(): Promise<{ id: string; title: string; slug: string; skipped?: boolean }> {
    // WIB-day dedupe — never two briefs for the same WIB calendar day (not a
    // rolling 24h window: a brief at 22:00 WIB must not block the next day's
    // 16:10 run, and a 00:30 brief must not double up with a later one).
    const existing = await articleRepository.findLatestDailyBrief().catch(() => null);
    if (existing && wibDayKey(new Date(existing.publishedAt)) === wibDayKey(new Date())) {
      return { id: "", title: existing.title, slug: existing.slug, skipped: true };
    }

    const marketCtx = await gatherMarketContext();
    const sessionDate = marketCtx.latestSessionDate;

    const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    // Label with the data session's date, not the wall clock — a brief generated
    // after midnight WIB still describes the previous close.
    const dateId = (sessionDate ? new Date(sessionDate + "T00:00:00Z") : nowWib)
      .toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

    const todayWibIso = nowWib.toISOString().slice(0, 10);
    const context = [
      ...(sessionDate
        ? [`DATA SESI: tanggal close terbaru database = ${sessionDate} (hari WIB sekarang ${todayWibIso}). Judul dan semua penyebutan tanggal WAJIB mengacu tanggal sesi data tersebut, bukan tanggal kalender.`]
        : []),
      `Tulis BRIEF PASAR HARI INI untuk ${dateId} (pasar IDX).`,
      "Struktur: (1) ringkasan singkat kondisi pasar dan breadth, (2) top movers hari ini dengan alasan teknikalnya,",
      "(3) sinyal teknikal yang menonjol — golden cross / death cross / oversold baru — sebut ticker spesifik,",
      "(4) apa yang perlu dipantau besok.",
      "WAJIB menyebut ticker spesifik (format 4 huruf, mis. BBCA, TLKM) agar ter-link otomatis ke chart sahamnya.",
      "Volume di data dalam SATUAN SAHAM — tulis 'juta saham'/'ribu saham', JANGAN pernah 'lot'.",
      "Gunakan HANYA data pasar pada context yang diberikan — jangan mengarang angka. Ringkas, padat, maksimal 500 kata.",
    ].join(" ");

    const result = await this.generateNewsArticle(
      `Brief Pasar IDX Hari Ini, ${dateId}`,
      ["brief pasar saham", "ringkasan ihsg hari ini", "top mover saham", "sinyal saham hari ini"],
      undefined,
      context,
      true, // autoPublish — brief must be listed immediately
      marketCtx,
      { minWords: 350 }, // briefs are deliberately concise — the 1200-word article gate doesn't apply
    );

    return result;
  },

  async generateTrendingNews(count: number = 10): Promise<{ generated: string[]; articleIds: string[]; errors: string[] }> {
    const generated: string[] = [];
    const articleIds: string[] = [];
    const errors: string[] = [];

    // Gather market context ONCE before topic discovery — so topics are grounded in real data
    const marketCtx = await gatherMarketContext();
    const marketDataString = formatMarketContextForPrompt(marketCtx);

    // ── Pass recent titles to topic discovery so the AI avoids repetition ──
    const recentTitles = await articleRepository.findRecentTitles(15).catch(() => [] as string[]);
    const provider = createAIProvider();
    const topics = await provider.discoverTrendingTopics(marketDataString, recentTitles);

    // ── Diversity filtering: enforce ticker and theme caps ──
    const MAX_PER_TICKER = 1;
    const MAX_PER_THEME = 2;
    const GENERIC_THEMES = ["IHSG", "Rupiah", "Kurs", "Bank", "Perbankan", "Sektor"];

    const tickerCount = new Map<string, number>();
    const themeCount = new Map<string, number>();
    const filtered: typeof topics = [];

    for (const topic of topics) {
      // Extract tickers from topic title (e.g., "TLKM", "BBCA")
      const tickersInTitle = (topic.title.match(/\b[A-Z]{4}\b/g) || []);
      const primaryTicker = tickersInTitle[0];
      if (primaryTicker) {
        const current = tickerCount.get(primaryTicker) || 0;
        if (current >= MAX_PER_TICKER) {
          console.info(`[DiversityFilter] Skipping "${topic.title.slice(0, 50)}..." — ticker ${primaryTicker} already at cap (${current})`);
          continue;
        }
      }

      // Check generic themes (IHSG, Rupiah, banking, etc.)
      const titleUpper = topic.title.toUpperCase();
      let themeBlocked = false;
      for (const theme of GENERIC_THEMES) {
        if (titleUpper.includes(theme.toUpperCase())) {
          const current = themeCount.get(theme) || 0;
          if (current >= MAX_PER_THEME) {
            console.info(`[DiversityFilter] Skipping "${topic.title.slice(0, 50)}..." — theme ${theme} already at cap (${current})`);
            themeBlocked = true;
            break;
          }
        }
      }
      if (themeBlocked) continue;

      // Passed filters — track and add
      if (primaryTicker) tickerCount.set(primaryTicker, (tickerCount.get(primaryTicker) || 0) + 1);
      for (const theme of GENERIC_THEMES) {
        if (titleUpper.includes(theme.toUpperCase())) {
          themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
        }
      }
      filtered.push(topic);
    }

    const selected = filtered.slice(0, count);
    console.info(`[DiversityFilter] ${topics.length} topics → ${filtered.length} after filtering → ${selected.length} selected`);

    for (const topic of selected) {
      try {
        // Gather specific market context for tickers mentioned in this topic
        const mentionedTickers = extractTickersFromText(`${topic.title} ${topic.keywords.join(" ")}`);
        const topicMarketCtx = await gatherMarketContext(mentionedTickers);

        const result = await this.generateNewsArticle(topic.title, topic.keywords, [topic.angle], undefined, true, topicMarketCtx);
        generated.push(result.title);
        articleIds.push(result.id);
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        errors.push(`${topic.title}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    return { generated, articleIds, errors };
  },

  async updateCoverImage(articleId: string, imageUrl: string) {
    return articleRepository.update(articleId, { coverImageUrl: imageUrl } as Parameters<typeof articleRepository.update>[1]);
  },

  // E-E-A-T review queue: lists PUBLISHED articles with no editor sign-off, and
  // records a real human approval (sets reviewedById => "ditinjau oleh" byline).
  listPendingReview() {
    return articleRepository.listPendingReview();
  },

  async approveArticle(articleId: string, editorId: string): Promise<void> {
    await articleRepository.markReviewed(articleId, editorId);
  },
};
