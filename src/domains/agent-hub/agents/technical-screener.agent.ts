import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult, AgentConfigRow } from "../agent-hub.types";
import type { ChainedJobSpec } from "./base-agent";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { communityService } from "@/domains/community/community.service";
import { communityAgentRepository } from "@/domains/community-agent/community-agent.repository";

// ── Types ──────────────────────────────────────────────────

interface ScreenerSetup {
  ticker: string;
  stockName: string;
  close: number;
  changePercent: number;
  signal: string;
  signalLabel: string;
  strength: "strong" | "moderate" | "weak";
  details: string[];
  score: number; // 0-100
}

interface BotUser {
  id: string;
  username: string;
}

// ── Agent ──────────────────────────────────────────────────

export class TechnicalScreenerAgent extends BaseAgent {
  readonly type: AgentType = "technical_screener" as AgentType;
  readonly label = "Technical Screener";

  protected getDefaultSystemPrompt(): string {
    return `Kamu adalah trader teknikal profesional di Bursa Efek Indonesia (IDX).
Tugasmu: menulis community post yang casual, informatif, dan engaging tentang setup teknikal saham.

Gaya:
- Bahasa Indonesia santai, kayak trader ngobrol di group WA
- Singkat padat, 2-4 kalimat per saham
- Pakai emoji yang relevan (📈📉🔥⚡💰)
- Mention ticker dalam format $TICKER
- Jangan pakai markdown bold/italic
- Jangan terlalu formal atau kaku
- Boleh kasih disclaimer singkat di akhir`;
  }

  async execute(_payload: AgentJobPayload): Promise<AgentJobResult> {
    const config = await this.getAgentConfig();
    const maxSetups = (config?.maxSetups as number) ?? 5;
    const minScore = (config?.minScore as number) ?? 50;
    const autoPost = (config?.autoPost as boolean) ?? true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Fetch today's indicators with stock info
    const todayIndicators = await prisma.stockIndicator.findMany({
      where: { date: today, interval: "daily" },
      include: { stock: { select: { ticker: true, name: true, id: true } } },
    });

    if (todayIndicators.length === 0) {
      return { summary: "No indicators available for today", setups: [], posted: false };
    }

    // 2. Fetch yesterday's indicators for crossover detection
    const yesterdayIndicators = await prisma.stockIndicator.findMany({
      where: { date: yesterday, interval: "daily" },
      include: { stock: { select: { ticker: true } } },
    });
    const yesterdayMap = new Map(yesterdayIndicators.map((i) => [i.stockId, i]));

    // 3. Fetch today's prices
    const todayPrices = await prisma.stockPrice.findMany({
      where: { date: today },
      select: { stockId: true, close: true, volume: true, high: true, low: true },
    });
    const priceMap = new Map(todayPrices.map((p) => [p.stockId, p]));

    // 4. Fetch yesterday's prices for change calc
    const yesterdayPrices = await prisma.stockPrice.findMany({
      where: { date: yesterday },
      select: { stockId: true, close: true, volume: true },
    });
    const yesterdayPriceMap = new Map(yesterdayPrices.map((p) => [p.stockId, p]));

    // 5. Fetch 20-day avg volumes for volume spike detection
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 21);
    const volumeRows = await prisma.stockPrice.findMany({
      where: { date: { gte: twentyDaysAgo, lt: today } },
      select: { stockId: true, volume: true },
    });
    const volumeSums = new Map<number, { total: number; count: number }>();
    for (const row of volumeRows) {
      const vol = row.volume;
      if (vol === null || vol === undefined) continue;
      const existing = volumeSums.get(row.stockId) ?? { total: 0, count: 0 };
      existing.total += bigIntToNumber(vol) ?? 0;
      existing.count += 1;
      volumeSums.set(row.stockId, existing);
    }

    // 6. Scan all stocks for setups
    const setups: ScreenerSetup[] = [];

    for (const ind of todayIndicators) {
      const { ticker, name, id: stockId } = ind.stock;
      const price = priceMap.get(stockId);
      const prevPrice = yesterdayPriceMap.get(stockId);
      const prevInd = yesterdayMap.get(stockId);

      if (!price?.close) continue;
      const close = decimalToNumber(price.close) ?? 0;
      const prevClose = prevPrice?.close ? (decimalToNumber(prevPrice.close) ?? close) : close;
      const changePercent = prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : 0;
      const volume = price.volume ? (bigIntToNumber(price.volume) ?? 0) : 0;
      const volInfo = volumeSums.get(stockId);
      const avgVolume = volInfo ? volInfo.total / volInfo.count : volume;
      const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;

      const rsi = ind.rsi14 ? decimalToNumber(ind.rsi14) : null;
      const macdHist = ind.macdHist ? decimalToNumber(ind.macdHist) : null;
      const prevMacdHist = prevInd?.macdHist ? decimalToNumber(prevInd.macdHist) : null;
      const sma20 = ind.sma20 ? decimalToNumber(ind.sma20) : null;
      const sma50 = ind.sma50 ? decimalToNumber(ind.sma50) : null;
      const sma200 = ind.sma200 ? decimalToNumber(ind.sma200) : null;
      const ema12 = ind.ema12 ? decimalToNumber(ind.ema12) : null;
      const ema26 = ind.ema26 ? decimalToNumber(ind.ema26) : null;
      const bbUpper = ind.bbUpper ? decimalToNumber(ind.bbUpper) : null;
      const bbLower = ind.bbLower ? decimalToNumber(ind.bbLower) : null;
      const bbMiddle = ind.bbMiddle ? decimalToNumber(ind.bbMiddle) : null;
      const stochK = ind.stochK ? decimalToNumber(ind.stochK) : null;
      const stochD = ind.stochD ? decimalToNumber(ind.stochD) : null;
      const adx = ind.adx ? decimalToNumber(ind.adx) : null;
      const supertrend = ind.supertrend ? decimalToNumber(ind.supertrend) : null;
      const obvTrend = ind.obvTrend;
      const high = price.high ? decimalToNumber(price.high) ?? close : close;
      const low = price.low ? decimalToNumber(price.low) ?? close : close;
      const smaCrossSignal = ind.smaCrossSignal;

      const details: string[] = [];
      let score = 0;
      let signalLabel = "";
      let signal = "bullish";

      // ── Setup 1: Golden Cross (SMA50 crosses above SMA200) ──
      if (smaCrossSignal === "golden_cross" && sma50 && sma200) {
        score += 85;
        details.push(`Golden Cross: SMA50 (${sma50.toFixed(0)}) cross above SMA200 (${sma200.toFixed(0)})`);
        signalLabel = "Golden Cross";
      }

      // ── Setup 2: Death Cross (bearish, but track it) ──
      if (smaCrossSignal === "death_cross" && sma50 && sma200) {
        score += 70;
        details.push(`Death Cross: SMA50 (${sma50.toFixed(0)}) cross below SMA200 (${sma200.toFixed(0)})`);
        signalLabel = "Death Cross";
        signal = "bearish";
      }

      // ── Setup 3: RSI Oversold Bounce ──
      if (rsi !== null && rsi < 35 && changePercent > 0) {
        const rsiScore = Math.round(80 + (30 - rsi) * 2);
        score += Math.min(rsiScore, 95);
        details.push(`RSI ${rsi.toFixed(1)} (oversold) + harga naik ${changePercent.toFixed(1)}%`);
        if (!signalLabel) signalLabel = "RSI Oversold Bounce";
      }

      // ── Setup 4: MACD Bullish Crossover ──
      if (macdHist !== null && prevMacdHist !== null && prevMacdHist < 0 && macdHist > 0) {
        score += 75;
        details.push(`MACD bullish crossover (histogram ${prevMacdHist.toFixed(2)} → ${macdHist.toFixed(2)})`);
        if (!signalLabel) signalLabel = "MACD Bullish Cross";
      }

      // ── Setup 5: Volume Spike + Price Up ──
      if (volumeRatio >= 2.5 && changePercent > 2) {
        score += 70;
        details.push(`Volume ${volumeRatio.toFixed(1)}x rata-rata + harga naik ${changePercent.toFixed(1)}%`);
        if (!signalLabel) signalLabel = "Volume Spike";
      }

      // ── Setup 6: Breakout above SMA200 ──
      if (sma200 !== null && prevClose < sma200 && close > sma200) {
        score += 72;
        details.push(`Breakout above SMA200 (${sma200.toFixed(0)})`);
        if (!signalLabel) signalLabel = "SMA200 Breakout";
      }

      // ── Setup 7: Bollinger Band Squeeze + Breakout ──
      if (bbUpper !== null && bbLower !== null && bbMiddle !== null) {
        const bbWidth = ((bbUpper - bbLower) / bbMiddle) * 100;
        if (bbWidth < 5 && close > bbMiddle) {
          score += 65;
          details.push(`BB Squeeze (width ${bbWidth.toFixed(1)}%) + breakout above middle`);
          if (!signalLabel) signalLabel = "BB Squeeze Breakout";
        }
        // Price touching lower band + RSI oversold
        if (close <= bbLower * 1.02 && rsi !== null && rsi < 35) {
          score += 70;
          details.push(`Harga di lower BB (${bbLower.toFixed(0)}) + RSI ${rsi.toFixed(1)}`);
          if (!signalLabel) signalLabel = "BB Lower Touch";
        }
      }

      // ── Setup 8: Supertrend Bullish ──
      if (supertrend !== null && close > supertrend && adx !== null && adx > 25) {
        score += 60;
        details.push(`Above Supertrend (${supertrend.toFixed(0)}) + ADX ${adx.toFixed(1)} (trending)`);
        if (!signalLabel) signalLabel = "Supertrend Bullish";
      }

      // ── Setup 9: Stochastic Oversold + Turning Up ──
      if (stochK !== null && stochD !== null && stochK < 25 && stochK > stochD) {
        score += 65;
        details.push(`Stoch %K ${stochK.toFixed(1)}/%D ${stochD.toFixed(1)} (oversold, turning up)`);
        if (!signalLabel) signalLabel = "Stoch Oversold";
      }

      // ── Setup 10: OBV Accumulation ──
      if (obvTrend === "accumulation" && changePercent > 1) {
        score += 55;
        details.push(`OBV accumulation + harga naik ${changePercent.toFixed(1)}%`);
      }

      // ── Bonus: Multiple confirmations ──
      if (details.length >= 3) score = Math.min(score + 10, 100);
      if (details.length >= 2 && volumeRatio >= 2) score = Math.min(score + 5, 100);

      if (score >= minScore && details.length > 0) {
        const strength: ScreenerSetup["strength"] =
          score >= 80 ? "strong" : score >= 65 ? "moderate" : "weak";

        setups.push({
          ticker,
          stockName: name ?? ticker,
          close: close,
          changePercent,
          signal,
          signalLabel: signalLabel || "Multi-Signal",
          strength,
          details,
          score,
        });
      }
    }

    // Sort by score, take top N
    setups.sort((a, b) => b.score - a.score);
    const topSetups = setups.slice(0, maxSetups);

    if (topSetups.length === 0) {
      return { summary: "No significant setups found today", setups: [], posted: false };
    }

    // 7. Generate community post
    let posted = false;
    let postId: string | null = null;

    if (autoPost) {
      try {
        const botUser = await this.ensureBotUser();

        // Dedup: skip if already posted screener today
        const existing = await this.findScreenerPostToday(botUser.id);
        if (existing) {
          return {
            summary: `Screener already posted today`,
            setups: topSetups.map((s) => ({ ticker: s.ticker, signal: s.signalLabel, score: s.score })),
            posted: false,
            reason: "duplicate",
          };
        }

        const content = await this.generatePostContent(topSetups);
        if (!content) {
          return { summary: "AI failed to generate content", setups: topSetups, posted: false };
        }

        const post = await communityService.createPost(botUser.id, {
          content,
        });

        posted = true;
        postId = post.id;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          summary: `Failed to post: ${msg}`,
          setups: topSetups.map((s) => ({ ticker: s.ticker, signal: s.signalLabel, score: s.score })),
          posted: false,
          error: msg,
        };
      }
    }

    return {
      summary: `Found ${setups.length} setups, posted top ${topSetups.length}`,
      setups: topSetups.map((s) => ({
        ticker: s.ticker,
        name: s.stockName,
        close: s.close,
        change: s.changePercent,
        signal: s.signalLabel,
        direction: s.signal,
        strength: s.strength,
        score: s.score,
        details: s.details,
      })),
      posted,
      postId,
    };
  }

  // ── Helpers ────────────────────────────────────────────────

  private async ensureBotUser(): Promise<BotUser> {
    const botEmail = "bot+robo@teknikalid.id";
    let user = await prisma.user.findFirst({ where: { email: botEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: botEmail,
          username: "teknikal_robo",
          name: "Teknikal Robo",
          role: "ADMIN",
          emailVerified: new Date(),
        },
      });
    }
    return { id: user.id, username: user.username };
  }

  private async findScreenerPostToday(botUserId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const posts = await prisma.post.findMany({
      where: {
        authorId: botUserId,
        createdAt: { gte: today, lt: tomorrow },
        content: { contains: "Screener Teknikal" },
      },
      take: 1,
    });
    return posts.length > 0;
  }

  private async generatePostContent(setups: ScreenerSetup[]): Promise<string | null> {
    const setupsText = setups
      .map((s) => {
        const emoji = s.signal === "bullish" ? "🟢" : "🔴";
        const changeEmoji = s.changePercent >= 0 ? "📈" : "📉";
        return `${emoji} $${s.ticker} — ${s.signalLabel}
   Harga: ${s.close.toLocaleString("id-ID")} (${changeEmoji} ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(1)}%)
   Score: ${s.score}/100 | ${s.details.join(" | ")}`;
      })
      .join("\n\n");

    const bullishCount = setups.filter((s) => s.signal === "bullish").length;
    const bearishCount = setups.filter((s) => s.signal === "bearish").length;

    const userPrompt = `Buat community post untuk TeknikalID tentang hasil screener teknikal hari ini.

SETUP YANG TERDETEKSI:
${setupsText}

RINGKASAN: ${setups.length} setup terdeteksi (${bullishCount} bullish, ${bearishCount} bearish)

ATURAN:
- Tulis opening 1 kalimat tentang market hari ini
- Lalu list setup satu per satu, singkat (1-2 kalimat per saham)
- Format: "$TICKER — [jelaskan setup dengan bahasa santai trader]"
- Di akhir kasih 1 kalimat disclaimer
- Total max 800 karakter
- Jangan pakai markdown bold/italic
- Jangan pakai heading`;

    try {
      const systemPrompt = await this.getSystemPrompt();
      const content = await this.callAI(systemPrompt, userPrompt, 1000);
      return content.trim();
    } catch (error) {
      console.error("[TechnicalScreener] AI generation failed:", error);
      return null;
    }
  }
}
