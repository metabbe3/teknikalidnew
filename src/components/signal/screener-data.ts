import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";

export type ScreenerFetchResult = { stocks: Record<string, unknown>[]; failed: boolean };

/**
 * Fetch screener rows for a signal page. Fail-closed: on error (or error result)
 * returns failed=true so the page renders an "unavailable" notice instead of a
 * fake "no stocks match" empty state. One retry covers post-deploy ISR re-bake
 * blips when the DB pool is still warming up.
 */
export async function fetchScreenerRows(signal: string, take = 30): Promise<ScreenerFetchResult> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await technicalAnalysisService.screenerQuery(signal);
      if (result && !("error" in result)) {
        return { stocks: Array.isArray(result) ? result.slice(0, take) : [], failed: false };
      }
      console.error(`[signal-page] screenerQuery(${signal}) returned error result`, result);
    } catch (e) {
      console.error(
        `[signal-page] screenerQuery(${signal}) attempt ${attempt} gagal:`,
        e instanceof Error ? e.message : e,
      );
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 700)); // retry once for post-restart blip
  }
  return { stocks: [], failed: true };
}
