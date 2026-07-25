import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const screenerRepository = {
  findByUserId(userId: string) {
    return prisma.savedScreener.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  },

  findById(id: string, userId: string) {
    return prisma.savedScreener.findFirst({
      where: { id, userId },
    });
  },

  create(data: Prisma.SavedScreenerCreateInput) {
    return prisma.savedScreener.create({ data });
  },

  update(id: string, userId: string, data: Prisma.SavedScreenerUpdateInput) {
    return prisma.savedScreener.update({
      where: { id, userId },
      data,
    });
  },

  delete(id: string, userId: string) {
    return prisma.savedScreener.delete({
      where: { id, userId },
    });
  },

  countByUserId(userId: string) {
    return prisma.savedScreener.count({ where: { userId } });
  },

  resetAllDefaults(userId: string) {
    return prisma.savedScreener.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  },

  findDefaultByUserId(userId: string) {
    return prisma.savedScreener.findFirst({
      where: { userId, isDefault: true },
    });
  },

  // ── Alert methods ──

  findAlertsByUserId(userId: string) {
    return prisma.screenerAlert.findMany({
      where: { userId },
      include: { savedScreener: { select: { name: true, filters: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findAlertById(id: string, userId: string) {
    return prisma.screenerAlert.findFirst({
      where: { id, userId },
    });
  },

  findAlertByScreenerId(savedScreenerId: string) {
    return prisma.screenerAlert.findUnique({
      where: { savedScreenerId },
    });
  },

  createAlert(data: { userId: string; savedScreenerId: string; frequency: string }) {
    return prisma.screenerAlert.create({ data });
  },

  updateAlert(id: string, data: { isEnabled?: boolean; frequency?: string; lastTriggeredAt?: Date; lastMatchCount?: number }) {
    return prisma.screenerAlert.update({
      where: { id },
      data,
    });
  },

  deleteAlert(id: string) {
    return prisma.screenerAlert.delete({
      where: { id },
    });
  },

  findEnabledAlerts() {
    return prisma.screenerAlert.findMany({
      where: { isEnabled: true },
      include: { savedScreener: true },
    });
  },
};
