import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Screener Saham Teknikal — Filter Saham BEI",
  description: "Screener saham teknikal untuk filter saham BEI berdasarkan momentum, tren, volume, dan volatilitas. Temukan sinyal buy sell, golden cross, dan RSI oversold.",
  alternates: { canonical: "/screener" },
};

export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
