/**
 * Alias internal POST/GET /api/cron/daily-digest → mendelegasikan ke /api/cron/telegram-digest (FASE T5).
 * Alasan route: backward-compatibility untuk jadwal pemanggil eksternal (Hermes/agentd cron)
 * yang memanggil path `/api/cron/daily-digest` maupun `/api/cron/telegram-digest`.
 */
export { POST, GET, maxDuration } from "../telegram-digest/route";
