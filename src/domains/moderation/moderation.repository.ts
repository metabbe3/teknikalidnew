import { prisma } from "@/lib/prisma";
import type { ReportTarget, ReportReason, ReportStatus } from "@/generated/prisma/client";

export const moderationRepository = {
  createReport(data: {
    reporterId: string;
    targetType: ReportTarget;
    targetId: string;
    reason: ReportReason;
  }) {
    return prisma.report.create({ data });
  },

  findReportById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  },

  findPendingReports(params: { cursor?: string; limit: number }) {
    return prisma.report.findMany({
      take: params.limit + 1,
      where: {
        status: "PENDING",
        ...(params.cursor ? { id: { lt: params.cursor } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
    });
  },

  updateReportStatus(id: string, status: ReportStatus) {
    return prisma.report.update({
      where: { id },
      data: { status },
    });
  },

  reviewWithAction(params: {
    reportId: string;
    targetType: string;
    targetId: string;
    authorId: string | null;
    action: "delete" | "ban";
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: params.reportId },
        data: { status: "REVIEWED" },
      });

      if (params.targetType === "POST") {
        await tx.post.delete({ where: { id: params.targetId } }).catch((e: { code?: string }) => {
          if (e?.code !== "P2025") throw e;
        });
      } else {
        await tx.comment.delete({ where: { id: params.targetId } }).catch((e: { code?: string }) => {
          if (e?.code !== "P2025") throw e;
        });
      }

      if (params.action === "ban" && params.authorId) {
        await tx.user.update({
          where: { id: params.authorId },
          data: { bannedAt: new Date() },
        });
      }
    });
  },
};
