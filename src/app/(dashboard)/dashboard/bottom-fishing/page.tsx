import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function BottomFishingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bottom Fishing Radar</h1>
        <p className="text-sm text-muted-foreground mt-1">Oversold stocks with reversal potential</p>
      </div>
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
            <a href="/screener" className="text-accent underline underline-offset-2">
              Screener
            </a>{" "}
            for existing preset filters.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
