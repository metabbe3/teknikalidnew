import { test } from "node:test";
import assert from "node:assert/strict";
import { withTicket, singleFlight, configurePool, gateStats, QueueFullError } from "../src/domains/ai/ai-gate.service";

test("mlx gate: 1 aktif, kedua masuk antrean lalu diproses setelah release", async () => {
  configurePool("test-serial", { maxConcurrent: 1, maxQueueDepth: 4, maxWaitMs: 3000 });
  let inFlight = 0;
  const task = (ms: number) => withTicket("test-serial", async () => {
    inFlight++;
    assert.equal(inFlight, 1, "HARUS serial — tidak boleh 2 bersamaan");
    await new Promise((r) => setTimeout(r, ms));
    inFlight--;
  });
  await Promise.all([task(60), task(60), task(60)]); // 3 paralel dari caller
  const s = gateStats("test-serial") as Record<string, { admitted: number }>;
  assert.equal(s["test-serial"].admitted, 3);
});

test("queue-full: antrean melebihi depth → QueueFullError cepat", async () => {
  configurePool("test-full", { maxConcurrent: 1, maxQueueDepth: 1, maxWaitMs: 500 });
  const first = withTicket("test-full", async () => new Promise((r) => setTimeout(r, 150)));
  const second = withTicket("test-full", async () => 2); // mengisi antrean (depth 1)
  await assert.rejects(
    withTicket("test-full", async () => 3), // ketiga → full
    QueueFullError,
  );
  await Promise.allSettled([first, second]);
});

test("single-flight: 2 call key sama = 1 eksekusi", async () => {
  let runs = 0;
  const fn = async () => { runs++; await new Promise((r) => setTimeout(r, 40)); return runs; };
  const [a, b] = await Promise.all([singleFlight("k1", fn), singleFlight("k1", fn)]);
  assert.equal(runs, 1, "fn hanya boleh jalan sekali");
  assert.equal(a, b);
});

test("maxWaitMs: penunggu keluar dgn QueueFullError saat timeout", async () => {
  configurePool("test-timeout", { maxConcurrent: 1, maxQueueDepth: 4, maxWaitMs: 120 });
  const slow = withTicket("test-timeout", async () => new Promise((r) => setTimeout(r, 400)));
  await assert.rejects(withTicket("test-timeout", async () => 1), QueueFullError);
  await slow;
});
