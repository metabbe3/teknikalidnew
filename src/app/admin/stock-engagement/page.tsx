"use client";

import { DashboardShell } from "../_components/dashboard-shell";

export default function StockEngagementPage() {
  return (
    <DashboardShell
      initialTab="stocks"
      title="Saham"
      description="Saham paling banyak dilihat & disimpan watcher"
    />
  );
}
