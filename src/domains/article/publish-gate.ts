import type { FactCheckResult } from "./article-fact-check";

/**
 * Publish Fact-Check Gate (prd-2026-10-05-01 / PRD idea-2026-10-05-1).
 *
 * Pure decision function: given a factCheck result, decide what happens to an
 * article that is about to be auto-published. No I/O, no side effects — fully
 * unit-testable. Callers own the actual status flip + admin notification.
 *
 * Semantics (AC1):
 *  - fact-check unavailable (null — extraction failed, no token, ctx error):
 *    FAIL-OPEN → publish. Gate must not take down the daily brief pipeline
 *    (AC5: no >20% false-positive holds). This matches today's behavior.
 *  - passed → publish.
 *  - !passed with a corrected artifact (content or title) → publish-corrected
 *    (deterministic DB-value substitution already applied by caller).
 *  - !passed with NOTHING correctable → hold-draft. The article is stored as
 *    DRAFT + admin notified; it never goes live wrong (12 QA P1 correctness
 *    incidents 23 Sep–5 Okt were exactly this case: wrong numbers published,
 *    fixed only after readers saw them).
 */
export type PublishGateDecision =
  | { action: "publish" }
  | { action: "publish-corrected" }
  | { action: "hold-draft"; reason: string };

export function decidePublish(factCheck: FactCheckResult | null): PublishGateDecision {
  if (!factCheck) {
    return { action: "publish" };
  }
  if (factCheck.passed) {
    return { action: "publish" };
  }
  if (factCheck.correctedContent || factCheck.correctedTitle) {
    return { action: "publish-corrected" };
  }
  return {
    action: "hold-draft",
    reason:
      factCheck.mismatches.length > 0
        ? `${factCheck.mismatches.length} klaim angka tidak cocok dengan DB dan tidak bisa dikoreksi otomatis`
        : "fact-check gagal total (tidak passed, tanpa koreksi)",
  };
}

/**
 * generationMeta fields for every gated publish (AC4 visibility).
 * Mirrors the shape already used by generateNewsArticle since 2026-09.
 */
export function factCheckMetaFor(
  factCheck: FactCheckResult | null,
  held: boolean,
): Record<string, string> {
  if (!factCheck) {
    return { factCheckPassed: "unavailable" };
  }
  return {
    factCheckPassed: String(factCheck.passed),
    factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
    factCheckErrors: String(factCheck.mismatches.length),
    factCheckCorrected: String(!factCheck.passed && !!(factCheck.correctedContent || factCheck.correctedTitle)),
    ...(held ? { factCheckHeld: "true" } : {}),
  };
}
