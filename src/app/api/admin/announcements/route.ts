import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { announcementService } from "@/domains/notification/announcement.service";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** POST /api/admin/announcements — admin-only site broadcast (bell + optional banner). */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Khusus admin" }, { status: 403 });
    }
    const payload = (await request.json()) as {
      title?: string; body?: string; severity?: string; withBanner?: boolean;
    };
    const result = await announcementService.broadcast({
      title: payload.title ?? "",
      body: payload.body ?? "",
      severity:
        payload.severity === "warning" || payload.severity === "critical"
          ? payload.severity
          : "info",
      withBanner: payload.withBanner,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "broadcast announcement");
  }
}
