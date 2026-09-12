import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Screener Saham IDX — Filter 950+ Saham by Sinyal Teknikal",
  description:
    "Filter 950+ saham IDX dengan sinyal teknikal seperti golden cross, RSI oversold, dan volume spike — cara cepat trader Indonesia menemukan ide beli setiap hari.",
  openGraph: {
    title: "Screener Saham IDX — Filter 950+ Saham by Sinyal Teknikal | TeknikalID",
    description:
      "Filter 950+ saham IDX dengan sinyal teknikal seperti golden cross, RSI oversold, dan volume spike — cara cepat trader Indonesia menemukan ide beli setiap hari.",
  },
};

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
