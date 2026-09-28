import { subDays } from "date-fns";
import { ArticleType, ArticleStatus } from "@/generated/prisma/client";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { articleRepository } from "./article.repository";
import { aiChat } from "@/lib/ai-client";
import { gatherMarketContext, formatMarketContextForPrompt } from "./article-fact-check";
import type { MarketContext } from "./article-fact-check";

// ── Types ──

interface StockMover {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  prevClose: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume5d: number | null;
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  adx: number | null;
  supertrend: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  signalLabel: string | null;
  signalScore: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  eps: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  isGorengan: boolean | null;
}

interface MovementResult {
  ticker: string;
  direction: "naik" | "turun";
  slug: string;
  title: string;
  articleId: string;
}

interface BatchResult {
  generated: MovementResult[];
  skipped: string[];
  errors: { ticker: string; error: string }[];
}

// ── Constants ──

const MIN_CHANGE_PERCENT = 3.0;
const MAX_MOVERS_PER_RUN = 50;

// ── Helpers ──

function price(val: number | null): string {
  if (val === null) return "N/A";
  return `Rp ${val.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(val: number | null): string {
  if (val === null) return "N/A";
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

function fmtVol(val: number | null): string {
  if (val === null) return "N/A";
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)} miliar saham`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)} juta saham`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)} ribu saham`;
  return `${val} saham`;
}

function fmtMC(val: number | null): string {
  if (val === null) return "N/A";
  if (val >= 1e12) return `Rp ${(val / 1e12).toFixed(2)} Triliun`;
  if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(1)} Miliar`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

function volRatio(current: number | null, avg: number | null): string {
  if (current === null || avg === null || avg === 0) return "N/A";
  const ratio = current / avg;
  return `${ratio.toFixed(2)}x rata-rata`;
}

// ── Step 1: Find top movers via SQL ──

async function findTopMovers(): Promise<StockMover[]> {
  const { prisma } = await import("@/lib/prisma");

  const yesterday = subDays(new Date(), 1);

  // Find stocks where today's close vs yesterday's close moved >3%
  const movers = await prisma.$queryRaw<StockMover[]>`
    WITH latest_prices AS (
      SELECT DISTINCT ON (sp."stockId")
        sp."stockId",
        sp.close,
        sp.volume,
        sp.high,
        sp.low,
        sp.open,
        sp.date
      FROM "StockPrice" sp
      WHERE sp.date >= ${subDays(new Date(), 7)}
      ORDER BY sp."stockId", sp.date DESC
    ),
    prev_prices AS (
      SELECT DISTINCT ON (sp."stockId")
        sp."stockId",
        sp.close AS prev_close
      FROM "StockPrice" sp
      WHERE sp.date >= ${subDays(new Date(), 10)}
        AND sp.date < ${yesterday}
      ORDER BY sp."stockId", sp.date DESC
    ),
    avg_volumes AS (
      SELECT
        sp."stockId",
        AVG(sp.volume)::float8 AS avg_volume_5d
      FROM "StockPrice" sp
      WHERE sp.date >= ${subDays(new Date(), 7)}
      GROUP BY sp."stockId"
    )
    SELECT
      s.ticker,
      s.name,
      s.sector,
      lp.close::float8 AS "close",
      pp.prev_close::float8 AS "prevClose",
      CASE WHEN pp.prev_close IS NOT NULL AND pp.prev_close > 0
        THEN ((lp.close - pp.prev_close) / pp.prev_close * 100)::float8
        ELSE NULL END AS "changePercent",
      lp.volume::float8 AS "volume",
      av.avg_volume_5d AS "avgVolume5d",
      si."rsi14"::float8 AS "rsi14",
      si."macdHist"::float8 AS "macdHist",
      si."sma20"::float8 AS "sma20",
      si."sma50"::float8 AS "sma50",
      si."sma200"::float8 AS "sma200",
      si."adx"::float8 AS "adx",
      si."supertrend"::float8 AS "supertrend",
      si."bbUpper"::float8 AS "bbUpper",
      si."bbLower"::float8 AS "bbLower",
      si."signalLabel" AS "signalLabel",
      si."signalScore"::float8 AS "signalScore",
      si."isGorengan" AS "isGorengan",
      lp.high::float8 AS "high",
      lp.low::float8 AS "low",
      lp.open::float8 AS "open",
      f."pe"::float8 AS "pe",
      f."pb"::float8 AS "pb",
      f."marketCap"::float8 AS "marketCap",
      f."eps"::float8 AS "eps",
      f."dividendYield"::float8 AS "dividendYield"
    FROM latest_prices lp
    JOIN "Stock" s ON s.id = lp."stockId"
    LEFT JOIN prev_prices pp ON pp."stockId" = lp."stockId"
    LEFT JOIN avg_volumes av ON av."stockId" = lp."stockId"
    LEFT JOIN LATERAL (
      SELECT * FROM "StockIndicator" si2
      WHERE si2."stockId" = lp."stockId" AND si2.interval = '1d'
      ORDER BY si2.date DESC LIMIT 1
    ) si ON true
    LEFT JOIN LATERAL (
      SELECT * FROM "StockFundamental" sf2
      WHERE sf2."stockId" = lp."stockId"
      ORDER BY sf2.date DESC LIMIT 1
    ) f ON true
    WHERE pp.prev_close IS NOT NULL
      AND pp.prev_close > 0
      AND ABS((lp.close - pp.prev_close) / pp.prev_close * 100) >= ${MIN_CHANGE_PERCENT}
      AND s.ticker != '^JKSE'
    ORDER BY ABS((lp.close - pp.prev_close) / pp.prev_close * 100) DESC
    LIMIT ${MAX_MOVERS_PER_RUN}
  `;

  // Enrich with 52-week high/low
  const enriched: StockMover[] = [];
  for (const m of movers) {
    const stock = await stockMarketService.findStockByTicker(m.ticker);
    if (stock) {
      const week52 = await stockMarketService.getWeek52HighLow(stock.id);
      enriched.push({
        ...m,
        week52High: decimalToNumber(week52._max.high),
        week52Low: decimalToNumber(week52._min.low),
      });
    } else {
      enriched.push({ ...m, week52High: null, week52Low: null });
    }
  }

  return enriched;
}

// ── Step 2: Build the AI prompt with real DB data ──

function buildMovementPrompt(
  mover: StockMover,
  marketContextStr: string,
): { system: string; user: string } {
  const t = mover.ticker.replace(".JK", "");
  const direction = (mover.changePercent ?? 0) >= 0 ? "naik" : "turun";
  const changeStr = pct(mover.changePercent);

  const system = `Anda adalah analis pasar saham Indonesia yang menulis untuk TeknikalID, platform analisa saham IDX.

TUGAS: Tulis artikel SEO berjudul "Kenapa Saham ${t} ${direction === "naik" ? "Naik" : "Turun"} Hari Ini?" yang menjelaskan alasan pergerakan harga saham.

ATURAN KRITIS:
1. GUNAKAN HANYA data yang diberikan di bawah. JANGAN PERnah mengarang angka, harga, atau persentase.
2. Artikel harus 400-600 kata, dalam Bahasa Indonesia yang natural dan profesional.
3. Struktur: judul H2, paragraf pembuka dengan jawaban cepat, 3-5 alasan utama (dengan H3), analisis teknikal singkat, dan kesimpulan.
4. Target keyword utama: "kenapa saham ${t} ${direction} hari ini"
5. Target keyword sekunder: "harga saham ${t} hari ini", "analisa saham ${t}", "saham ${t} ${direction}"
6. Sertakan disclaimer di akhir bahwa ini bukan rekomendasi jual/beli.
7. JANGAN gunakan markdown table. Gunakan paragraf dan bullet points.`;

  const user = `## DATA SAHAM ${t} HARI INI (WAJIB GUNAKAN DATA INI, JANGAN MEMBUAT ANGKA SENDIRI)

**Saham:** ${mover.name} (${t})
**Sektor:** ${mover.sector}
**Harga penutupan:** ${price(mover.close)}
**Perubahan:** ${changeStr}
**Harga kemarin:** ${price(mover.prevClose)}
**Harga tertinggi hari ini:** ${price(mover.high)}
**Harga terendah hari ini:** ${price(mover.low)}
**Harga pembukaan:** ${price(mover.open)}
**Volume:** ${fmtVol(mover.volume)}
**Volume vs rata-rata 5 hari:** ${volRatio(mover.volume, mover.avgVolume5d)}
**Range 52 minggu:** ${price(mover.week52Low)} - ${price(mover.week52High)}

### Indikator Teknikal
- **RSI (14):** ${mover.rsi14 !== null ? mover.rsi14.toFixed(1) : "N/A"} ${mover.rsi14 !== null ? (mover.rsi14 > 70 ? "(Overbought)" : mover.rsi14 < 30 ? "(Oversold)" : "(Normal)") : ""}
- **MACD Histogram:** ${mover.macdHist !== null ? mover.macdHist.toFixed(2) : "N/A"} ${mover.macdHist !== null ? (mover.macdHist > 0 ? "(Bullish)" : "(Bearish)") : ""}
- **ADX:** ${mover.adx !== null ? mover.adx.toFixed(1) : "N/A"} ${mover.adx !== null ? (mover.adx > 25 ? "(Tren aktif)" : "(Sideways)") : ""}
- **SMA 20:** ${price(mover.sma20)}
- **SMA 50:** ${price(mover.sma50)}
- **SMA 200:** ${price(mover.sma200)}
- **Supertrend:** ${price(mover.supertrend)} ${mover.close !== null && mover.supertrend !== null ? (mover.close > mover.supertrend ? "(Sinyal beli)" : "(Sinyal jual)") : ""}
- **Bollinger Bands:** ${price(mover.bbLower)} - ${price(mover.bbUpper)}
- **Sinyal agregat:** ${mover.signalLabel ?? "Netral"} (skor: ${mover.signalScore !== null ? mover.signalScore.toFixed(2) : "N/A"})

### Fundamental
- **P/E Ratio:** ${mover.pe !== null ? mover.pe.toFixed(1) + "x" : "N/A"}
- **Price/Book:** ${mover.pb !== null ? mover.pb.toFixed(2) + "x" : "N/A"}
- **EPS:** ${price(mover.eps)}
- **Market Cap:** ${fmtMC(mover.marketCap)}
- **Dividen Yield:** ${mover.dividendYield !== null ? mover.dividendYield.toFixed(2) + "%" : "N/A"}

### Karakteristik Saham
- **Gorengan:** ${mover.isGorengan ? "Ya — pergerakan bisa tidak fundamental" : "Tidak"}

${marketContextStr}

## INSTRUKSI PENULISAN

Tulis artikel dengan struktur berikut:

## Kenapa Saham ${t} ${direction === "naik" ? "Naik" : "Turun"} Hari Ini? (${changeStr})

[Jawaban cepat dalam 2-3 kalimat di paragraf pertama — langsung menjawab "kenapa"]

### [Alasan 1 — misal: Momentum Teknikal / Volume / Indikator]
[Penjelasan dengan data di atas]

### [Alasan 2 — misal: Fundamental / Sentimen Sektor / Tren Pasar]
[Penjelasan dengan data di atas]

### [Alasan 3 — misal: Level Teknikal / Breakout / Support-Resistance]
[Penjelasan dengan data di atas]

### [Alasan tambahan jika relevan]

### Apa yang Perlu Diawasi Selanjutnya
[Outlook jangka pendek berdasarkan level support/resistance dan indikator]

:::warning[Disclaimer]
Artikel ini disusun untuk tujuan edukasi dan informasi semata, bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca.
:::

:::cta[Pantau ${t} Real-time]
Lihat pergerakan harga ${mover.name} secara real-time lengkap dengan chart interaktif dan indikator teknikal di halaman saham ${t} di TeknikalID.
:::
`;

  return { system, user };
}

// ── Step 3: Generate movement analysis for a single stock ──

async function generateForStock(mover: StockMover, marketContextStr: string): Promise<MovementResult> {
  const t = mover.ticker.replace(".JK", "");
  const direction = (mover.changePercent ?? 0) >= 0 ? "naik" : "turun";
  const changeStr = pct(mover.changePercent);

  // Evergreen slug — update same article each day
  const slug = `kenapa-saham-${t.toLowerCase()}-${direction}-hari-ini`;

  // Check if we already generated today
  const existing = await articleRepository.findBySlug(slug);
  const today = new Date().toISOString().slice(0, 10);
  if (existing && existing.publishedAt && existing.publishedAt.toISOString().slice(0, 10) === today) {
    throw new Error(`Already generated for ${t} today`);
  }

  const { system, user } = buildMovementPrompt(mover, marketContextStr);

  console.info(`[MovementAnalysis] Generating for ${t} (${changeStr})...`);

  const content = await aiChat(system, user, 2000);

  if (!content || content.length < 200) {
    throw new Error(`AI returned too-short content for ${t} (${content.length} chars)`);
  }

  // Build title with the % change for high CTR
  const directionCapitalized = direction === "naik" ? "Naik" : "Turun";
  const title = `Kenapa Saham ${t} ${directionCapitalized} Hari Ini? (${changeStr}) — ${mover.name}`;

  // Build excerpt
  const excerpt = `${mover.name} (${t}) ${direction} ${changeStr} ke ${price(mover.close)}. Analisis lengkap alasan pergerakan harga, indikator teknikal, dan fundamental saham ${t} hari ini.`;

  // Upsert: update existing article or create new
  if (existing) {
    const updated = await articleRepository.update(existing.id, {
      title,
      excerpt,
      content,
    });
    return {
      ticker: mover.ticker,
      direction: direction as "naik" | "turun",
      slug,
      title,
      articleId: updated.id,
    };
  }

  const adminUser = await articleRepository.findAdminUserId();
  if (!adminUser) throw new Error("No admin user found");

  const article = await articleRepository.create({
    slug,
    title,
    excerpt,
    content,
    authorId: adminUser.id,
    articleType: ArticleType.MOVEMENT_ANALYSIS,
    status: ArticleStatus.PUBLISHED,
    tickerTag: mover.ticker,
    tags: [t, direction, mover.sector, "analisa-saham", "pergerakan-harga"],
    aiProvider: process.env.ANTHROPIC_MODEL || "qd/qmodel_latest",
  });

  return {
    ticker: mover.ticker,
    direction: direction as "naik" | "turun",
    slug,
    title,
    articleId: article.id,
  };
}

// ── Main exported service ──

export const movementAnalysisService = {
  /**
   * Scan all stocks for >3% movers, generate AI movement analysis for each.
   * Called by the gen_movement_analysis agent after daily snapshot generation.
   */
  async runBatchGeneration(maxStocks?: number): Promise<BatchResult> {
    console.info("[MovementAnalysis] Scanning for top movers...");

    const movers = await findTopMovers();

    if (movers.length === 0) {
      console.info("[MovementAnalysis] No stocks moved >3% today. Skipping.");
      return { generated: [], skipped: [], errors: [] };
    }

    console.info(`[MovementAnalysis] Found ${movers.length} movers >${MIN_CHANGE_PERCENT}%`);

    // Limit if specified
    const stocks = maxStocks ? movers.slice(0, maxStocks) : movers;

    // Gather market context once (IHSG, sector trends)
    const marketCtx = await gatherMarketContext();
    const marketContextStr = formatMarketContextForPrompt(marketCtx);

    const generated: MovementResult[] = [];
    const skipped: string[] = [];
    const errors: { ticker: string; error: string }[] = [];

    for (const mover of stocks) {
      const t = mover.ticker.replace(".JK", "");
      try {
        const result = await generateForStock(mover, marketContextStr);
        generated.push(result);
        console.info(`[MovementAnalysis] ✅ ${t} (${pct(mover.changePercent)}) → ${result.slug}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Already generated")) {
          skipped.push(t);
        } else {
          errors.push({ ticker: t, error: msg });
          console.error(`[MovementAnalysis] ❌ ${t}: ${msg}`);
        }
      }
    }

    console.info(
      `[MovementAnalysis] Done: ${generated.length} generated, ${skipped.length} skipped (already done today), ${errors.length} errors`,
    );

    return { generated, skipped, errors };
  },

  /**
   * Generate movement analysis for a single ticker (manual trigger).
   */
  async generateSingle(ticker: string): Promise<MovementResult> {
    const t = ticker.endsWith(".JK") ? ticker : `${ticker}.JK`;
    const stock = await stockMarketService.findStockByTicker(t);
    if (!stock) throw new Error(`Stock ${t} not found`);

    const [prices, indicator, fundamental] = await Promise.all([
      stockMarketService.findLatestPrices(stock.id, 10),
      stockMarketService.findLatestIndicator(stock.id, "1d"),
      stockMarketService.findLatestFundamental(stock.id),
    ]);

    if (!indicator) throw new Error(`No indicator data for ${t}`);

    const latest = prices[0];
    const prev = prices[1];
    if (!latest || !prev) throw new Error(`Insufficient price data for ${t}`);

    const close = decimalToNumber(latest.close);
    const prevClose = decimalToNumber(prev.close);
    const changePercent = close !== null && prevClose !== null && prevClose !== 0
      ? ((close - prevClose) / prevClose) * 100
      : null;

    // Calculate 5d avg volume
    const volumes = prices.map(p => bigIntToNumber(p.volume)).filter((v): v is number => v !== null);
    const avgVolume5d = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;

    const week52 = await stockMarketService.getWeek52HighLow(stock.id);

    const mover: StockMover = {
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      close,
      prevClose,
      changePercent,
      volume: bigIntToNumber(latest.volume),
      avgVolume5d,
      rsi14: decimalToNumber(indicator.rsi14),
      macdHist: decimalToNumber(indicator.macdHist),
      sma20: decimalToNumber(indicator.sma20),
      sma50: decimalToNumber(indicator.sma50),
      sma200: decimalToNumber(indicator.sma200),
      adx: decimalToNumber(indicator.adx),
      supertrend: decimalToNumber(indicator.supertrend),
      bbUpper: decimalToNumber(indicator.bbUpper),
      bbLower: decimalToNumber(indicator.bbLower),
      signalLabel: indicator.signalLabel,
      signalScore: decimalToNumber(indicator.signalScore),
      isGorengan: indicator.isGorengan,
      high: decimalToNumber(latest.high),
      low: decimalToNumber(latest.low),
      open: decimalToNumber(latest.open),
      pe: fundamental ? decimalToNumber(fundamental.pe) : null,
      pb: fundamental ? decimalToNumber(fundamental.pb) : null,
      marketCap: fundamental ? bigIntToNumber(fundamental.marketCap) : null,
      eps: fundamental ? decimalToNumber(fundamental.eps) : null,
      dividendYield: fundamental ? decimalToNumber(fundamental.dividendYield) : null,
      week52High: decimalToNumber(week52._max.high),
      week52Low: decimalToNumber(week52._min.low),
    };

    const marketCtx = await gatherMarketContext([t]);
    const marketContextStr = formatMarketContextForPrompt(marketCtx);

    return generateForStock(mover, marketContextStr);
  },
};
