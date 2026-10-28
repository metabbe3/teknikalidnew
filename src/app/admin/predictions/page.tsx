"use client";

import { DashboardShell } from "../_components/dashboard-shell";

export default function PredictionsPage() {
  return (
    <DashboardShell
      initialTab="predictions"
      title="Prediksi"
      description="Rekap prediksi agen vs hasil harga sesungguhnya"
    />
  );
}
