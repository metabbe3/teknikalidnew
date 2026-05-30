"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardHeader } from "@/components/dashboard/header";
import { useTelemetry } from "@/hooks/use-telemetry";
import { useSession } from "next-auth/react";
import { getUserInitials, getRoleLabel } from "@/lib/utils";
import {
  LineChart,
  BarChart3,
  Calculator,
  Bookmark,
  CreditCard,
  Settings,
} from "lucide-react";

const sidebarNav = [
  {
    group: "Analysis",
    items: [
      { label: "Bottom Fishing Radar", href: "/dashboard/bottom-fishing", icon: LineChart },
      { label: "Market Structure", href: "/dashboard/market-structure", icon: BarChart3 },
    ],
  },
  {
    group: "Portfolios",
    items: [
      { label: "Trading Plan Calculator", href: "/dashboard/trading-plan", icon: Calculator },
      { label: "Watchlists", href: "/watchlist", icon: Bookmark },
    ],
  },
  {
    group: "Management",
    items: [
      { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useTelemetry();
  const pathname = usePathname();
  const { data: session } = useSession();
  const initials = getUserInitials(session?.user);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-border px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>TeknikalID</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {sidebarNav.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-border p-3">
          <Link href={session?.user?.username ? `/profile/${session.user.username}` : "/dashboard/settings"} className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              {session?.user?.image && <AvatarImage src={session.user.image} alt="" />}
              <AvatarFallback className="text-xs bg-accent/10 text-accent">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">
                {session?.user?.username ?? session?.user?.name ?? "User"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {getRoleLabel(session?.user?.role)}
              </span>
            </div>
          </Link>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <DashboardHeader />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
