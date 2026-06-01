"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";

export interface PaperAccountSummary {
  id: string;
  balance: number;
  initialBalance: number;
  isPublic: boolean;
  positionCount: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  createdAt: string;
}

export interface OpenPosition {
  id: string;
  stockTicker: string;
  stockName: string;
  side: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  lots: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  reason: string | null;
  strategyTags: string[] | null;
  mood: string | null;
  openedAt: string;
}

export interface PendingOrder {
  id: string;
  stockTicker: string;
  stockName: string;
  side: string;
  orderType: string;
  quantity: number;
  lots: number;
  targetPrice: number;
  reason: string | null;
  strategyTags: string[] | null;
  mood: string | null;
  createdAt: string;
}

export interface TradeHistoryItem {
  id: string;
  stockTicker: string;
  stockName: string;
  side: string;
  entryPrice: number;
  closePrice: number;
  quantity: number;
  lots: number;
  realizedPnl: number;
  realizedPnlPct: number;
  reason: string | null;
  strategyTags: string[] | null;
  mood: string | null;
  openedAt: string;
  closedAt: string | null;
}

export function usePaperAccount() {
  return useQuery<PaperAccountSummary>({
    queryKey: ["paper-trading", "account"],
    queryFn: async () => {
      const res = await fetch("/api/paper-trading/account");
      if (!res.ok) throw new Error("Gagal memuat akun");
      const json = await res.json();
      return json.data;
    },
    retry: false,
  });
}

export function useOpenPositions() {
  return useQuery<OpenPosition[]>({
    queryKey: ["paper-trading", "positions"],
    queryFn: async () => {
      const res = await fetch("/api/paper-trading/positions");
      if (!res.ok) throw new Error("Gagal memuat posisi");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30000,
  });
}

export function usePendingOrders() {
  return useQuery<PendingOrder[]>({
    queryKey: ["paper-trading", "orders"],
    queryFn: async () => {
      const res = await fetch("/api/paper-trading/orders");
      if (!res.ok) throw new Error("Gagal memuat order");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useTradeHistory() {
  return useInfiniteQuery<{
    data: TradeHistoryItem[];
    nextCursor: string | null;
  }>({
    queryKey: ["paper-trading", "history"],
    initialPageParam: undefined as string | undefined | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam as string | null) params.set("cursor", pageParam as string);
      const res = await fetch(`/api/paper-trading/history?${params}`);
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (initialBalance: number) => {
      const res = await fetch("/api/paper-trading/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialBalance }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat akun");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading"] });
    },
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      stockTicker: string;
      side: string;
      orderType: string;
      quantity: number;
      targetPrice?: number;
      positionId?: string;
      reason?: string | null;
      strategyTags?: string[] | null;
      mood?: string | null;
    }) => {
      const res = await fetch("/api/paper-trading/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading"] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/paper-trading/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membatalkan order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading"] });
    },
  });
}

export function useClosePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: string) => {
      const res = await fetch(`/api/paper-trading/positions/${positionId}/close`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menutup posisi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading"] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ positionId, data }: {
      positionId: string;
      data: { stopLossPrice?: number | null; takeProfitPrice?: number | null };
    }) => {
      const res = await fetch(`/api/paper-trading/positions/${positionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengupdate posisi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading"] });
    },
  });
}

export function useTogglePublic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/paper-trading/account", { method: "PATCH" });
      if (!res.ok) throw new Error("Gagal mengubah pengaturan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "account"] });
    },
  });
}

export interface StockPosition {
  stockTicker: string;
  quantity: number;
  lots: number;
  avgEntryPrice: number;
  currentPrice: number;
  bidPrice: number;
  askPrice: number;
  spreadBps: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  spreadCost: number;
  positions: {
    id: string;
    entryPrice: number | null;
    quantity: number;
    stopLossPrice: number | null;
    takeProfitPrice: number | null;
    reason: string | null;
    strategyTags: string[] | null;
    mood: string | null;
    openedAt: string;
  }[];
}

export function useStockPosition(ticker: string) {
  return useQuery<StockPosition | null>({
    queryKey: ["paper-trading", "stock-position", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/paper-trading/stock/${ticker}`);
      if (!res.ok) throw new Error("Gagal memuat posisi");
      const json = await res.json();
      return json.data;
    },
    retry: false,
    refetchInterval: 30000,
  });
}

export function useTopUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/paper-trading/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topup", amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal top-up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading"] });
    },
  });
}
