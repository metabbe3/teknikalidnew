import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  BarChart3,
  Calculator,
  Bookmark,
  CreditCard,
  Settings,
} from "lucide-react";

const features = [
  { label: "Bottom Fishing Radar", href: "/dashboard/bottom-fishing", icon: LineChart, desc: "Find oversold stocks with reversal potential" },
  { label: "Market Structure", href: "/dashboard/market-structure", icon: BarChart3, desc: "Swing point analysis and zigzag visualization" },
  { label: "Trading Plan Calculator", href: "/dashboard/trading-plan", icon: Calculator, desc: "Generate AI-powered trading plans" },
  { label: "Watchlists", href: "/watchlist", icon: Bookmark, desc: "Track your favorite stocks" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, desc: "Manage your subscription" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, desc: "Account preferences" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your analysis tools and account management</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Link key={f.href} href={f.href}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <f.icon className="h-4 w-4 text-accent" />
                  {f.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
