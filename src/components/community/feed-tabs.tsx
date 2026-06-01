"use client";

interface FeedTabsProps {
  active: "semua" | "mengikuti";
  onChange: (tab: "semua" | "mengikuti") => void;
}

export function FeedTabs({ active, onChange }: FeedTabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      <button
        onClick={() => onChange("semua")}
        className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
          active === "semua"
            ? "text-gray-900"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        Semua
        {active === "semua" && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gray-900 rounded-full" />
        )}
      </button>
      <button
        onClick={() => onChange("mengikuti")}
        className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
          active === "mengikuti"
            ? "text-gray-900"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        Mengikuti
        {active === "mengikuti" && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gray-900 rounded-full" />
        )}
      </button>
    </div>
  );
}
