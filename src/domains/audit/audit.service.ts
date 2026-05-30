import { auditRepository } from "./audit.repository";

export const auditService = {
  async log(userId: string, action: string, details?: Record<string, unknown>, ipAddress?: string) {
    await auditRepository.create({ userId, action, details, ipAddress }).catch(() => {
      // Audit logging should never fail the main operation
    });
  },

  async getRecent(limit: number) {
    return auditRepository.findRecent(limit);
  },
};
