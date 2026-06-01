"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/domains/reputation/achievements";

export function AchievementToast({ types, onDone }: { types: string[]; onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (types.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {types.map((type) => {
        const def = ACHIEVEMENTS[type as keyof typeof ACHIEVEMENTS];
        if (!def) return null;
        return (
          <div key={type} className="bg-white rounded-xl shadow-lg border border-teal-200 px-4 py-3 flex items-center gap-3 mb-2 min-w-[240px]">
            <span className="text-2xl">{def.icon}</span>
            <div>
              <p className="text-xs text-teal-600 font-medium">Pencapaian Terbuka!</p>
              <p className="text-sm font-bold text-gray-900">{def.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
