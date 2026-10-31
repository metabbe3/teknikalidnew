import { prisma } from "@/lib/prisma";
import { buildPreviewsFromRows, type ReportLike } from "./report-preview.util";
import { requireAdmin } from "@/lib/auth-guard";
import Link from "next/link";
import { ReportActions } from "./report-actions";

export const revalidate = 60;

// ── code-audit-tk-2: batch preview laporan (dulu findUnique post/comment
// PER LAPORAN dalam Promise.all = N+1; kini 2 findMany utk semua laporan).
// String preview satu pintu di report-preview.util (di-selftest parity).
async function buildReportPreviews(reports: ReportLike[]): Promise<Map<string, string>> {
  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: reports.filter((r) => r.targetType === "POST").map((r) => r.targetId) } },
      select: { id: true, content: true, author: { select: { username: true } } },
    }),
    prisma.comment.findMany({
      where: { id: { in: reports.filter((r) => r.targetType !== "POST").map((r) => r.targetId) } },
      select: { id: true, content: true, author: { select: { username: true } } },
    }),
  ]);
  return buildPreviewsFromRows(reports, posts, comments);
}

export default async function AdminReportsPage() {
  await requireAdmin();

  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { id: true, username: true, name: true, image: true },
      },
    },
  });

  // code-audit-tk-2: N+1 post/comment findUnique per laporan -> batch findMany.
  // Paritas preview per laporan dijaga helper reportPreview() (satu pintu).
  const pendingPreviews = await buildReportPreviews(reports);
  const reportItems = reports.map((report) => ({
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    createdAt: report.createdAt.toISOString(),
    reporter: report.reporter,
    targetPreview: pendingPreviews.get(report.id) ?? "",
  }));

  const reasonLabels: Record<string, string> = {
    SPAM: "Spam",
    ABUSE: "Pelecehan",
    MISINFORMATION: "Misinformasi",
    OTHER: "Lainnya",
  };

  // Riwayat: laporan yang sudah diputus + reviewer dari AuditLog (admin:review_report)
  const reviewedReports = await prisma.report.findMany({
    where: { status: { in: ["REVIEWED", "DISMISSED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const reviewLogs = await prisma.auditLog.findMany({
    where: { action: "admin:review_report" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, username: true } } },
  });
  const reviewByReportId = new Map<
    string,
    { reviewer: string; reviewedAt: string; action: string }
  >();
  for (const log of reviewLogs) {
    const details = log.details as { reportId?: string; action?: string } | null;
    if (!details?.reportId || reviewByReportId.has(details.reportId)) continue;
    reviewByReportId.set(details.reportId, {
      reviewer: log.user?.username ?? log.user?.name ?? "admin",
      reviewedAt: log.createdAt.toISOString(),
      action: details.action ?? "",
    });
  }

  const historyPreviews = await buildReportPreviews(reviewedReports);
  const historyItems = reviewedReports.map((report) => ({
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    reporter: report.reporter,
    targetPreview: historyPreviews.get(report.id) ?? "",
    review: reviewByReportId.get(report.id) ?? null,
  }));

  const actionLabels: Record<string, string> = {
    delete: "Hapus Konten",
    dismiss: "Abaikan",
    ban: "Ban User",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Moderasi</h1>
          <p className="text-text-secondary text-sm">
            {reportItems.length} laporan menunggu ditinjau
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Kembali
        </Link>
      </div>

      {reportItems.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-text-secondary">Tidak ada laporan yang menunggu.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-grid">
          {reportItems.map((report, i) => (
            <div
              key={report.id}
              style={{ "--stagger-i": i } as React.CSSProperties}
              className="bg-bg-card depth-shadow rounded-xl p-5 space-y-3"
            >
              {/* Report header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-bg-hover text-text-secondary px-2 py-0.5 rounded-full">
                    {report.targetType === "POST" ? "Post" : "Komentar"}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-bearish/10 text-bearish px-2 py-0.5 rounded-full">
                    {reasonLabels[report.reason] || report.reason}
                  </span>
                </div>
                <span className="text-xs text-text-secondary shrink-0">
                  {new Date(report.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Target preview */}
              <p className="text-sm text-text-primary leading-relaxed break-words">
                {report.targetPreview}
              </p>

              {/* Reporter */}
              <p className="text-xs text-text-secondary">
                Dilaporkan oleh{" "}
                <Link
                  href={`/profile/${report.reporter.username}`}
                  className="text-accent hover:underline font-medium"
                >
                  @{report.reporter.username}
                </Link>
              </p>

              {/* Actions */}
              <ReportActions
                reportId={report.id}
                targetType={report.targetType}
                targetId={report.targetId}
              />
            </div>
          ))}
        </div>
      )}

      {/* Riwayat moderasi */}
      <section className="space-y-3 pt-2 border-t border-border">
        <h2 className="text-lg font-semibold">Riwayat</h2>

        {historyItems.length === 0 ? (
          <p className="text-center text-text-secondary text-sm py-8">
            Belum ada riwayat moderasi.
          </p>
        ) : (
          <div className="space-y-3">
            {historyItems.map((report) => (
              <div key={report.id} className="bg-bg-card depth-shadow rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        report.status === "REVIEWED"
                          ? "bg-bullish/10 text-bullish"
                          : "bg-bg-hover text-text-secondary"
                      }`}
                    >
                      {report.status === "REVIEWED" ? "Ditinjau" : "Diabaikan"}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide bg-bg-hover text-text-secondary px-2 py-0.5 rounded-full">
                      {report.targetType === "POST" ? "Post" : "Komentar"}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide bg-bearish/10 text-bearish px-2 py-0.5 rounded-full">
                      {reasonLabels[report.reason] || report.reason}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary shrink-0">
                    Dilaporkan{" "}
                    {new Date(report.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="text-sm text-text-primary leading-relaxed break-words">
                  {report.targetPreview}
                </p>

                <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-2">
                  <p className="text-xs text-text-secondary">
                    Dilaporkan oleh{" "}
                    <Link
                      href={`/profile/${report.reporter.username}`}
                      className="text-accent hover:underline font-medium"
                    >
                      @{report.reporter.username}
                    </Link>
                  </p>
                  {report.review ? (
                    <p className="text-xs text-text-secondary">
                      Ditinjau oleh <span className="font-medium text-text-primary">@{report.review.reviewer}</span>{" "}
                      · {actionLabels[report.review.action] || report.review.action} ·{" "}
                      {new Date(report.review.reviewedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-text-secondary italic">Reviewer tidak diketahui</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
