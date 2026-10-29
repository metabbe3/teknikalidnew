"use client";

import { DashboardShell } from "../_components/dashboard-shell";

export default function InsightPage() {
  return (
    <DashboardShell
      initialTab="insight"
      title="Insight Pengunjung"
      description="Kedalaman baca, corong keterlibatan, klik CTA & asal pengunjung — jawaban atas kenapa orang kembali atau tidak"
    />
  );
}
