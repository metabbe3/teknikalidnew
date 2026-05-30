"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Activity,
  FileText,
  Repeat,
  Radio,
  ListChecks,
  Database,
  BarChart3,
  Settings,
  Key,
  Shield,
  LogOut,
  ChevronRight,
  Users,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { AdminStatusIndicator } from "@/components/admin/admin-status-indicator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const sidebarNav: NavGroup[] = [
  {
    group: "Dashboard",
    icon: Activity,
    items: [
      { label: "System Health Overview", href: "/admin", icon: Activity },
    ],
  },
  {
    group: "Analytics",
    icon: BarChart3,
    items: [
      { label: "Community Analytics", href: "/admin/community", icon: Users },
      { label: "Predictions", href: "/admin/predictions", icon: Target },
      { label: "User Analytics", href: "/admin/user-analytics", icon: UserCheck },
      { label: "Stock Engagement", href: "/admin/stock-engagement", icon: TrendingUp },
      { label: "Auth & Security", href: "/admin/auth-health", icon: Shield },
    ],
  },
  {
    group: "Data Pipelines",
    icon: ListChecks,
    items: [
      { label: "EOD Sync Logs", href: "/admin/eod-logs", icon: FileText },
      { label: "Intraday Sync Logs", href: "/admin/intraday-logs", icon: Repeat },
      { label: "Queue Monitor", href: "/admin/queue-monitor", icon: ListChecks },
    ],
  },
  {
    group: "Market Data",
    icon: BarChart3,
    items: [
      { label: "Ticker Manager (IDX40)", href: "/admin/ticker-manager", icon: BarChart3 },
      { label: "Indicator Database", href: "/admin/indicators", icon: Database },
    ],
  },
  {
    group: "Settings",
    icon: Settings,
    items: [
      { label: "Cron Configuration", href: "/admin/cron-config", icon: Settings },
      { label: "API Keys", href: "/admin/api-keys", icon: Key },
    ],
  },
  {
    group: "Content",
    icon: FileText,
    items: [
      { label: "Articles", href: "/admin/articles", icon: FileText },
    ],
  },
  {
    group: "Moderation",
    icon: Shield,
    items: [
      { label: "Reports", href: "/admin/reports", icon: Shield },
    ],
  },
];

const PAGE_NAMES: Record<string, string> = {
  "/admin": "System Health",
  "/admin/community": "Community",
  "/admin/predictions": "Predictions",
  "/admin/user-analytics": "User Analytics",
  "/admin/stock-engagement": "Stock Engagement",
  "/admin/auth-health": "Auth & Security",
  "/admin/eod-logs": "EOD Sync Logs",
  "/admin/intraday-logs": "Intraday Logs",
  "/admin/queue-monitor": "Queue Monitor",
  "/admin/ticker-manager": "Ticker Manager",
  "/admin/indicators": "Indicators",
  "/admin/cron-config": "Cron Config",
  "/admin/api-keys": "API Keys",
  "/admin/reports": "Reports",
  "/admin/articles": "Articles",
  "/admin/articles/generate": "Generate Article",
};

function NavGroupWithSubmenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActiveChild = group.items.some((item) => pathname === item.href);
  const [open, setOpen] = useState(hasActiveChild);
  const GroupIcon = group.icon;

  // Single-item groups render flat (no submenu toggle)
  if (group.items.length === 1) {
    const item = group.items[0];
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.label}
                render={<Link href={item.href} />}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Multi-item groups render with collapsible submenu
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={group.group}
              onClick={() => setOpen(!open)}
              className="w-full"
            >
              <GroupIcon className="h-4 w-4" />
              <span>{group.group}</span>
              <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
            </SidebarMenuButton>
            {open && (
              <SidebarMenuSub>
                {group.items.map((item) => (
                  <SidebarMenuSubItem key={item.href}>
                    <SidebarMenuSubButton
                      isActive={pathname === item.href}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const pageName = PAGE_NAMES[pathname] ?? "Admin";

  return (
    <SidebarProvider>
      <Sidebar className="admin-sidebar-light border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-sidebar-foreground">
            <div className="p-1 rounded-md bg-blue-500/10">
              <Radio className="h-4 w-4 text-blue-600" />
            </div>
            <span>TeknikalID Admin</span>
            <AdminStatusIndicator />
          </div>
        </SidebarHeader>

        <SidebarContent>
          {sidebarNav.map((group) => (
            <NavGroupWithSubmenu key={group.group} group={group} pathname={pathname} />
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-7 w-7">
                {session?.user?.image && <AvatarImage src={session.user.image} alt="" />}
                <AvatarFallback className="bg-blue-500 text-white text-xs">
                  {session?.user?.name?.charAt(0)?.toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left truncate">{session?.user?.name ?? "Admin"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-56" align="start">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  {session?.user?.image && <AvatarImage src={session.user.image} alt="" />}
                  <AvatarFallback className="bg-blue-500 text-white text-sm">
                    {session?.user?.name?.charAt(0)?.toUpperCase() ?? "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-medium truncate">{session?.user?.name ?? "Admin User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{session?.user?.email ?? ""}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut({ callbackUrl: "/admin/login" });
                }}
                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center h-12 px-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4 bg-gray-200" />
          <nav className="text-xs">
            <Link href="/admin" className="text-gray-400 hover:text-blue-600 transition-colors">Admin</Link>
            {pageName !== "Admin" && (
              <>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="text-gray-800 font-semibold">{pageName}</span>
              </>
            )}
          </nav>
        </header>
        <div className="flex-1 p-4 md:p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-[calc(100vh-3rem)]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
