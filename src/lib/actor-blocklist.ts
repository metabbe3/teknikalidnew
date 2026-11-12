/**
 * Actor blocklist — ops-2026-11-11-01 (VERDICT CEO 11 Nov 06:57: APPROVE OPSI B).
 *
 * Latar (bo-2026-11-11-01): 2 saver BARU jam 02:25-02:49 WIB 11 Nov = verify agen
 * TANPA prefix qa- SETELAH guard ops-2026-11-10-03 — filter NOT LIKE 'qa-%' tak
 * menangkap actor UUID acak. Tanpa blocklist, T3 funnel bisa inflated 2x lagi.
 *
 * Kontrak:
 * - SATU PINTU: daftar + fragment SQL filter hidup di file ini saja; konsumen
 *   (funnel-v2 route + retention.service) merender via guardActorSql(), bukan
 *   literal tersebar (anti drift — pola sama QA_ACTOR_SQL_GUARD ops-2026-11-10-03).
 * - Data-integrity instrumen KPI: TIDAK memblokir ingest beacon; hanya
 *   mengecualikan actor dari komputasi metrik kanonik + log visibility.
 * - Freeze-safe: 0 migrasi DB, 0 perubahan schema, rollback = revert commit.
 *
 * Identitas actor dlm blocklist: anonId/initialAnonId UUID penuh (bukan prefix).
 */
import { Prisma } from "@/generated/prisma/client";

/**
 * Saver-smoke 11 Nov 02:25-02:49 WIB (bo-2026-11-11-01):
 * - a035afcf: 20 PV + 45 event, UA 'Android 10; K' CDP-emulation, path
 *   /stocks→/bottom-fishing→/saham-oversold→/agent→tg_pantau_klik
 * - bd8a46cb: 10 PV + 29 event, sesi 24 mnt, pola identik
 * Ditambahkan: 11 Nov 2026 (CTO night, ACK CEO opsi-B).
 */
export const BLOCKED_ACTORS: readonly string[] = Object.freeze([
  "a035afcf-c4f4-4646-9e78-187798a4fdbe",
  "bd8a46cb-7d96-4fc6-a6c5-f7a4855aa968",
  // ops-2026-11-12-01 rider-2 (CEO APPROVE 12 Nov; QA Sentinel 11 Nov konfirmasi
  // known-smoke 10 Nov): e7df9d38 41PV+95ev, 4f00932f 22PV+78ev — replay T3 9→7.
  // HOLD (JANGAN tambah tanpa CEO): 2 kandidat pending review bo (lihat bo-2026-11-12-01
   // needs_owner #2) — jangan tulis UUID-nya di file ini agar tak terbaca sbg entri aktif.
  "e7df9d38-f569-4b85-afbb-f30df636651d",
  "4f00932f-1e74-4fcc-a089-614e91da656e",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True bila id cocok actor blocklist (exact UUID, case-insensitive utk aman). */
export function isBlockedActor(id: string | null | undefined): boolean {
  if (!id) return false;
  return BLOCKED_ACTORS.some((a) => a.toLowerCase() === id.toLowerCase());
}

/**
 * Fragment SQL kondisi exclusion utk raw query Prisma.
 * Return Prisma.Sql `AND actor_expr NOT IN (bound params)` — nilai di-bind sebagai
 * parameter (bukan string-interpolate) sehingga aman injection; list kosong →
 * Prisma.empty (0 fragment) supaya query tak rusak saat blocklist dikosongkan.
 *
 * Dipakai di: funnel-v2 route (CTE pv + ev), retention.service (sparkline + cohort).
 */
export function guardActorSql(actorExpr: Prisma.Sql | string): Prisma.Sql {
  if (BLOCKED_ACTORS.length === 0) return Prisma.empty;
  const expr = typeof actorExpr === "string" ? Prisma.raw(actorExpr) : actorExpr;
  if (!BLOCKED_ACTORS.every((a) => UUID_RE.test(a))) {
    // Anti-injection invariant: hanya UUID kanonik yang pernah di-bind.
    throw new Error("actor-blocklist: entri bukan UUID kanonik");
  }
  return Prisma.sql` AND ${expr} NOT IN (${Prisma.join(BLOCKED_ACTORS)})`;
}
