"use client";

import { useState } from "react";
import type { CompareStock } from "@/hooks/use-compare-data";
import { KeyStatisticsTab } from "./tabs/key-statistics-tab";
import { TechnicalIndicatorsTab } from "./tabs/technical-indicators-tab";
import { FundamentalsTab } from "./tabs/fundamentals-tab";
import { TradingPlansTab } from "./tabs/trading-plans-tab";

interface Props {
  stocks: CompareStock[];
}

const TABS = [
  { key: "stats", label: "Key Statistics" },
  { key: "technical", label: "Technical" },
  { key: "fundamentals", label: "Fundamentals" },
  { key: "plans", label: "Trading Plans" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ComparisonTable({ stocks }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("stats");

  return (
    <div className="space-y-3">
      {/* Underline tab bar */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.key
                ? "border-cyan-500 text-text-primary font-semibold"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {activeTab === "stats" && <KeyStatisticsTab stocks={stocks} />}
        {activeTab === "technical" && <TechnicalIndicatorsTab stocks={stocks} />}
        {activeTab === "fundamentals" && <FundamentalsTab stocks={stocks} />}
        {activeTab === "plans" && <TradingPlansTab stocks={stocks} />}
      </div>
    </div>
  );
}
