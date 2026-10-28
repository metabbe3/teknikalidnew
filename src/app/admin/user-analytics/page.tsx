"use client";

import { DashboardShell } from "../_components/dashboard-shell";

export default function UserAnalyticsPage() {
  return (
    <DashboardShell
      initialTab="users"
      title="Pengguna"
      description="Statistik pengguna: pertumbuhan, aktif harian, retensi & reputasi"
    />
  );
}
