import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import type { Metadata } from "next";

// Stub page ("Coming Soon") — must not compete with the homepage in the index.
// Self-canonical + noindex until the real calculator ships; then flip to
// index:true with "Kalkulator Trading Saham" keyword targeting (see
// docs/seo-audit-2026-08-26.md, keyword: "kalkulator trading saham").
export const metadata: Metadata = {
  title: "Kalkulator Trading Plan Saham",
  description:
    "Hitung trading plan saham otomatis: entry, target, dan cut loss untuk saham IDX40 dengan kalkulator trading TeknikalID.",
  alternates: { canonical: "/trading-plan" },
  robots: { index: false, follow: true },
};

export default function TradingPlanPage() {
  return (
    <>
      <PageHero eyebrow="Tools" title="Trading Plan Calculator" description="Generate AI-powered trading plans for any IDX40 stock." />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-accent" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The standalone Trading Plan Calculator will let you generate trading plans for any stock
              without navigating to the stock detail page. For now, visit any{" "}
              <Link href="/stocks" className="text-accent underline underline-offset-2">
                stock page
              </Link>{" "}
              to see the trading plan section.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
