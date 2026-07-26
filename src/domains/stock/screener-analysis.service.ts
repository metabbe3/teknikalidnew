import { computeChange, decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { calculatePivotPoints } from "@/lib/indicators";
import { stockRepository } from "./stock.repository";
import { buildIndicatorWhere, VOLUME_SPIKE_MULTIPLIER, VALID_PRESETS } from "./indicator.service";

export const screenerAnalysisService = {
  async screenerQuery(preset: string, assetClass: "EQUITY" | "CRYPTO" = "EQUITY") {
    if (!VALID_PRESETS.has(preset)) return { error: "Invalid preset" };

    const latestDateRow = await stockRepository.getLatestIndicatorDate(assetClass);
    if (!latestDateRow) return [];
    const latestDate = latestDateRow.date;

    if (preset === "volume_spike") {
      const rows = await stockRepository.findVolumeSpikes(latestDate, VOLUME_SPIKE_MULTIPLIER, assetClass);
      return rows.map((r) => ({
        ticker: r.ticker, name: r.name, sector: r.sector,
        close: Number(r.close),
        changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
        volume: Number(r.volume),
        rsi14: r.rsi14 ? Number(r.rsi14) : null,
        sma20: r.sma20 ? Number(r.sma20) : null,
        signalScore: null as number | null,
        signalLabel: null as string | null,
      }));
    }

    if (preset === "volume_spike_low") {
      const rows = await stockRepository.findVolumeSpikes(latestDate, VOLUME_SPIKE_MULTIPLIER, assetClass);
      return rows
        .filter((r) => {
          const changePct = r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) : 0;
          return changePct < 0;
        })
        .map((r) => ({
          ticker: r.ticker, name: r.name, sector: r.sector,
          close: Number(r.close),
          changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
          volume: Number(r.volume),
          rsi14: r.rsi14 ? Number(r.rsi14) : null,
          sma20: r.sma20 ? Number(r.sma20) : null,
          signalScore: null as number | null,
          signalLabel: null as string | null,
        }));
    }

    if (preset === "hype_alert") {
      const rows = await stockRepository.findHypeAlerts(latestDate, assetClass);
      return rows
        .filter((r) => {
          const vol = Number(r.volume);
          const avgVol = Number(r.avg_volume);
          const volRatio = avgVol > 0 ? vol / avgVol : 0;
          const changePct = r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) : 0;
          return volRatio >= 2 && changePct > 0.05;
        })
        .map((r) => ({
          ticker: r.ticker, name: r.name, sector: r.sector,
          close: Number(r.close),
          changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
          volume: Number(r.volume),
          rsi14: r.rsi14 ? Number(r.rsi14) : null,
          signalScore: null as number | null,
          signalLabel: null as string | null,
        }));
    }

    const FUNDAMENTAL_PRESETS = new Set(["undervalued", "high_dividend", "blue_chip", "value_growth"]);
    if (FUNDAMENTAL_PRESETS.has(preset)) {
      const queryMap: Record<string, (d: Date) => Promise<unknown[]>> = {
        undervalued: (d) => stockRepository.findUndervalued(d),
        high_dividend: (d) => stockRepository.findHighDividend(d),
        blue_chip: (d) => stockRepository.findBlueChip(d),
        value_growth: (d) => stockRepository.findValueGrowth(d),
      };
      const rows = await queryMap[preset]!(latestDate);
      return (rows as { ticker: string; name: string; sector: string; close: number; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[]).map((r) => ({
        ticker: r.ticker, name: r.name, sector: r.sector,
        close: Number(r.close),
        pe: r.pe, pb: r.pb, eps: r.eps,
        dividendYield: r.dividendYield,
        marketCap: bigIntToNumber(r.marketCap),
        signalScore: null as number | null,
        signalLabel: null as string | null,
      }));
    }

    const where = buildIndicatorWhere(preset as any, latestDate, assetClass);
    const results = await stockRepository.findIndicatorsByDate(latestDate, where);

    let stocks = results.map((r) => {
      const prices = r.stock.prices;
      const { close, changePercent } = computeChange(prices[0], prices[1]);
      return {
        ticker: r.stock.ticker, name: r.stock.name, sector: r.stock.sector,
        close, changePercent,
        volume: prices[0] ? bigIntToNumber(prices[0].volume) : null,
        rsi14: decimalToNumber(r.rsi14),
        sma20: decimalToNumber(r.sma20),
        smaCrossSignal: r.smaCrossSignal,
        emaCrossSignal: r.emaCrossSignal,
        sma200: decimalToNumber(r.sma200),
        signalScore: decimalToNumber(r.signalScore),
        signalLabel: r.signalLabel ?? null,
      };
    });

    const indicatorMap = new Map(results.map((r) => [r.stock.ticker, r]));

    if (preset === "above_sma200") {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close > s.sma200);
    } else if (preset === "below_sma200") {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close < s.sma200);
    } else if (preset === "bb_squeeze") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si) return false;
        const upper = decimalToNumber(si.bbUpper);
        const lower = decimalToNumber(si.bbLower);
        const middle = decimalToNumber(si.bbMiddle);
        return upper !== null && lower !== null && middle !== null && middle > 0 && (upper - lower) / middle < 0.05;
      });
    } else if (preset === "supertrend_bullish") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const st = decimalToNumber(si.supertrend);
        return st !== null && s.close > st;
      });
    } else if (preset === "supertrend_bearish") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const st = decimalToNumber(si.supertrend);
        return st !== null && s.close < st;
      });
    } else if (preset === "bb_lower_touch") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const lower = decimalToNumber(si.bbLower);
        return lower !== null && s.close <= lower * 1.02;
      });
    } else if (preset === "pullback_sma20") {
      stocks = stocks.filter((s) => {
        if (!s.close || !s.sma20) return false;
        const pctFromSma20 = ((s.close - s.sma20) / s.sma20) * 100;
        return pctFromSma20 >= -3 && pctFromSma20 <= 3;
      });
    } else if (preset === "ema_cross") {
      stocks = stocks.filter((s) => s.emaCrossSignal === "bullish");
    } else if (preset === "stoch_overbought_breakout") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const adx = decimalToNumber(si.adx);
        return adx !== null && adx > 20;
      });
    }

    return stocks;
  },

  async getBottomFishingRadar(assetClass?: "EQUITY" | "CRYPTO"): Promise<{
    ticker: string;
    name: string;
    sector: string;
    close: number | null;
    changePercent: number | null;
    rsi14: number | null;
    stochK: number | null;
    stochD: number | null;
    support1: number | null;
    isDeepOversold: boolean;
    hasVolumeSpike: boolean;
    upsideToSma20: number | null;
  }[]> {
    const stocks = await stockRepository.findOversoldStocks(assetClass);

    // Intermediate type carrying stockId for avg volume lookup
    type Intermediate = {
      stockId: number;
      ticker: string;
      name: string;
      sector: string;
      close: number | null;
      changePercent: number | null;
      rsi14: number | null;
      stochK: number | null;
      stochD: number | null;
      support1: number | null;
      isDeepOversold: boolean;
      currentVolume: number | null;
      sma20: number | null;
    };

    const filtered = stocks
      .map((s): Intermediate | null => {
        const prices = s.prices;
        const latest = prices[0];
        const prev = prices[1];
        const indicator = s.indicators?.[0];
        if (!latest || !indicator) return null;

        const rsi14 = decimalToNumber(indicator.rsi14);
        const stochK = decimalToNumber(indicator.stochK);
        const stochD = decimalToNumber(indicator.stochD);

        const isRsiOversold = rsi14 !== null && rsi14 <= 30;
        const isStochOversold = stochK !== null && stochD !== null && stochK <= 20 && stochD <= 20;

        if (!isRsiOversold && !isStochOversold) return null;

        const { close, changePercent } = computeChange(latest, prev);

        // Exclude gocap stocks (price ≤ 50)
        if (close !== null && close <= 50) return null;

        // Calculate S1 support
        const high = decimalToNumber(latest.high);
        const low = decimalToNumber(latest.low);
        let support1: number | null = null;
        if (close !== null && high !== null && low !== null) {
          support1 = calculatePivotPoints(high, low, close).s1;
        }

        return {
          stockId: s.id,
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          close,
          changePercent,
          rsi14,
          stochK,
          stochD,
          support1,
          isDeepOversold: isRsiOversold && isStochOversold,
          currentVolume: bigIntToNumber(latest.volume),
          sma20: decimalToNumber(indicator.sma20),
        };
      })
      .filter((r): r is Intermediate => r !== null);

    // Fetch 20-day average volumes for filtered stocks
    const stockIds = filtered.map((r) => r.stockId);
    const avgVolMap = await stockRepository.findAvgVolumeByStockIds(stockIds);

    const results = filtered.map((r) => {
      const avgVolume = avgVolMap.get(r.stockId);
      const volumeRatio = (r.currentVolume && avgVolume && avgVolume > 0) ? r.currentVolume / avgVolume : null;
      const hasVolumeSpike = volumeRatio !== null && volumeRatio >= 1.5;

      const upsideToSma20 = (r.close && r.sma20 && r.close < r.sma20)
        ? Math.round(((r.sma20 - r.close) / r.close) * 10000) / 100
        : null;

      return {
        ticker: r.ticker,
        name: r.name,
        sector: r.sector,
        close: r.close,
        changePercent: r.changePercent,
        rsi14: r.rsi14,
        stochK: r.stochK,
        stochD: r.stochD,
        support1: r.support1,
        isDeepOversold: r.isDeepOversold,
        hasVolumeSpike,
        upsideToSma20,
      };
    });

    // Sort: deep oversold + volume spike first, then by RSI ascending
    results.sort((a, b) => {
      const aScore = (a.isDeepOversold && a.hasVolumeSpike ? 0 : 1);
      const bScore = (b.isDeepOversold && b.hasVolumeSpike ? 0 : 1);
      if (aScore !== bScore) return aScore - bScore;
      if (a.rsi14 === null && b.rsi14 === null) return 0;
      if (a.rsi14 === null) return 1;
      if (b.rsi14 === null) return -1;
      return a.rsi14 - b.rsi14;
    });

    return results;
  },

  async customScreenerQuery(filters: {
    rsiMin?: number; rsiMax?: number;
    volumeMinMultiplier?: number;
    aboveSma200?: boolean; belowSma200?: boolean;
    macdBullish?: boolean;
    stochKMin?: number; stochKMax?: number;
    adxMin?: number;
    bbSqueeze?: boolean;
    signalScoreMin?: number; signalScoreMax?: number;
    sector?: string[];
    priceMin?: number; priceMax?: number;
    excludeGorengan?: boolean;
    sortBy?: string;
    sortOrder?: string;
    assetClass?: "EQUITY" | "CRYPTO";
  }) {
    const latestDateRow = await stockRepository.getLatestIndicatorDate(filters.assetClass);
    if (!latestDateRow) return [];

    const latestDate = latestDateRow.date;
    const stockWhere: Record<string, unknown> = { isActive: true, assetClass: filters.assetClass ?? "EQUITY" };
    if (filters.sector && filters.sector.length > 0) {
      stockWhere.sector = { in: filters.sector };
    }

    const base = { interval: "1d" as const, date: latestDate, stock: stockWhere };

    // Build dynamic where clause
    const where: Record<string, unknown> = { ...base };
    const indicatorConditions: Record<string, unknown> = {};

    if (filters.rsiMin !== undefined || filters.rsiMax !== undefined) {
      const rsi: Record<string, number> = {};
      if (filters.rsiMin !== undefined) rsi.gte = filters.rsiMin;
      if (filters.rsiMax !== undefined) rsi.lte = filters.rsiMax;
      indicatorConditions.rsi14 = Object.keys(rsi).length > 0 ? rsi : undefined;
    }
    if (filters.stochKMin !== undefined || filters.stochKMax !== undefined) {
      const stoch: Record<string, number> = {};
      if (filters.stochKMin !== undefined) stoch.gte = filters.stochKMin;
      if (filters.stochKMax !== undefined) stoch.lte = filters.stochKMax;
      indicatorConditions.stochK = Object.keys(stoch).length > 0 ? stoch : undefined;
    }
    if (filters.adxMin !== undefined) {
      indicatorConditions.adx = { gte: filters.adxMin };
    }
    if (filters.macdBullish) {
      indicatorConditions.macdHist = { gt: 0 };
    }
    if (filters.bbSqueeze) {
      indicatorConditions.bbUpper = { not: null };
      indicatorConditions.bbMiddle = { not: null };
      indicatorConditions.bbLower = { not: null };
    }
    if (filters.aboveSma200 || filters.belowSma200) {
      indicatorConditions.sma200 = { not: null };
    }
    if (filters.signalScoreMin !== undefined || filters.signalScoreMax !== undefined) {
      const ss: Record<string, number> = {};
      if (filters.signalScoreMin !== undefined) ss.gte = filters.signalScoreMin;
      if (filters.signalScoreMax !== undefined) ss.lte = filters.signalScoreMax;
      indicatorConditions.signalScore = Object.keys(ss).length > 0 ? ss : undefined;
    }
    if (filters.excludeGorengan) {
      indicatorConditions.isGorengan = { not: true };
    }

    Object.assign(where, indicatorConditions);
    const results = await stockRepository.findIndicatorsByDate(latestDate, where);

    let stocks = results.map((r) => {
      const prices = r.stock.prices;
      const { close, changePercent } = computeChange(prices[0], prices[1]);
      return {
        ticker: r.stock.ticker, name: r.stock.name, sector: r.stock.sector,
        close, changePercent,
        volume: prices[0] ? bigIntToNumber(prices[0].volume) : null,
        rsi14: decimalToNumber(r.rsi14),
        sma20: decimalToNumber(r.sma20),
        sma200: decimalToNumber(r.sma200),
        signalScore: decimalToNumber(r.signalScore),
        signalLabel: r.signalLabel ?? null,
        isGorengan: r.isGorengan,
      };
    });

    // Post-filter: price range
    if (filters.priceMin !== undefined) {
      stocks = stocks.filter((s) => s.close !== null && s.close >= (filters.priceMin ?? 0));
    }
    if (filters.priceMax !== undefined) {
      stocks = stocks.filter((s) => s.close !== null && s.close <= (filters.priceMax ?? Infinity));
    }

    if (filters.aboveSma200) {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close > s.sma200);
    } else if (filters.belowSma200) {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close < s.sma200);
    }

    if (filters.bbSqueeze) {
      const indicatorMap = new Map(results.map((r) => [r.stock.ticker, r]));
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si) return false;
        const upper = decimalToNumber(si.bbUpper);
        const lower = decimalToNumber(si.bbLower);
        const middle = decimalToNumber(si.bbMiddle);
        return upper !== null && lower !== null && middle !== null && middle > 0 && (upper - lower) / middle < 0.05;
      });
    }

    // Sorting
    const sortBy = filters.sortBy as string | undefined;
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

    if (sortBy) {
      stocks.sort((a, b) => {
        let aVal: number | null = null;
        let bVal: number | null = null;

        switch (sortBy) {
          case "signalScore":
            aVal = a.signalScore ?? null;
            bVal = b.signalScore ?? null;
            break;
          case "rsi14":
            aVal = a.rsi14;
            bVal = b.rsi14;
            break;
          case "volume":
            aVal = a.volume;
            bVal = b.volume;
            break;
          case "changePercent":
            aVal = a.changePercent;
            bVal = b.changePercent;
            break;
          case "close":
            aVal = a.close;
            bVal = b.close;
            break;
        }

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return (aVal - bVal) * sortOrder;
      });
    }

    return stocks;
  },
};