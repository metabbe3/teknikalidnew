"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getMarketStatus } from "@/lib/market-hours.client";
import { normalizeTicker } from "@/lib/utils";
import { UserMenu } from "@/components/layout/user-menu";

export function DashboardHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  const [market, setMarket] = useState(() => getMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setMarket(getMarketStatus()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Badge
          variant={market.open ? "default" : "secondary"}
          className={`text-[11px] font-mono font-medium ${
            market.open
              ? "bg-bullish/10 text-bullish hover:bg-bullish/15"
              : "bg-muted text-muted-foreground"
          }`}
        >
          BEI: {market.label}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ticker..."
            className="pl-8 h-8 w-48 text-sm bg-muted/50 border-0 focus-visible:ring-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) router.push(`/stocks/${normalizeTicker(v)}`);
              }
            }}
          />
        </div>

        <UserMenu user={session?.user} variant="dashboard" />
      </div>
    </header>
  );
}
