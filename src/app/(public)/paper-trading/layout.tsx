import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paper Trading",
  robots: { index: false, follow: false },
};

export default function PaperTradingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
