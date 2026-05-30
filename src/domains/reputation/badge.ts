export const BADGE_TIERS = [
  { min: 500, level: "Expert", color: "gold" },
  { min: 200, level: "Senior Analyst", color: "teal" },
  { min: 50, level: "Analyst", color: "blue" },
] as const;

export function getBadge(reputation: number): { level: string; color: string } {
  for (const tier of BADGE_TIERS) {
    if (reputation >= tier.min) return { level: tier.level, color: tier.color };
  }
  return { level: "Newcomer", color: "" };
}
