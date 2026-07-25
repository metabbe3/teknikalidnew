import { redirect } from "next/navigation";

/**
 * Screener was merged into the Saham page (/stocks?view=screener).
 * The primary redirect is in next.config.ts (308 permanent, query forwarded).
 * This stub is a fallback that forwards any searchParams (tab/preset) if reached.
 */
export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]],
    ),
  ).toString();
  redirect(`/stocks?view=screener${qs ? `&${qs}` : ""}`);
}
