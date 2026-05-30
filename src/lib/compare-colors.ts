export const COMPARE_COLORS = [
  { line: "#2563eb", bg: "bg-blue-500/10", text: "text-blue-600", dot: "bg-blue-500", border: "border-blue-500/30" },
  { line: "#dc2626", bg: "bg-red-500/10", text: "text-red-600", dot: "bg-red-500", border: "border-red-500/30" },
  { line: "#16a34a", bg: "bg-green-500/10", text: "text-green-600", dot: "bg-green-500", border: "border-green-500/30" },
  { line: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-600", dot: "bg-amber-500", border: "border-amber-500/30" },
] as const;

export function getCompareColor(index: number) {
  return COMPARE_COLORS[index % COMPARE_COLORS.length];
}
