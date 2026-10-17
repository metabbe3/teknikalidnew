import { createHash } from "crypto";
import { parseUtmParam } from "./validation";

/**
 * Waitlist lead-capture v1.5 (prd-2026-10-17-01 / idea-2026-10-17-1b).
 * Pure logic yang dipakai /api/waitlist — diextract agar testable (node:test).
 */

/** AC2: source = utm_source ter-sanitasi (whitelist ^[a-z0-9_-]{1,32}$ via
 *  parseUtmParam — pola hook register prd-2026-10-01-01). Tanpa/invalid →
 *  "direct". Output selalu muat kolom WaitlistSubscriber.source VarChar(64). */
export function sanitizeWaitlistSource(raw: string | null | undefined): string {
  return parseUtmParam(raw) ?? "direct";
}

/** AC1: normalisasi nomor WA Indonesia → hash (privasi: nomor plain tidak
 *  disimpan utk channel wa; email disimpan plain karena diperlukan utk kirim).
 *  Perilaku identik dgn implementasi lama di route.ts (dipindah, bukan diubah). */
export function normalizeWa(raw: string): { ok: boolean; hashed?: string; pretty?: string } {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!digits.startsWith("62")) digits = "62" + digits;
  if (!/^62\d{8,13}$/.test(digits)) return { ok: false };
  const hashed = createHash("sha256").update(digits).digest("hex");
  return { ok: true, hashed, pretty: "+" + digits };
}

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;
