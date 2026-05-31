"use client";

import { useState } from "react";
import type { CompanyProfileData } from "./company-profile-tab";
import type { CommissionerData } from "./commissioners-tab";
import type { SubsidiaryData } from "./subsidiaries-tab";
import type { DividendData } from "./dividend-history-tab";
import { CompanyProfileTab } from "./company-profile-tab";
import { CommissionersTab } from "./commissioners-tab";
import { SubsidiariesTab } from "./subsidiaries-tab";
import { DividendHistoryTab } from "./dividend-history-tab";

type TabKey = "profil" | "komisaris" | "anak-perusahaan" | "dividen";

interface TabDef {
  key: TabKey;
  label: string;
  count: number;
}

export interface CompanyDataTabsProps {
  profile: CompanyProfileData | null;
  commissioners: CommissionerData[];
  subsidiaries: SubsidiaryData[];
  dividends: DividendData[];
}

export function CompanyDataTabs({ profile, commissioners, subsidiaries, dividends }: CompanyDataTabsProps) {
  const hasProfile = profile && (
    profile.industry || profile.subIndustry || profile.subSector ||
    profile.listingBoard || profile.listingDate || profile.address ||
    profile.phone || profile.email || profile.website
  );

  const tabs: TabDef[] = ([
    { key: "profil" as TabKey, label: "Profil", count: hasProfile ? 1 : 0 },
    { key: "komisaris" as TabKey, label: "Komisaris", count: commissioners.length },
    { key: "anak-perusahaan" as TabKey, label: "Anak Perusahaan", count: subsidiaries.length },
    { key: "dividen" as TabKey, label: "Dividen", count: dividends.length },
  ] as TabDef[]).filter((t) => t.count > 0);

  const [activeTab, setActiveTab] = useState<TabKey | null>(null);

  // Don't render anything if no data at all
  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(activeTab === tab.key ? null : tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-accent/15 text-accent border border-accent/30"
                : "bg-white/[0.04] text-text-secondary border border-white/[0.06] hover:bg-white/[0.08] hover:text-text-primary"
            }`}
          >
            {tab.label}
            <span className={`text-[11px] font-mono tabular-nums ${
              activeTab === tab.key ? "text-accent/70" : "text-text-tertiary"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab && (
        <div className="fade-in">
          {activeTab === "profil" && hasProfile && <CompanyProfileTab data={profile} />}
          {activeTab === "komisaris" && <CommissionersTab commissioners={commissioners} />}
          {activeTab === "anak-perusahaan" && <SubsidiariesTab subsidiaries={subsidiaries} />}
          {activeTab === "dividen" && <DividendHistoryTab dividends={dividends} />}
        </div>
      )}
    </div>
  );
}
