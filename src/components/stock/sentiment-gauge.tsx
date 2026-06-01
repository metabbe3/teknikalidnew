"use client";

import { useQuery } from "@tanstack/react-query";

interface SentimentData {
  bullish: number;
  bearish: number;
  total: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export function SentimentGauge({ ticker }: { ticker: string }) {
  const { data } = useQuery<SentimentData>({
    queryKey: ["stock-sentiment", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${ticker}/sentiment`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sentimen Komunitas</h3>
        <p className="text-xs text-gray-400">Belum ada data sentimen untuk saham ini.</p>
      </div>
    );
  }

  const bullishPercent = Math.round((data.bullish / data.total) * 100);
  const bearishPercent = 100 - bullishPercent;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Sentimen Komunitas</h3>

      {/* Gauge bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-red-500 w-8 text-right">{bearishPercent}%</span>
        <div className="flex-1 h-3 rounded-full overflow-hidden bg-gray-100 flex">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700 rounded-l-full"
            style={{ width: `${bullishPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 rounded-r-full"
            style={{ width: `${bearishPercent}%` }}
          />
        </div>
        <span className="text-xs font-bold text-teal-600 w-8">{bullishPercent}%</span>
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📉</span>
          <span className="text-xs font-medium text-gray-500">Bearish</span>
          <span className="text-xs text-gray-400">({data.bearish})</span>
        </div>

        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          data.sentiment === "bullish"
            ? "bg-teal-50 text-teal-700"
            : data.sentiment === "bearish"
            ? "bg-red-50 text-red-700"
            : "bg-gray-50 text-gray-600"
        }`}>
          {data.sentiment === "bullish" ? "📈 Bullish" : data.sentiment === "bearish" ? "📉 Bearish" : "⚖️ Netral"}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">({data.bullish})</span>
          <span className="text-xs font-medium text-gray-500">Bullish</span>
          <span className="text-sm">📈</span>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-2 text-center">Berdasarkan reaksi & prediksi 30 hari terakhir</p>
    </div>
  );
}
