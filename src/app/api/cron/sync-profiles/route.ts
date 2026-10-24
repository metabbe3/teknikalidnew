import { NextRequest, NextResponse } from "next/server";
import { stockSyncService } from "@/domains/stock/stock-sync.service";
import type { IDXProfileResponse } from "@/lib/idx-api";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export const dynamic = "force-dynamic";

/**
 * Ingest company profile detail (IDX ListedCompany/GetCompanyProfilesDetail) —
 * pre-fetched via Playwright (CF-blocked from server). Dipanggil oleh
 * ~/.hermes/scripts/idx_profile_sync.py. Menjaga tabel StockDirector/
 * StockCommissioner/StockShareholder tetap fresh.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const profiles = body?.profiles as { ticker: string; detail: IDXProfileResponse }[] | undefined;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: "profiles array kosong" }, { status: 400 });
    }
    const { status: logStatus, body: logBody } = await withCronLogging("sync-profiles", async () => {
      let ok = 0, fail = 0;
      const errors: string[] = [];
      for (const { ticker, detail } of profiles) {
        try {
          await stockSyncService.processCompanyProfile(`${ticker}.JK`, detail);
          ok++;
        } catch (e) {
          fail++;
          if (errors.length < 5) errors.push(`${ticker}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return { status: 200, body: { ok, fail, errors } as Record<string, unknown> };
    });
    return NextResponse.json(logBody, { status: logStatus });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
