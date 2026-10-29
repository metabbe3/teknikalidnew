"use client";

import { DashboardShell } from "../_components/dashboard-shell";

export default function AuthHealthPage() {
  return (
    <DashboardShell
      initialTab="auth"
      title="Kesehatan Login"
      description="Kesehatan login: provider, error & sesi bermasalah"
    />
  );
}
