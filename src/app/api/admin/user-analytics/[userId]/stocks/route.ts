import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Per-user stock browsing: top tickers viewed + last seen (30d window).
// Basis: PageView.userId (terisi saat auth) — path /stocks/<TICKER>.JK.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAdmin();
    const { userId } = await params;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [user, views, lastView] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, name: true, createdAt: true },
      }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: {
          userId,
          isBot: false,
          createdAt: { gte: since },
          path: { startsWith: "/stocks/" },
        },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.pageView.findFirst({
        where: { userId, isBot: false },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, path: true },
      }),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const stocks = views.map((v) => {
      const ticker = v.path.replace("/stocks/", "").split("/")[0] || v.path;
      return { ticker, views: v._count.path, path: v.path };
    });

    return NextResponse.json({
      user,
      stocks,
      totalStockViews: stocks.reduce((s, x) => s + x.views, 0),
      lastActive: lastView?.createdAt ?? null,
      lastPath: lastView?.path ?? null,
    });
  } catch (e) {
    return handleApiError(e, "admin user-stocks");
  }
}
