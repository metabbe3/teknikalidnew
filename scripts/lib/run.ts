import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

/**
 * Shared script runner. Handles startup logging, error handling,
 * and Prisma disconnection boilerplate.
 */
export async function runScript(name: string, fn: () => Promise<void>) {
  console.log(`[${name}] Starting...`);
  try {
    await fn();
    console.log(`[${name}] Complete.`);
  } catch (e) {
    console.error(`[${name}] Failed:`, e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
