"use client";

import { useState } from "react";
import { useCancelOrder, type PendingOrder } from "@/hooks/use-paper-trading";
import { useToast } from "./toast";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function PendingOrders({ orders }: { orders: PendingOrder[] }) {
  const cancelOrder = useCancelOrder();
  const { toast } = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-gray-400">Semua order sudah tereksekusi</div>
        <div className="text-xs text-gray-300 mt-1">Order limit/stop yang tertunda akan muncul di sini</div>
      </div>
    );
  }

  const handleCancel = (id: string) => {
    cancelOrder.mutate(id, {
      onSuccess: () => {
        setConfirmId(null);
        toast("Order berhasil dibatalkan");
      },
      onError: (err) => toast((err as Error).message, "error"),
    });
  };

  return (
    <div className="space-y-2 stagger-grid">
      {orders.map((order, i) => (
        <div
          key={order.id}
          className="trade-card trade-card-pending fade-in"
          style={{ "--stagger-i": i } as React.CSSProperties}
        >
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{order.stockTicker.replace(".JK", "")}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    order.side === "BUY" ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"
                  }`}>
                    {order.side === "BUY" ? "BELI" : "JUAL"}
                  </span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                    {order.orderType}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {order.lots} lot &times; {formatRupiah(order.targetPrice)} = <span className="font-semibold text-gray-600 font-mono tabular-nums">{formatRupiah(order.targetPrice * order.quantity)}</span>
                </div>
                {order.reason && (
                  <div className="text-[11px] text-gray-400 mt-1 truncate">{order.reason}</div>
                )}
              </div>

              {confirmId === order.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancelOrder.isPending}
                    className="press-scale text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelOrder.isPending ? "..." : "Ya"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(order.id)}
                  className="press-scale text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shrink-0 border border-red-100"
                >
                  Batalkan
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
