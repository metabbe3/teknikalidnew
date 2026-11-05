export function signalBadge(score: number): { label: string; cls: string } {
  if (score >= 0.6) return { label: "Sinyal Kuat", cls: "badge-strong" };
  if (score >= 0.2) return { label: "Mulai Menguat", cls: "badge-warm" };
  if (score > -0.2) return { label: "Netral — Wait & See", cls: "badge-neutral" };
  return { label: "Rawan Koreksi", cls: "badge-risk" };
}
