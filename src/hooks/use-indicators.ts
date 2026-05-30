import { useQuery } from "@tanstack/react-query";

interface IndicatorData {
  dates: string[];
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  ema12: (number | null)[];
  ema26: (number | null)[];
  rsi14: (number | null)[];
  macd: { line: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
  bb: { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] };
  swingPoints: { type: "HIGH" | "LOW"; price: number; date: string }[];
  marketStructure: string;
  unconfirmedLeg: { type: "HIGH" | "LOW"; price: number; date: string } | null;
}

export function useIndicators(ticker: string, range: string) {
  return useQuery<IndicatorData>({
    queryKey: ["indicators", ticker, range],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${ticker}/indicators?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch indicators");
      return res.json();
    },
  });
}
