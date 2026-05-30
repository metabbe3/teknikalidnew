export interface TradingPlan {
  strategy: "MARKET_ENTRY" | "BUY_ON_WEAKNESS" | "WAIT_AND_SEE";
  status: "TRADEABLE" | "NOT_IDEAL";
  entry: number;
  entryZone: string;
  tp1: number;
  tp1Source: string;
  tp2: number | null;
  tp2Source: string;
  sl: number;
  slSource: string;
  riskReward: number;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  suggestion: string;
  marketEntryPrice?: number;
}
