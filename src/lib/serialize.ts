import type { Prisma } from "@/generated/prisma/client";
import { toDateKey } from "@/lib/utils";

type Decimal = Prisma.Decimal;

export function decimalToNumber(d: Decimal | null | undefined): number | null {
  if (d == null) return null;
  return Number(d);
}

export function bigIntToNumber(b: bigint | null | undefined): number | null {
  if (b == null) return null;
  return Number(b);
}

export function computeChange(
  latest: { close: Decimal } | undefined | null,
  prev: { close: Decimal } | undefined | null
) {
  const close = latest ? decimalToNumber(latest.close) : null;
  const prevClose = prev ? decimalToNumber(prev.close) : null;
  const change = close !== null && prevClose !== null ? close - prevClose : null;
  const changePercent =
    close !== null && prevClose !== null && prevClose !== 0
      ? ((close - prevClose) / prevClose) * 100
      : null;
  return { close, prevClose, change, changePercent };
}

export function serializePriceRow(
  row: {
    date: Date;
    open: Decimal;
    high: Decimal;
    low: Decimal;
    close: Decimal;
    volume: bigint;
    adjClose: Decimal | null;
  }
) {
  return {
    date: toDateKey(row.date),
    open: decimalToNumber(row.open),
    high: decimalToNumber(row.high),
    low: decimalToNumber(row.low),
    close: decimalToNumber(row.close),
    volume: bigIntToNumber(row.volume),
    adjClose: decimalToNumber(row.adjClose),
  };
}

export function serializeIndicatorRow(
  row: {
    date: Date;
    sma20: Decimal | null;
    sma50: Decimal | null;
    sma200: Decimal | null;
    ema12: Decimal | null;
    ema26: Decimal | null;
    rsi14: Decimal | null;
    macdLine: Decimal | null;
    macdSignal: Decimal | null;
    macdHist: Decimal | null;
    bbUpper: Decimal | null;
    bbMiddle: Decimal | null;
    bbLower: Decimal | null;
    stochK: Decimal | null;
    stochD: Decimal | null;
    adx: Decimal | null;
    vwap: Decimal | null;
    atr: Decimal | null;
    obv: Decimal | null;
    obvTrend: string | null;
    supertrend: Decimal | null;
  }
) {
  return {
    date: toDateKey(row.date),
    sma20: decimalToNumber(row.sma20),
    sma50: decimalToNumber(row.sma50),
    sma200: decimalToNumber(row.sma200),
    ema12: decimalToNumber(row.ema12),
    ema26: decimalToNumber(row.ema26),
    rsi14: decimalToNumber(row.rsi14),
    macdLine: decimalToNumber(row.macdLine),
    macdSignal: decimalToNumber(row.macdSignal),
    macdHist: decimalToNumber(row.macdHist),
    bbUpper: decimalToNumber(row.bbUpper),
    bbMiddle: decimalToNumber(row.bbMiddle),
    bbLower: decimalToNumber(row.bbLower),
    stochK: decimalToNumber(row.stochK),
    stochD: decimalToNumber(row.stochD),
    adx: decimalToNumber(row.adx),
    vwap: decimalToNumber(row.vwap),
    atr: decimalToNumber(row.atr),
    obv: decimalToNumber(row.obv),
    obvTrend: row.obvTrend,
    supertrend: decimalToNumber(row.supertrend),
  };
}

export function serializeIndicator(
  row: {
    sma20: Decimal | null;
    sma50: Decimal | null;
    sma200: Decimal | null;
    ema12: Decimal | null;
    ema26: Decimal | null;
    rsi14: Decimal | null;
    macdLine: Decimal | null;
    macdSignal: Decimal | null;
    macdHist: Decimal | null;
    bbUpper: Decimal | null;
    bbMiddle: Decimal | null;
    bbLower: Decimal | null;
    stochK: Decimal | null;
    stochD: Decimal | null;
    adx: Decimal | null;
    vwap: Decimal | null;
    atr: Decimal | null;
    obv: Decimal | null;
    obvTrend: string | null;
    supertrend: Decimal | null;
    smaCrossSignal: string | null;
    smaCrossDate: Date | null;
    emaCrossSignal: string | null;
    emaCrossDate: Date | null;
  }
) {
  return {
    sma20: decimalToNumber(row.sma20),
    sma50: decimalToNumber(row.sma50),
    sma200: decimalToNumber(row.sma200),
    ema12: decimalToNumber(row.ema12),
    ema26: decimalToNumber(row.ema26),
    rsi14: decimalToNumber(row.rsi14),
    macdLine: decimalToNumber(row.macdLine),
    macdSignal: decimalToNumber(row.macdSignal),
    macdHist: decimalToNumber(row.macdHist),
    bbUpper: decimalToNumber(row.bbUpper),
    bbMiddle: decimalToNumber(row.bbMiddle),
    bbLower: decimalToNumber(row.bbLower),
    stochK: decimalToNumber(row.stochK),
    stochD: decimalToNumber(row.stochD),
    adx: decimalToNumber(row.adx),
    vwap: decimalToNumber(row.vwap),
    atr: decimalToNumber(row.atr),
    obv: decimalToNumber(row.obv),
    obvTrend: row.obvTrend,
    supertrend: decimalToNumber(row.supertrend),
    smaCrossSignal: row.smaCrossSignal,
    smaCrossDate: row.smaCrossDate ? row.smaCrossDate.toISOString() : null,
    emaCrossSignal: row.emaCrossSignal,
    emaCrossDate: row.emaCrossDate ? row.emaCrossDate.toISOString() : null,
  };
}
