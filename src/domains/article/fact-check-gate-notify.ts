import { prisma } from "@/lib/prisma";
import type { FactCheckResult } from "./article-fact-check";

/**
 * Admin notification when the Publish Fact-Check Gate holds an article as
 * DRAFT (prd-2026-10-05-01 / AC1). Uses the existing AGENT_ALERT notification
 * type + ADMIN-role recipient pattern (preseden anomaly-detection.agent.ts).
 *
 * Fire-and-forget: a notification failure must NEVER fail the publish path —
 * the article is already safely held in DRAFT at this point.
 */
export async function notifyFactCheckHold(opts: {
  articleId: string;
  title: string;
  slug: string;
  factCheck: FactCheckResult | null;
}): Promise<boolean> {
  try {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (!admin) return false;

    const mismatches = opts.factCheck?.mismatches ?? [];
    const detail = mismatches
      .slice(0, 5)
      .map((m) => m.description)
      .join(" | ");

    await prisma.notification.create({
      data: {
        type: "AGENT_ALERT",
        recipientId: admin.id,
        actorId: admin.id,
        ticker: null,
        meta: {
          kind: "fact_check_hold",
          articleId: opts.articleId,
          slug: opts.slug,
          title: opts.title,
          mismatchCount: mismatches.length,
          detail: detail || "fact-check gagal total tanpa koreksi",
        },
      },
    });
    console.warn(`[FactCheckGate] HELD as DRAFT: "${opts.title.slice(0, 60)}" (${mismatches.length} mismatches) — admin notified`);
    return true;
  } catch (err) {
    console.error("[FactCheckGate] admin notify failed (article stays held):", err instanceof Error ? err.message : err);
    return false;
  }
}
