import { prisma } from "@/lib/prisma";

export const auditRepository = {
  create(data: { userId: string; action: string; details?: Record<string, unknown>; ipAddress?: string }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: data.details ? JSON.parse(JSON.stringify(data.details)) : undefined,
        ipAddress: data.ipAddress,
      },
    });
  },

  findRecent(limit: number) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, email: true, name: true } } },
    });
  },

  // Review-history helpers (bo-2026-10-22-01): keputusan editor dari AuditLog.
  findRecentByActions(actions: string[], limit: number, since?: Date) {
    return prisma.auditLog.findMany({
      where: { action: { in: actions }, ...(since ? { createdAt: { gte: since } } : {}) },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, email: true, name: true } } },
    });
  },
};
