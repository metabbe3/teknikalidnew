/**
 * GET /api/cron/retention-email — day-2 pull email (PRD idea-2026-10-19-1 /
 * queue prd-2026-10-22-01). Job harian: pilih user baru ber-sinyal
 * (createdAt offset WIB-day 1–2) → render → kirim via mailer
 * (DRY-RUN default tanpa RETENTION_EMAIL_API_KEY, owner-gated).
 *
 * ?readOnly=1 → preview murni: seleksi + render, 0 tulis DB (audit malam).
 *
 * SEC-REVIEW: Bearer CRON_SECRET (pola resolve-predictions); 0 input user
 * (penerima dari DB internal); prisma parameterized; endpoint internal-cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { runRetentionEmailJob } from "@/lib/retention-email.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const readOnly = request.nextUrl.searchParams.get("readOnly") === "1";

  try {
    const { status, body } = await withCronLogging("retention-email", async () => {
      // dryRun dibiarkan undefined → mailer resolve via env (owner-gate):
      // key + RETENTION_EMAIL_DRY_RUN=0 = kirim nyata; selain itu dry-run aman.
      const result = await runRetentionEmailJob({ readOnly });
      return {
        status: 200,
        body: result as unknown as Record<string, unknown>,
      };
    });
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
