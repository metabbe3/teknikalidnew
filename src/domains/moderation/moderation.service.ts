import { moderationRepository } from "./moderation.repository";
import { communityRepository } from "@/domains/community/community.repository";
import type { ReportTarget, ReportReason } from "@/generated/prisma/client";
import {
  MissingFieldsError,
  InvalidTargetTypeError,
  InvalidReasonError,
  TargetNotFoundError,
  ReportNotFoundError,
  ReportAlreadyReviewedError,
  InvalidActionError,
} from "./moderation.errors";

const VALID_TARGET_TYPES = ["POST", "COMMENT"] as const;
const VALID_REASONS = ["SPAM", "ABUSE", "MISINFORMATION", "OTHER"] as const;
const VALID_ACTIONS = ["delete", "dismiss", "ban"] as const;

async function resolveTargetAuthor(targetType: string, targetId: string): Promise<string | null> {
  if (targetType === "POST") {
    const post = await communityRepository.findPostAuthorId(targetId);
    return post?.authorId ?? null;
  }
  const comment = await communityRepository.findCommentById(targetId);
  return comment?.authorId ?? null;
}

async function verifyTargetExists(targetType: string, targetId: string): Promise<void> {
  if (targetType === "POST") {
    const post = await communityRepository.findPostAuthorId(targetId);
    if (!post) throw new TargetNotFoundError("post");
  } else {
    const comment = await communityRepository.findCommentById(targetId);
    if (!comment) throw new TargetNotFoundError("comment");
  }
}

export const moderationService = {
  async createReport(
    userId: string,
    targetType: string,
    targetId: string,
    reason: string,
  ) {
    if (!targetType || !targetId || !reason) {
      throw new MissingFieldsError();
    }

    if (!VALID_TARGET_TYPES.includes(targetType as ReportTarget)) {
      throw new InvalidTargetTypeError();
    }

    if (!VALID_REASONS.includes(reason as ReportReason)) {
      throw new InvalidReasonError();
    }

    await verifyTargetExists(targetType, targetId);

    return moderationRepository.createReport({
      reporterId: userId,
      targetType: targetType as ReportTarget,
      targetId,
      reason: reason as ReportReason,
    });
  },

  async getPendingReports(cursor?: string | null, limitParam?: string | null) {
    const limit = Math.min(parseInt(limitParam || "20", 10), 50);

    const reports = await moderationRepository.findPendingReports({
      cursor: cursor ?? undefined,
      limit,
    });

    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, -1) : reports;

    return {
      data: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },

  async reviewReport(reportId: string, action: string) {
    if (!action || !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
      throw new InvalidActionError();
    }

    const report = await moderationRepository.findReportById(reportId);
    if (!report) throw new ReportNotFoundError();
    if (report.status !== "PENDING") throw new ReportAlreadyReviewedError();

    if (action === "dismiss") {
      const updated = await moderationRepository.updateReportStatus(reportId, "DISMISSED");
      return { action, reportId, report: updated };
    }

    const authorId = await resolveTargetAuthor(report.targetType, report.targetId);

    await moderationRepository.reviewWithAction({
      reportId,
      targetType: report.targetType,
      targetId: report.targetId,
      authorId,
      action: action as "delete" | "ban",
    });

    return { action, reportId };
  },
};
