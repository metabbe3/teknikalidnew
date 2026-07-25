import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";

export default function MarketStructurePage() {
  return (
    <>
      <PageHero eyebrow="Tools" title="Market Structure" description="Swing point analysis across IDX40." />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-accent" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Market Structure analysis will show higher-high/higher-low and lower-high/lower-low patterns
              across all IDX40 stocks. View individual stock structure on each{" "}
              <Link href="/stocks" className="text-accent underline underline-offset-2">
                stock detail page
              </Link>{" "}
              by enabling the ZigZag overlay.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
