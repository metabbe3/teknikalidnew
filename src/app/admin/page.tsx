"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Users, MessageSquare, TrendingUp, Target, Shield, UserCog, LineChart } from "lucide-react";
import { OverviewTab } from "./_components/overview-tab";
import { UsersTab } from "./_components/users-tab";
import { CommunityTab } from "./_components/community-tab";
import { StocksTab } from "./_components/stocks-tab";
import { PredictionsTab } from "./_components/predictions-tab";
import { AuthTab } from "./_components/auth-tab";
import { UserManagementTab } from "./_components/user-management-tab";
import { AnalyticsTab } from "./_components/analytics-tab";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "predictions", label: "Predictions", icon: Target },
  { id: "auth", label: "Auth", icon: Shield },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "usermgmt", label: "User Mgmt", icon: UserCog },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminOverviewPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Dashboard"
        description="All analytics and system monitoring in one place"
        icon={BarChart3}
      />

      {/* Tab Bar */}
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Dashboard sections"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const idx = TABS.findIndex((t) => t.id === activeTab);
          const next = e.key === "ArrowRight" ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
          setActiveTab(TABS[next].id);
        }}
      >
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="gap-1.5 shrink-0"
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "community" && <CommunityTab />}
      {activeTab === "stocks" && <StocksTab />}
      {activeTab === "predictions" && <PredictionsTab />}
      {activeTab === "auth" && <AuthTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "usermgmt" && <UserManagementTab />}
    </div>
  );
}
