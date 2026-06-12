export function timeAgo(
  date: string | Date | null,
  locale: "id" | "en" = "id",
): string {
  if (!date) return locale === "id" ? "Tidak ada" : "Never";
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);

  if (locale === "en") {
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }

  if (seconds < 60) return "baru saja";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} hari lalu`;
  return new Date(date).toLocaleDateString("id-ID");
}
