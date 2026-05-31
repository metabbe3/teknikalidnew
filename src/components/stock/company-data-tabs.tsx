"use client";

import { useState } from "react";
import type { CompanyProfileData } from "./company-profile-tab";
import type { CommissionerData } from "./commissioners-tab";
import type { DirectorData } from "./directors-tab";
import type { ShareholderData } from "./shareholders-tab";
import type { SubsidiaryData } from "./subsidiaries-tab";
import type { DividendData } from "./dividend-history-tab";
import { CompanyProfileTab } from "./company-profile-tab";
import { CommissionersTab } from "./commissioners-tab";
import { DirectorsTab } from "./directors-tab";
import { ShareholdersTab } from "./shareholders-tab";
import { SubsidiariesTab } from "./subsidiaries-tab";
import { DividendHistoryTab } from "./dividend-history-tab";

type TabKey = "profil" | "komisaris" | "direksi" | "pemegang-saham" | "anak-perusahaan" | "dividen";

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
  count: number;
}

export interface CompanyDataTabsProps {
  profile: CompanyProfileData | null;
  commissioners: CommissionerData[];
  directors: DirectorData[];
  shareholders: ShareholderData[];
  subsidiaries: SubsidiaryData[];
  dividends: DividendData[];
}

export function CompanyDataTabs({ profile, commissioners, directors, shareholders, subsidiaries, dividends }: CompanyDataTabsProps) {
  const hasProfile = profile && (
    profile.industry || profile.subIndustry || profile.subSector ||
    profile.listingBoard || profile.listingDate || profile.address ||
    profile.phone || profile.email || profile.website || profile.businessActivity ||
    profile.listedShares || profile.foreignOwnershipPercent || profile.isinCode
  );

  const totalCount = (hasProfile ? 1 : 0) + commissioners.length + directors.length + shareholders.length + subsidiaries.length + dividends.length;

  const tabs: TabDef[] = ([
    { key: "profil" as TabKey, label: "Profil", icon: "M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4", count: hasProfile ? 1 : 0 },
    { key: "komisaris" as TabKey, label: "Komisaris", icon: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", count: commissioners.length },
    { key: "direksi" as TabKey, label: "Direksi", icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z", count: directors.length },
    { key: "pemegang-saham" as TabKey, label: "Pemegang Saham", icon: "M11 3.055A9.001 9.001 0 1 0 20.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0 1 20.488 9z", count: shareholders.length },
    { key: "anak-perusahaan" as TabKey, label: "Anak Perusahaan", icon: "M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4", count: subsidiaries.length },
    { key: "dividen" as TabKey, label: "Dividen", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", count: dividends.length },
  ] as TabDef[]).filter((t) => t.count > 0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);

  if (tabs.length === 0) return null;

  return (
    <div className="relative">
      {/* Collapsible header */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (isExpanded) setActiveTab(null);
          else if (!activeTab && tabs.length > 0) setActiveTab(tabs[0].key);
        }}
        className="w-full indicator-card depth-shadow p-4 flex items-center justify-between group hover:border-accent/30 transition-all press-scale"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
              <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-text-primary">Data Perusahaan</span>
            <span className="ml-2 text-[11px] font-mono text-text-tertiary tabular-nums">{totalCount} data points</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5">
            {tabs.slice(0, 4).map((tab) => (
              <span key={tab.key} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-bg-hover text-text-tertiary">
                {tab.label}
                {tab.count > 1 && <span className="ml-1 font-mono">{tab.count}</span>}
              </span>
            ))}
            {tabs.length > 4 && (
              <span className="text-[10px] text-text-tertiary">+{tabs.length - 4}</span>
            )}
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-text-tertiary transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 fade-in space-y-3">
          {/* Tab bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(activeTab === tab.key ? null : tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap press-scale ${
                  activeTab === tab.key
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-white/[0.04] text-text-secondary border border-white/[0.06] hover:bg-white/[0.08] hover:text-text-primary"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={tab.icon} />
                </svg>
                {tab.label}
                <span className={`text-[11px] font-mono tabular-nums ${
                  activeTab === tab.key ? "text-accent/60" : "text-text-tertiary"
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
              {activeTab === "direksi" && <DirectorsTab directors={directors} />}
              {activeTab === "pemegang-saham" && <ShareholdersTab shareholders={shareholders} />}
              {activeTab === "anak-perusahaan" && <SubsidiariesTab subsidiaries={subsidiaries} />}
              {activeTab === "dividen" && <DividendHistoryTab dividends={dividends} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
