export interface StockQuote {
  symbol: string;
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  regularMarketVolume: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
  regularMarketOpen: number | null;
  regularMarketPreviousClose: number | null;
  currency: string | null;
  marketState: string;
  shortName: string | null;
  longName: string | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  trailingEps: number | null;
  dividendYield: number | null;
  averageDailyVolume3Month: number | null;
}

export interface OHLCV {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
  isActive: boolean;
}

export interface IndicatorValues {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  vwap: number | null;
  atr: number | null;
  obv: number | null;
  obvTrend: string | null;
  supertrend: number | null;
  smaCrossSignal: string | null;
  smaCrossDate: string | null;
  emaCrossSignal: string | null;
  emaCrossDate: string | null;
}

export interface MACDResult {
  macd?: number;
  signal?: number;
  histogram?: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  pb: number;
}

export interface StochasticResult {
  k?: number;
  d?: number;
}
