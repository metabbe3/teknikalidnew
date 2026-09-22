/**
 * Persistent IP blocklist with an in-memory cache.
 *
 * `banUser` and the proxy's scrape-escalation write IPs here; `proxy.ts` checks
 * `isBlocked` on every stock-route request. The cache makes the hot path O(1) and
 * refreshes from the `BlockedIp` table on a 60s TTL, so blocks survive restarts
 * and propagate across instances within ≤60s. Prisma is imported dynamically
 * (matching the proxy pattern) so this module is safe to import at module top.
 */

let cache: Set<string> | null = null;
let refreshedAt = 0;
// ponytail: 60s TTL. Multi-instance picks up a new block within ≤60s; tighten if
// that lag matters. Upgrade path: a shared Upstash/Redis set (already a dep).
const REFRESH_MS = 60_000;

async function refresh(): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.blockedIp.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { ip: true },
  });
  cache = new Set(rows.map((r) => r.ip));
  refreshedAt = Date.now();
}

/** O(1) blocked check; refreshes the cache if stale. */
export async function isBlocked(ip: string | null | undefined): Promise<boolean> {
  if (!ip) return false;
  // 2026-09-23: prefix blanket-block REMOVED (botgate-2026-09-21-01, owner approved).
  // The 2404:c0:: prefix is Telkomsel residential IPv6 — owner + real users share it.
  // Blanket match mis-flagged ~350 views/week as bots (owner's own logins included).
  // Bot defense now relies on: per-IP BlockedIp rows + rate limits + ASN tripwire.
  if (!cache || Date.now() - refreshedAt > REFRESH_MS) {
    await refresh();
  }
  return cache?.has(ip) ?? false;
}

/**
 * Persist a block (survives restart) + add to the in-memory cache immediately.
 * Omit `expiresAt` for a permanent block (confirmed bots / manual bans); pass a
 * Date for a self-expiring block (scrape-escalation cooldowns). `refresh()` only
 * loads rows where expiresAt IS NULL OR expiresAt > now, so expired rows drop out
 * of the cache within the 60s TTL.
 */
export async function block(
  ip: string,
  reason: string,
  bannedUserId?: string,
  expiresAt?: Date,
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  await prisma.blockedIp.upsert({
    where: { ip },
    create: { ip, reason, bannedUserId, expiresAt },
    update: { reason, bannedUserId, expiresAt }, // re-block refreshes reason + expiry
  });
  cache?.add(ip);
}

/** Remove a block (admin unblock). */
export async function unblock(ip: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  await prisma.blockedIp.delete({ where: { ip } }).catch(() => {});
  cache?.delete(ip);
}
