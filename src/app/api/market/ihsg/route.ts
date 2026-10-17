import { NextResponse } from "next/server";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// ref-2026-10-17-02: delegate ke market-snapshot (satu pintu doctrine).
// Sebelumnya: computeChange(findLatestPrices(2)) — baris kedua array,
// jalur berbeda dari snapshot (LATERAL per-saham). Shape respons
// (data.close/prevClose/change/changePercent/date) dipertahankan
// demi konsumen use-ihsg.ts.
export async function GET() {
  try {
    const snap = await marketSnapshotService.getSnapshot();
    const ihsg = snap.ihsg;
    if (!ihsg) {
      return NextResponse.json({ data: null });
    }
    const close = ihsg.close;
    const prevClose = Math.round((close / (1 + ihsg.changePercent / 100)) * 100) / 100;
    return NextResponse.json({
      data: {
        close,
        prevClose,
        change: Math.round((close - prevClose) * 100) / 100,
        changePercent: ihsg.changePercent,
        date: snap.sessionDate,
      },
    });
  } catch (error) {
    return handleApiError(error, "fetch IHSG price");
  }
}
