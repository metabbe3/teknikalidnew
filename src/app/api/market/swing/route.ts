import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeSwingStats,
  type SwingStats,
  type SwingRow,
} from "@/domains/stock/swing-backtest.service";
import { signalToHealthScore, healthScoreMeta } from "@/lib/utils";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export interface SwingCandidateItem {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  signalScore: number;
  healthScore: number | null;
  healthMeta: { color: string; bg: string; label: string };
  signalLabel: string | null;
  rsi14: number | null;
  atr: number | null;
  sma50: number | null;
  distanceSma50Pct: number | null;
  estimatedRR: number;
  estimatedStop: number;
  estimatedTarget: number;
}

export interface SwingMarketResponse {
  asOf: string;
  updatedAt: string;
  backtest: {
    stats34: SwingStats;
    stats20: SwingStats;
  };
  candidates: SwingCandidateItem[];
}

interface RawCandidateRow {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  signalScore: number;
  signalLabel: string | null;
  rsi14: number | null;
  atr: number | null;
  sma50: number | null;
  bbUpper: number | null;
}

// ── Cache module-level 15 menit (market-snapshot doctrine) ──
let cachedData: SwingMarketResponse | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

// ── Cache backtest 6 jam (data EOD 24 bulan tidak berubah per menit) ──
interface CachedBacktest {
  asOf: string;
  expiresAt: number;
  stats34: SwingStats;
  stats20: SwingStats;
}
let cachedBacktest: CachedBacktest | null = null;
const BACKTEST_TTL_MS = 6 * 60 * 60 * 1000;

async function getSwingMarketData(): Promise<SwingMarketResponse> {
  const now = Date.now();
  if (cachedData && now < cacheExpiresAt) {
    return cachedData;
  }

  // 1. Ambil tanggal EOD terakhir yang memiliki indikator harian
  const latestDateRow = await prisma.stockIndicator.aggregate({
    _max: { date: true },
    where: { interval: "1d" },
  });
  const latestDate = latestDateRow._max.date;
  if (!latestDate) {
    throw new Error("Tidak ada data EOD pada StockIndicator");
  }

  // 2. Query Top 10 kandidat swing EOD terbaru (skor desc, aktif, non-indeks)
  const candidatesRaw = await prisma.$queryRaw<RawCandidateRow[]>`
    SELECT 
      s.ticker,
      s.name,
      s.sector,
      COALESCE(sp."adjClose", sp.close)::float AS close,
      si."signalScore"::float AS "signalScore",
      si."signalLabel",
      si.rsi14::float AS rsi14,
      si.atr::float AS atr,
      si.sma50::float AS sma50,
      si."bbUpper"::float AS "bbUpper"
    FROM "StockIndicator" si
    JOIN "Stock" s ON s.id = si."stockId"
    LEFT JOIN "StockPrice" sp ON sp."stockId" = si."stockId" AND sp.date = si.date
    WHERE si.date = ${latestDate}
      AND si.interval = '1d'
      AND s."isActive" = true
      AND s."assetClass" = 'EQUITY'
      AND s.ticker NOT LIKE '^%'
      AND si."signalScore" IS NOT NULL
      AND COALESCE(sp."adjClose", sp.close) > 0
    ORDER BY si."signalScore" DESC, COALESCE(sp."volume", 0) DESC
    LIMIT 10;
  `;

  const candidates: SwingCandidateItem[] = candidatesRaw.map((r) => {
    const health = signalToHealthScore(r.signalScore);
    const meta = healthScoreMeta(health ?? 50);

    const distanceSma50Pct =
      r.sma50 && r.sma50 > 0 ? ((r.close - r.sma50) / r.sma50) * 100 : null;

    // Estimasi Stop Loss dari ATR (1.5x ATR, fallback 5% dari harga)
    const risk = r.atr && r.atr > 0 ? 1.5 * r.atr : r.close * 0.05;
    const estimatedStop = Math.max(1, Math.round(r.close - risk));

    // Target Reward: Bollinger Upper atau minimal 2x Risk
    const targetDist =
      r.bbUpper && r.bbUpper > r.close
        ? Math.max(r.bbUpper - r.close, risk * 1.5)
        : risk * 2;
    const estimatedTarget = Math.round(r.close + targetDist);

    const actualRisk = r.close - estimatedStop;
    const actualReward = estimatedTarget - r.close;
    const estimatedRR =
      actualRisk > 0 ? Math.round((actualReward / actualRisk) * 10) / 10 : 2.0;

    return {
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      close: r.close,
      signalScore: r.signalScore,
      healthScore: health,
      healthMeta: meta,
      signalLabel: r.signalLabel,
      rsi14: r.rsi14 !== null ? Math.round(r.rsi14 * 100) / 100 : null,
      atr: r.atr !== null ? Math.round(r.atr * 100) / 100 : null,
      sma50: r.sma50 !== null ? Math.round(r.sma50 * 100) / 100 : null,
      distanceSma50Pct:
        distanceSma50Pct !== null
          ? Math.round(distanceSma50Pct * 100) / 100
          : null,
      estimatedRR,
      estimatedStop,
      estimatedTarget,
    };
  });

  const asOfStr =
    typeof latestDate === "string"
      ? latestDate
      : latestDate.toISOString().slice(0, 10);

  // 3 & 4. Backtest 24 bulan (ambil dari cache jika valid)
  let stats34: SwingStats;
  let stats20: SwingStats;

  if (cachedBacktest && cachedBacktest.asOf === asOfStr && now < cachedBacktest.expiresAt) {
    stats34 = cachedBacktest.stats34;
    stats20 = cachedBacktest.stats20;
  } else {
    const backtestRowsRaw = await prisma.$queryRaw<SwingRow[]>`
      SELECT 
        si."stockId",
        si.date,
        COALESCE(sp."adjClose", sp.close)::float AS close,
        si."signalScore"::float AS "signalScore",
        si."signalLabel"
      FROM "StockIndicator" si
      JOIN "Stock" s ON s.id = si."stockId"
      JOIN "StockPrice" sp ON sp."stockId" = si."stockId" AND sp.date = si.date
      WHERE si.interval = '1d'
        AND s."isActive" = true
        AND s."assetClass" = 'EQUITY'
        AND s.ticker NOT LIKE '^%'
        AND si.date >= NOW() - INTERVAL '24 months'
      ORDER BY si."stockId", si.date ASC
    `;

    stats34 = computeSwingStats(backtestRowsRaw, 0.34);
    stats20 = computeSwingStats(backtestRowsRaw, 0.20);

    cachedBacktest = {
      asOf: asOfStr,
      expiresAt: now + BACKTEST_TTL_MS,
      stats34,
      stats20,
    };
  }

  const responseData: SwingMarketResponse = {
    asOf: asOfStr,
    updatedAt: new Date().toISOString(),
    backtest: {
      stats34,
      stats20,
    },
    candidates,
  };

  cachedData = responseData;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return responseData;
}

export async function GET() {
  try {
    const data = await getSwingMarketData();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "fetch swing market data");
  }
}
