"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";
import { getMarketStatus } from "@/lib/market-hours.client";
import { getUserInitials, getRoleLabel, normalizeTicker } from "@/lib/utils";

export function DashboardHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const initials = getUserInitials(session?.user);

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

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors" />
            }
          >
              <Avatar className="h-7 w-7">
                {session?.user?.image && <AvatarImage src={session.user.image} alt="" />}
                <AvatarFallback className="text-xs bg-accent/10 text-accent">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium text-foreground">
                {session?.user?.username ?? session?.user?.name ?? "User"}
              </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span>{session?.user?.name ?? "User"}</span>
                <Badge variant="outline" className="w-fit text-[10px]">
                  {getRoleLabel(session?.user?.role)}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={session?.user?.username ? `/profile/${session.user.username}` : "/dashboard/settings"} />}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
