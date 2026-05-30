import { useQuery } from "@tanstack/react-query";

interface HistoryRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number | null;
}

export function useStockHistory(ticker: string, range: string) {
  return useQuery<HistoryRow[]>({
    queryKey: ["history", ticker, range],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${ticker}/history?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });
}
