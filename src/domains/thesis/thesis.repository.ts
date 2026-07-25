import { prisma } from "@/lib/prisma";

type ThesisInput = {
  bias: string;
  targetPrice: number | null;
  stopLoss: number | null;
  rationale: string | null;
};

export const thesisRepository = {
  findUserThesis(userId: string, ticker: string) {
    return prisma.stockThesis.findUnique({
      where: { userId_ticker: { userId, ticker } },
    });
  },

  findUserTheses(userId: string) {
    return prisma.stockThesis.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  },

  upsertThesis(userId: string, ticker: string, data: ThesisInput) {
    return prisma.stockThesis.upsert({
      where: { userId_ticker: { userId, ticker } },
      update: data,
      create: { userId, ticker, ...data },
    });
  },

  deleteThesis(userId: string, ticker: string) {
    return prisma.stockThesis.delete({
      where: { userId_ticker: { userId, ticker } },
    });
  },

  findAll() {
    return prisma.stockThesis.findMany({});
  },

  updateLastNotifiedBreach(id: string, value: string | null) {
    return prisma.stockThesis.update({
      where: { id },
      data: { lastNotifiedBreach: value },
    });
  },
};
