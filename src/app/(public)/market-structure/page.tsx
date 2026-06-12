import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function MarketStructurePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market Structure</h1>
        <p className="text-sm text-muted-foreground mt-1">Swing point analysis across IDX40</p>
      </div>
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
            <a href="/stocks" className="text-accent underline underline-offset-2">
              stock detail page
            </a>{" "}
            by enabling the ZigZag overlay.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
