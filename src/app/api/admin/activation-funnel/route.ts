import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { getActivationFunnelData } from "@/domains/analytics/activation-funnel.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/activation-funnel
 *
 * Agregat funnel aktivasi pengunjung & guest AI chat 7 hari terakhir.
 * Khusus admin (harus 401 jika bukan admin).
 * Mengembalikan format JSON: { days: [...], totals: {...} }
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getActivationFunnelData(7);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "ambil data funnel aktivasi");
  }
}
