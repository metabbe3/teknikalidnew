"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { BarChart3, Power } from "lucide-react";

interface TickerEntry {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  isActive: boolean;
  latestPrice: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  lastUpdate: string | null;
}

interface TickersData {
  tickers: TickerEntry[];
}

export default function TickerManagerPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<TickersData>({
    queryKey: ["admin-tickers"],
    queryFn: async () => {
      const r = await fetch("/api/admin/tickers");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!data?.tickers) return [];
    const q = search.toLowerCase();
    if (!q) return data.tickers;
    return data.tickers.filter(
      (t) =>
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.sector.toLowerCase().includes(q),
    );
  }, [data?.tickers, search]);

  async function toggleActive(ticker: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/admin/tickers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, isActive: !currentActive }),
      });
      if (res.ok) {
        toast.success(`${ticker} ${!currentActive ? "activated" : "deactivated"}`);
        queryClient.invalidateQueries({ queryKey: ["admin-tickers"] });
      } else {
        toast.error("Failed to update ticker");
      }
    } catch {
      toast.error("Network error");
    }
  }

  const columns = [
    { header: "#", cell: (_: TickerEntry, i: number) => <span className="text-xs text-gray-400">{i + 1}</span> },
    { header: "Ticker", cell: (r: TickerEntry) => <span className="font-mono font-bold text-sm text-gray-900">{r.ticker}</span> },
    { header: "Name", cell: (r: TickerEntry) => <span className="text-sm text-gray-700">{r.name}</span> },
    { header: "Sector", cell: (r: TickerEntry) => <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">{r.sector}</Badge> },
    {
      header: "Price",
      cell: (r: TickerEntry) =>
        r.latestPrice !== null ? (
          <span className="tabular-nums text-sm font-semibold text-gray-900">{r.latestPrice.toLocaleString()}</span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
    {
      header: "Change",
      cell: (r: TickerEntry) => {
        if (r.changePercent === null) return <span className="text-xs text-gray-400">-</span>;
        const positive = r.changePercent >= 0;
        return (
          <span className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-rose-500"}`}>
            {positive ? "+" : ""}
            {r.changePercent.toFixed(2)}%
          </span>
        );
      },
    },
    {
      header: "Status",
      cell: (r: TickerEntry) => (
        <Button
          size="sm"
          variant={r.isActive ? "default" : "outline"}
          onClick={() => toggleActive(r.ticker, r.isActive)}
          className={`h-7 text-xs gap-1 ${r.isActive ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-gray-300 text-gray-500"}`}
        >
          <Power className="h-3 w-3" />
          {r.isActive ? "Active" : "Inactive"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Ticker Manager"
        description={`${data?.tickers.length ?? 40} IDX40 stocks with live market data`}
        icon={BarChart3}
        actions={
          <Input
            placeholder="Search ticker, name, or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
          />
        }
      />

      <AdminDataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        emptyMessage="No tickers found"
        keyFn={(r) => r.ticker}
      />
    </div>
  );
}
