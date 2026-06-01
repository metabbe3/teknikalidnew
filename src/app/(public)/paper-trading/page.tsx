"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaperAccount, useOpenPositions, usePendingOrders } from "@/hooks/use-paper-trading";
import { AccountSummary } from "@/components/paper-trading/account-summary";
import { PositionsTable } from "@/components/paper-trading/positions-table";
import { PendingOrders } from "@/components/paper-trading/pending-orders";
import { TradeHistory } from "@/components/paper-trading/trade-history";
import { TradeModal } from "@/components/paper-trading/trade-modal";
import { CreateAccount } from "@/components/paper-trading/create-account";
import { ToastProvider } from "@/components/paper-trading/toast";

const TABS = [
  { key: "positions", label: "Posisi" },
  { key: "orders", label: "Pending" },
  { key: "history", label: "Riwayat" },
] as const;

type Tab = (typeof TABS)[number]["key"];

function SkeletonCard() {
  return <div className="skeleton-shimmer h-20 rounded-xl" />;
}

function DashboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      <div className="mt-4">
        <div className="skeleton-shimmer h-40 rounded-2xl" />
      </div>
      <div className="flex mt-4 gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 skeleton-shimmer h-10 rounded-lg" />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function PaperTradingPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<DashboardSkeleton />}>
        <PaperTradingRouter />
      </Suspense>
    </ToastProvider>
  );
}

function PaperTradingRouter() {
  const searchParams = useSearchParams();
  const { data: account, isLoading, error } = usePaperAccount();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !account) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <CreateAccount />
      </div>
    );
  }

  const initialTicker = searchParams.get("ticker") ?? undefined;
  return <PaperTradingDashboard account={account} initialTicker={initialTicker} />;
}

function PaperTradingDashboard({
  account,
  initialTicker: prefilledTicker,
}: {
  account: NonNullable<Awaited<ReturnType<typeof usePaperAccount>["data"]>>;
  initialTicker?: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("positions");
  const [showTradeModal, setShowTradeModal] = useState(!!prefilledTicker);
  const [tradeTicker, setTradeTicker] = useState(prefilledTicker);

  const { data: accountFresh } = usePaperAccount();
  const { data: positions } = useOpenPositions();
  const { data: orders } = usePendingOrders();

  const displayAccount = accountFresh ?? account;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Account summary */}
      <div className="mt-4">
        <AccountSummary account={displayAccount} />
      </div>

      {/* Tab bar */}
      <div className="flex mt-5 bg-gray-100 rounded-xl p-1 gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === "positions" ? positions?.length :
            tab.key === "orders" ? orders?.length : undefined;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 relative ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab.label}
                {count != null && count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4 fade-in" key={activeTab}>
        {activeTab === "positions" && positions && <PositionsTable positions={positions} />}
        {activeTab === "orders" && orders && <PendingOrders orders={orders} />}
        {activeTab === "history" && <TradeHistory />}
      </div>

      {/* Floating trade button */}
      <button
        onClick={() => { setTradeTicker(undefined); setShowTradeModal(true); }}
        className="fixed bottom-6 right-6 bg-teal-600 text-white w-14 h-14 rounded-2xl depth-shadow-strong press-scale hover:bg-teal-700 transition-colors flex items-center justify-center z-40 group"
        style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(13,148,136,0.3), 0 12px 28px rgba(13,148,136,0.15)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="group-hover:rotate-90 transition-transform duration-200">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Trade modal */}
      {showTradeModal && (
        <TradeModal
          onClose={() => setShowTradeModal(false)}
          initialTicker={tradeTicker}
        />
      )}
    </div>
  );
}
