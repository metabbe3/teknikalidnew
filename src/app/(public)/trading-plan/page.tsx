import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";

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
