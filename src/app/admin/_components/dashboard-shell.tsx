"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { OverviewTab } from "./overview-tab";
import { UsersTab } from "./users-tab";
import { CommunityTab } from "./community-tab";
import { StocksTab } from "./stocks-tab";
import { PredictionsTab } from "./predictions-tab";
import { AuthTab } from "./auth-tab";
import { AnalyticsTab } from "./analytics-tab";
import { InsightTab } from "./insight-tab";
import { UserManagementTab } from "./user-management-tab";
import { TABS, type TabId } from "./tab-config";
import { useState } from "react";

interface DashboardShellProps {
  /** Tab awal saat halaman dibuka (default: overview). */
  initialTab?: TabId;
  /** Judul header — pakai nama halaman stub, bukan "Dashboard". */
  title?: string;
  /** Deskripsi satu baris bahasa awam. */
  description?: string;
}

export function DashboardShell({
  initialTab = "overview",
  title = "Dashboard",
  description = "Semua analitik dan monitoring sistem dalam satu tempat",
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader title={title} description={description} icon={BarChart3} />

      {/* Tab Bar */}
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Bagian dashboard"
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
      {activeTab === "insight" && <InsightTab />}
      {activeTab === "usermgmt" && <UserManagementTab />}
    </div>
  );
}
