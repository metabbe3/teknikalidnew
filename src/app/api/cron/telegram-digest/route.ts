/**
 * POST / GET /api/cron/telegram-digest — FASE T5: Mesin Distribusi Telegram
 *
 * Alasan route baru (sesuai API Reuse Rule AGENTS.md):
 * Domain pengiriman broadcast digest harian ke bot Telegram (via Telegram Bot API +
 * deduplikasi tabel TelegramSent `digest:YYYY-MM-DD`). Untuk data pasar & artikel,
 * 100% REUSE SATU PINTU (`articleRepository`, `stockMarketService`, `pasarLiveService`).
 *
 * Mendukung query/body `?dryRun=1` & `?force=1` untuk pengujian aman (NO-PROBE) tanpa
 * mengirim pesan nyata ke subscriber Telegram.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { telegramDigestService } from "@/domains/telegram/telegram-digest.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";
import { withTimeout } from "@/domains/cron-monitoring/with-timeout";

export const maxDuration = 300;

async function handleDigestCron(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const searchParams = request.nextUrl.searchParams;
  let force = searchParams.get("force") === "1" || searchParams.get("force") === "true";
  let dryRun = searchParams.get("dryRun") === "1" || searchParams.get("dryRun") === "true";

  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (typeof body?.force === "boolean") force = body.force;
      if (typeof body?.dryRun === "boolean") dryRun = body.dryRun;
    } catch {
      // Body kosong pada panggilan cron standar — abaikan
    }
  }

  try {
    const { status, body } = await withCronLogging("telegram-digest", () =>
      withTimeout(
        async () => {
          const result = await telegramDigestService.runDailyDigest({ force, dryRun });
          return {
            status: 200,
            body: result as unknown as Record<string, unknown>,
          };
        },
        60_000,
        "telegram-digest",
      ),
    );
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleDigestCron(request);
}

export async function GET(request: NextRequest) {
  return handleDigestCron(request);
}
