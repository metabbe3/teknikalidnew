export const BADGE_TIERS = [
  { min: 2000, level: "Legend", color: "amber" },
  { min: 1000, level: "Master Trader", color: "purple" },
  { min: 500, level: "Expert", color: "gold" },
  { min: 200, level: "Senior Analyst", color: "teal" },
  { min: 100, level: "Trader Aktif", color: "blue" },
  { min: 50, level: "Analis", color: "indigo" },
  { min: 25, level: "Pengamat", color: "cyan" },
  { min: 10, level: "Pemula", color: "slate" },
] as const;

export function getBadge(reputation: number): { level: string; color: string } {
  for (const tier of BADGE_TIERS) {
    if (reputation >= tier.min) return { level: tier.level, color: tier.color };
  }
  return { level: "Pemula", color: "slate" };
}
