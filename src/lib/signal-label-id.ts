// UI/UX audit 30 Okt #2: map label EN (data lama di DB) → ID utk display.
// Satu pintu: indicator.service kini menulis label ID; util ini menutup data historis
// sampai ter-overwrite siklus update berikutnya. Input ID → return apa adanya.
const MAP: Record<string, string> = {
  "Strong Bullish": "Sangat Menguat",
  "Bullish": "Menguat",
  "Neutral": "Netral",
  "Netral": "Netral",
  "Bearish": "Melemah",
  "Strong Bearish": "Sangat Melemah",
};

export function signalLabelId(label: string | null | undefined): string {
  if (!label) return "Netral";
  return MAP[label] ?? label;
}
