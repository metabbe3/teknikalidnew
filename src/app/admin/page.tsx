"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Users, MessageSquare, TrendingUp, Target, Shield, Eye } from "lucide-react";
import { OverviewTab } from "./_components/overview-tab";
import { UsersTab } from "./_components/users-tab";
import { CommunityTab } from "./_components/community-tab";
import { StocksTab } from "./_components/stocks-tab";
import { PredictionsTab } from "./_components/predictions-tab";
import { AuthTab } from "./_components/auth-tab";
import { PageViewsTab } from "./_components/page-views-tab";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "predictions", label: "Predictions", icon: Target },
  { id: "auth", label: "Auth", icon: Shield },
  { id: "pageviews", label: "Page Views", icon: Eye },
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
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
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
      {activeTab === "pageviews" && <PageViewsTab />}
    </div>
  );
}
