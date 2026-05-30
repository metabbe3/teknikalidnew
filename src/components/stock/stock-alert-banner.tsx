"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useStockAlerts } from "@/hooks/use-stock-alerts";

export function StockAlertBanner({ ticker }: { ticker: string }) {
  const { latestAlert } = useStockAlerts(ticker);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!latestAlert) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [latestAlert]);

  if (!visible || !latestAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-bg-card border border-border rounded-xl p-4 depth-shadow-strong z-50 max-w-sm animate-in slide-in-from-right">
      <div className="flex items-start gap-3">
        <Bell className="w-[18px] h-[18px] text-accent shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide">
            Stock Alert
          </p>
          <div className="mt-1 space-y-0.5">
            {latestAlert.alerts.map((a, i) => (
              <p key={i} className="text-sm text-text-primary">
                {a.message}
              </p>
            ))}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-text-tertiary hover:text-text-primary shrink-0"
          aria-label="Tutup"
        >
          <X className="w-[14px] h-[14px]" />
        </button>
      </div>
    </div>
  );
}
