import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import type { Metadata } from "next";

// Stub page ("Coming Soon") — must not compete with the homepage in the index.
// Self-canonical + noindex until the real radar ships (see
// docs/seo-audit-2026-08-26.md).
export const metadata: Metadata = {
  title: "Bottom Fishing — Saham Oversold Potensi Reversal",
  description:
    "Radar bottom fishing: saham oversold RSI di bawah 30 dengan potensi pembalikan arah (reversal) di Bursa Efek Indonesia.",
  alternates: { canonical: "/bottom-fishing" },
  robots: { index: false, follow: true },
};

export default function BottomFishingPage() {
  return (
    <>
      <PageHero eyebrow="Tools" title="Bottom Fishing Radar" description="Oversold stocks with reversal potential." />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-accent" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bottom Fishing Radar will surface stocks with RSI below 30, positive divergence on MACD,
              and volume spike patterns. Check the{" "}
              <Link href="/screener" className="text-accent underline underline-offset-2">
                Screener
              </Link>{" "}
              for existing preset filters.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
