import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { articleService } from "@/domains/article/article.service";
import { auditRepository } from "@/domains/audit/audit.repository";
import { auditService } from "@/domains/audit/audit.service";
import { handleApiError } from "@/lib/api-error";

// GET /api/admin/articles/review — PUBLISHED articles awaiting editor sign-off.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const data = await articleService.listPendingReview();
    // KPI 30 hari + riwayat keputusan editor (bo-2026-10-22-01), satu sumber: AuditLog.
    // historyAll utk hitung KPI 30d (take 500 = batas atas realistis 146 backlog + harian);
    // history utk render = 50 terakhir.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const historyAll = await auditRepository.findRecentByActions(["admin:review_article"], 500, since);
    const actionOf = (h: { details: unknown }) => (h.details as { action?: string } | null)?.action ?? "approve";
    const stats = {
      pending: data.length,
      approved30d: historyAll.filter((h) => actionOf(h) === "approve").length,
      rejected30d: historyAll.filter((h) => actionOf(h) === "reject").length,
    };
    const history = historyAll.slice(0, 50).map((h) => ({
      at: h.createdAt.toISOString(),
      editor: h.user?.username ?? h.user?.email ?? h.user?.name ?? "?",
      action: actionOf(h),
      note: (h.details as { note?: string } | null)?.note ?? null,
      articleId: (h.details as { articleId?: string } | null)?.articleId ?? null,
    }));
    return NextResponse.json({ data, stats, history });
  } catch (error) {
    return handleApiError(error, "list pending article reviews");
  }
}

// POST /api/admin/articles/review { id } — record a real human editor approval.
// Sets reviewedById => byline flips to "Diproduksi oleh sistem TeknikalID · Ditinjau oleh [editor]".
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { id, action = "approve", note } = await request.json();
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action harus approve atau reject" }, { status: 400 });
    }
    if (note !== undefined && typeof note !== "string") {
      return NextResponse.json({ error: "note harus string" }, { status: 400 });
    }
    if (action === "reject") {
      await articleService.rejectArticle(id, session.user.id, note);
    } else {
      await articleService.approveArticle(id, session.user.id);
    }
    const ip = request.headers.get("x-forwarded-for") ?? undefined;
    await auditService.log(session.user.id, "admin:review_article", { articleId: id, action, note: note ?? null }, ip);
    return NextResponse.json({ data: { id, reviewed: action === "approve", action } });
  } catch (error) {
    return handleApiError(error, "approve article review");
  }
}
