import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function TradingPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trading Plan Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate AI-powered trading plans for any IDX40 stock</p>
      </div>
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
            <a href="/stocks" className="text-accent underline underline-offset-2">
              stock page
            </a>{" "}
            to see the trading plan section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
