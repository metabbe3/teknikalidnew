/**
 * Centralized environment configuration with Zod validation.
 * All env var access should go through this module instead of process.env directly.
 *
 * Usage:
 *   import { env } from "@/config/env";
 *   const dbUrl = env.DATABASE_URL;
 */

import { z } from "zod";

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_RUNTIME: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Cron / Security
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // Site
  SITE_URL: z.string().url().default("https://teknikal.id"),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),

  // Anthropic AI
  ANTHROPIC_AUTH_TOKEN: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),
  ANTHROPIC_MODEL: z.string().optional(),

  // Midtrans Payment
  MIDTRANS_IS_PRODUCTION: z.string().transform((v) => v === "true"),
  MIDTRANS_SERVER_KEY: z.string().min(1, "MIDTRANS_SERVER_KEY is required"),
  MIDTRANS_CLIENT_KEY: z.string().min(1, "MIDTRANS_CLIENT_KEY is required"),
  MIDTRANS_MERCHANT_ID: z.string().optional(),

  // ComfyUI (image generation)
  COMFYUI_URL: z.string().url().optional(),
  COMFYUI_OUTPUT_DIR: z.string().optional(),

  // Sentry / Monitoring
  SENTRY_DSN: z.string().url().optional(),

  // QStash (Upstash)
  QSTASH_TOKEN: z.string().optional(),

  // Stock data
  AI_DAILY_STOCK_COUNT: z.preprocess(
    (v) => (typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().positive(),
  ).default(864),
  API_TIMEOUT_MS: z.preprocess(
    (v) => (typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().positive(),
  ).default(30000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // In dev/test, fail loudly. In production, log warning but continue with raw values.
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Invalid environment configuration:\n${errors}`);
    }

    console.error(`[env] Invalid environment configuration:\n${errors}`);
    // Fall back to raw process.env to avoid crashing production
    return process.env as unknown as Env;
  }

  return parsed.data;
}

/**
 * Validated environment variables.
 * Access via `env.DATABASE_URL` instead of `process.env.DATABASE_URL`.
 */
export const env = loadEnv();
