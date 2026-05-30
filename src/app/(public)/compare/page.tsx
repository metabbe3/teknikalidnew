import type { Metadata } from "next";
import { ComparePageClient } from "@/components/compare/compare-page-client";

export const metadata: Metadata = {
  title: "Bandingkan Saham IDX | TeknikalID",
  description: "Bandingkan performa hingga 4 saham IDX dengan grafik overlay dan tabel perbandingan indikator teknikal.",
};

export default function ComparePage() {
  return <ComparePageClient />;
}
