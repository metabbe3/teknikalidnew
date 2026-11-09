import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === "production" ? 20 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);
  const opts: ConstructorParameters<typeof PrismaClient>[0] = { adapter };
  // fix-2026-11-09: sementara aktif utk diagnosis slow-query (slow query log ke stdout → docker logs).
  // Non-aktifkan setelah root cause tuntas.
  if (process.env.PRISMA_SLOW_LOG === "1") {
    (opts as { log?: unknown[] }).log = [
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "error" },
      { emit: "event", level: "query" },
    ];
  }
  const client = new PrismaClient(opts);
  if (process.env.PRISMA_SLOW_LOG === "1") {
    const THRESHOLD_MS = 200;
    (client as unknown as { $on: (e: string, cb: (ev: { timestamp: Date; query: string; durationMs: number }) => void) => void }).$on("query" as never, (ev) => {
      if (ev.durationMs >= THRESHOLD_MS) {
        process.stdout.write(`[PRISMA-SLOW] ${ev.durationMs}ms ${ev.query.replace(/\s+/g, " ").slice(0, 400)}\n`);
      }
    });
  }
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
