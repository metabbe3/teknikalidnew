import { auditRepository } from "./audit.repository";

export const auditService = {
  async log(userId: string, action: string, details?: Record<string, unknown>, ipAddress?: string) {
    await auditRepository.create({ userId, action, details, ipAddress }).catch((err) => {
      // Audit logging should never fail the main operation — but must be visible in logs
      console.error("[audit] log failed:", { action, err: String(err) });
    });
  },

  async getRecent(limit: number) {
    return auditRepository.findRecent(limit);
  },

  async getRecentByActions(actions: string[], limit = 50, since?: Date) {
    return auditRepository.findRecentByActions(actions, Math.min(Math.max(1, limit), 200), since);
  },
};
