import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { screenerRepository } from "./screener.repository";
import { ScreenerNotFoundError, ScreenerLimitError, ScreenerNameExistsError, AlertNotFoundError } from "./screener.errors";

const MAX_SCREENER_COUNT = 10;

export const screenerService = {
  async listSaved(userId: string) {
    return screenerRepository.findByUserId(userId);
  },

  async getSaved(userId: string, id: string) {
    const screener = await screenerRepository.findById(id, userId);
    if (!screener) throw new ScreenerNotFoundError();
    return screener;
  },

  async save(
    userId: string,
    data: {
      name: string;
      description?: string;
      filters: Record<string, string>;
      tradingStyle?: string;
    },
  ) {
    // Enforce limit
    const count = await screenerRepository.countByUserId(userId);
    if (count >= MAX_SCREENER_COUNT) throw new ScreenerLimitError();

    // Check unique name
    const existing = await screenerRepository.findByUserId(userId);
    if (existing.some((s) => s.name === data.name)) {
      throw new ScreenerNameExistsError(data.name);
    }

    return screenerRepository.create({
      name: data.name,
      description: data.description,
      filters: data.filters as unknown as Prisma.InputJsonValue,
      tradingStyle: data.tradingStyle,
      user: { connect: { id: userId } },
    });
  },

  async updateSaved(
    userId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      filters?: Record<string, string>;
      tradingStyle?: string;
    },
  ) {
    // Auth check
    const existing = await screenerRepository.findById(id, userId);
    if (!existing) throw new ScreenerNotFoundError();

    // Check unique name if renaming
    if (data.name && data.name !== existing.name) {
      const all = await screenerRepository.findByUserId(userId);
      if (all.some((s) => s.name === data.name)) {
        throw new ScreenerNameExistsError(data.name);
      }
    }

    return screenerRepository.update(id, userId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.filters !== undefined && { filters: data.filters as unknown as Prisma.InputJsonValue }),
      ...(data.tradingStyle !== undefined && { tradingStyle: data.tradingStyle }),
    });
  },

  async deleteSaved(userId: string, id: string) {
    // Auth check
    const existing = await screenerRepository.findById(id, userId);
    if (!existing) throw new ScreenerNotFoundError();

    return screenerRepository.delete(id, userId);
  },

  async setDefault(userId: string, id: string) {
    // Auth check
    const existing = await screenerRepository.findById(id, userId);
    if (!existing) throw new ScreenerNotFoundError();

    // Reset all defaults, then set this one
    await screenerRepository.resetAllDefaults(userId);
    return screenerRepository.update(id, userId, { isDefault: true });
  },

  async updateLastRun(id: string, resultCount: number) {
    return prisma.savedScreener.update({
      where: { id },
      data: { lastRunAt: new Date(), lastResultCount: resultCount },
    });
  },

  // ── Alert methods ──

  async listAlerts(userId: string) {
    return screenerRepository.findAlertsByUserId(userId);
  },

  async createAlert(
    userId: string,
    data: { savedScreenerId: string; frequency: string },
  ) {
    // Verify ownership of the screener
    const screener = await screenerRepository.findById(data.savedScreenerId, userId);
    if (!screener) throw new ScreenerNotFoundError();

    // Check if alert already exists for this screener (one-to-one)
    const existing = await screenerRepository.findAlertByScreenerId(data.savedScreenerId);
    if (existing) {
      // Re-enable if disabled
      if (!existing.isEnabled) {
        return screenerRepository.updateAlert(existing.id, { isEnabled: true });
      }
      return existing;
    }

    return screenerRepository.createAlert({
      userId,
      savedScreenerId: data.savedScreenerId,
      frequency: data.frequency,
    });
  },

  async updateAlert(
    userId: string,
    id: string,
    data: { isEnabled?: boolean; frequency?: string },
  ) {
    const alert = await screenerRepository.findAlertById(id, userId);
    if (!alert) throw new AlertNotFoundError();

    return screenerRepository.updateAlert(id, data);
  },

  async deleteAlert(userId: string, id: string) {
    const alert = await screenerRepository.findAlertById(id, userId);
    if (!alert) throw new AlertNotFoundError();

    return screenerRepository.deleteAlert(id);
  },
};
