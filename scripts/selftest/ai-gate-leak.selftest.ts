/**
 * Selftest fix-2026-10-26-04: slot-leak saat waiter timeout di AI gate pool.
 *
 * Bukti leak: tanpa fix, waiter mati (timeout) tetap di p.queue; release
 * berikutnya shift waiter mati itu, resolve(true) no-op, p.active tak turun.
 * Test ini bikin timeout terjadi lalu assert slot masih bisa dipakai.
 *
 * Run: npx tsx scripts/selftest/ai-gate-leak.selftest.ts
 */
import { acquire, configurePool, gateStats } from "../../src/domains/ai/ai-gate.service";

const POOL = "selftest-leak";
configurePool(POOL, { maxConcurrent: 1, maxQueueDepth: 8, maxWaitMs: 50 });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

async function testA() {
  // Task 1: hold slot.
  const first = await acquire(POOL);
  assert(first.ok, "A: task pertama harus langsung admitted");

  // Task 2: antre, pasti timeout (maxWaitMs 50ms).
  const second = await acquire(POOL);
  assert(!second.ok, "A: task kedua harus timeout (ok:false)");
  assert(second.reason === "queue-full", "A: reason timeout = queue-full");

  // Release task 1. Tanpa fix: release shift waiter MATI task 2, slot bocor.
  first.ok && first.release();

  // Task 3 (KETIGA): harus admitted LANGSUNG — bukti slot tidak bocor.
  const third = await acquire(POOL);
  assert(third.ok, "A: task ketiga harus admitted setelah release (slot bocor kalau gagal)");
  assert(third.ok && third.info.waitedMs < 50, "A: task ketiga tidak boleh lewat antrean lagi");

  const stats = gateStats(POOL)[POOL] as { active: number; queued: number };
  assert(stats.queued === 0, "A: queue harus kosong setelah timeout+release");
  assert(stats.active === 1, "A: active harus 1 (task ketiga), tidak lebih");

  third.ok && third.release();
  const after = gateStats(POOL)[POOL] as { active: number; rejected: number };
  assert(after.active === 0, "A: active harus kembali 0 setelah release terakhir");
  assert(after.rejected >= 1, "A: stats.rejected harus tercatat dari timeout task kedua");
}

async function testB() {
  // Hold slot, lalu 5x timeout berturut-turut.
  const holder = await acquire(POOL);
  assert(holder.ok, "B: holder harus admitted");

  for (let i = 1; i <= 5; i++) {
    const w = await acquire(POOL);
    assert(!w.ok, `B: percobaan timeout ke-${i} harus ok:false`);
  }

  holder.ok && holder.release();

  // Setelah 5 timeout + release, task baru masih dapat slot.
  const fresh = await acquire(POOL);
  assert(fresh.ok, "B: task baru harus admitted setelah 5x timeout (5 slot bocor kalau gagal)");
  assert(fresh.ok && fresh.info.waitedMs < 50, "B: task baru tidak boleh lewat antrean lagi");
  fresh.ok && fresh.release();

  const stats = gateStats(POOL)[POOL] as { active: number; queued: number; rejected: number };
  assert(stats.active === 0, "B: active harus 0 di akhir");
  assert(stats.queued === 0, "B: queue harus kosong di akhir");
  assert(stats.rejected >= 6, "B: stats.rejected kumulatif >= 6 (1 dari A + 5 dari B)");
}

async function main() {
  await testA();
  await testB();
  console.log("PASS: slot tidak bocor setelah waiter timeout (fix-2026-10-26-04)");
}

main();
