import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import Link from "next/link";

export const revalidate = 60;

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

  const reportItems = await Promise.all(
    reports.map(async (report) => {
      let targetPreview = "";

      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: { content: true, author: { select: { username: true } } },
        });
        targetPreview = post
          ? `Post oleh @${post.author.username}: "${post.content.slice(0, 80)}${post.content.length > 80 ? "..." : ""}"`
          : "[Post dihapus]";
      } else {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: { content: true, author: { select: { username: true } } },
        });
        targetPreview = comment
          ? `Komentar oleh @${comment.author.username}: "${comment.content.slice(0, 80)}${comment.content.length > 80 ? "..." : ""}"`
          : "[Komentar dihapus]";
      }

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        createdAt: report.createdAt.toISOString(),
        reporter: report.reporter,
        targetPreview,
      };
    })
  );

  const reasonLabels: Record<string, string> = {
    SPAM: "Spam",
    ABUSE: "Pelecehan",
    MISINFORMATION: "Misinformasi",
    OTHER: "Lainnya",
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
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <button
                  data-action="delete-report"
                  data-report-id={report.id}
                  data-target-type={report.targetType}
                  data-target-id={report.targetId}
                  className="text-xs font-medium text-bearish hover:text-bearish/80 bg-bearish/5 px-3 py-1.5 rounded-full transition-colors press-scale"
                >
                  Hapus Konten
                </button>
                <button
                  data-action="dismiss-report"
                  data-report-id={report.id}
                  className="text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-hover px-3 py-1.5 rounded-full transition-colors press-scale"
                >
                  Abaikan
                </button>
                <button
                  data-action="ban-user"
                  data-report-id={report.id}
                  data-target-type={report.targetType}
                  data-target-id={report.targetId}
                  className="text-xs font-medium text-white bg-text-primary hover:opacity-90 px-3 py-1.5 rounded-full transition-opacity press-scale"
                >
                  Ban User
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
