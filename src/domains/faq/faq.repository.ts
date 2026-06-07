import { prisma } from "@/lib/prisma";
import { QuestionStatus, Prisma } from "@/generated/prisma/client";
import { DuplicateVoteError } from "./faq.errors";

export const faqRepository = {
  async findPublished(opts: {
    category?: string;
    tag?: string;
    ticker?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = opts.limit ?? 20;
    const where: Prisma.QuestionWhereInput = {
      status: QuestionStatus.ANSWERED,
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.tag ? { tags: { has: opts.tag } } : {}),
      ...(opts.ticker ? { relatedTickers: { has: opts.ticker } } : {}),
      ...(opts.cursor ? { publishedAt: { lt: new Date(opts.cursor) } } : {}),
    };

    const items = await prisma.question.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit + 1,
      include: {
        submittedBy: { select: { id: true, username: true, name: true, image: true } },
      },
    });

    const hasNextPage = items.length > limit;
    const trimmed = hasNextPage ? items.slice(0, limit) : items;
    const nextCursor = hasNextPage
      ? trimmed[trimmed.length - 1].publishedAt?.toISOString()
      : undefined;

    return { items: trimmed, nextCursor };
  },

  findPublishedBySlug(slug: string) {
    return prisma.question.findUnique({
      where: { slug, status: QuestionStatus.ANSWERED },
      include: {
        submittedBy: { select: { id: true, username: true, name: true, image: true } },
        feedback: true,
      },
    });
  },

  findTrending(limit: number) {
    return prisma.question.findMany({
      where: { status: QuestionStatus.ANSWERED },
      orderBy: { helpfulVotes: "desc" },
      take: limit,
      include: {
        submittedBy: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  searchPublished(query: string) {
    return prisma.question.findMany({
      where: {
        status: QuestionStatus.ANSWERED,
        OR: [
          { question: { contains: query, mode: "insensitive" } },
          { shortAnswer: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { helpfulVotes: "desc" },
      include: {
        submittedBy: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  findPublishedByTicker(ticker: string, limit: number) {
    return prisma.question.findMany({
      where: {
        status: QuestionStatus.ANSWERED,
        relatedTickers: { has: ticker },
      },
      orderBy: { helpfulVotes: "desc" },
      take: limit,
      include: {
        submittedBy: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  findPending(limit: number) {
    return prisma.question.findMany({
      where: { status: QuestionStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        submittedBy: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  findPublishedForSitemap() {
    return prisma.question.findMany({
      where: { status: QuestionStatus.ANSWERED },
      select: { slug: true, updatedAt: true },
    });
  },

  create(data: Prisma.QuestionCreateInput) {
    return prisma.question.create({ data });
  },

  update(id: string, data: Prisma.QuestionUpdateInput) {
    return prisma.question.update({ where: { id }, data });
  },

  incrementViews(id: string) {
    return prisma.question.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  },

  async vote(questionId: string, userId: string, isHelpful: boolean) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.questionFeedback.findUnique({
        where: { userId_questionId: { userId, questionId } },
      });

      if (existing) {
        throw new DuplicateVoteError();
      }

      await tx.questionFeedback.create({
        data: { questionId, userId, isHelpful },
      });

      const field = isHelpful ? "helpfulVotes" : "unhelpfulVotes";
      await tx.question.update({
        where: { id: questionId },
        data: { [field]: { increment: 1 } },
      });
    });
  },

  async countByStatus() {
    const [pending, answered, rejected] = await Promise.all([
      prisma.question.count({ where: { status: QuestionStatus.PENDING } }),
      prisma.question.count({ where: { status: QuestionStatus.ANSWERED } }),
      prisma.question.count({ where: { status: QuestionStatus.REJECTED } }),
    ]);
    return { pending, answered, rejected };
  },

  async slugExists(slug: string): Promise<boolean> {
    const question = await prisma.question.findUnique({
      where: { slug },
      select: { id: true },
    });
    return question !== null;
  },
};
