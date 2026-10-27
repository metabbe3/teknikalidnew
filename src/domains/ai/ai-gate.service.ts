/**
 * AI Gate — admission control + antrean FIFO untuk resource terbatas.
 *
 * ref-2026-10-17-04 (owner: "waiting room ... so not all hitting our AI
 * on the same time but can be reused later for other API").
 *
 * Kenapa IN-PROCESS (bukan network layer / nginx / Cloudflare waiting room):
 * traffic teknikal.id ~155 PV/hari, 1 Next instance — layer jaringan terpisah
 * = infra baru untuk masalah yang belum ada. Gate ini menyelesaikan masalah
 * NYATA hari ini: MLX generate serial (GEN_LOCK) ±7s per request; 2+ user
 * bersamaan = request ke-2 nunggu diam-diam sampai timeout tanpa feedback.
 *
 * Perilaku:
 *  - Kapasitas ada   → langsung proses (zero overhead, tak ada antrean).
 *  - Penuh           → masuk FIFO; client tahu posisi antrean (UX jujur).
 *  - Antrean penuh   → 429 + retryAfter (fail fast, bukan hang).
 *  - Single-flight   → request identik yang menyusul menumpang hasil yang
 *                      sama (dedupe) — MLX tidak dijalankan dua kali.
 *
 * REUSABLE (API Reuse Rule): pool = nama string. Hari ini "mlx"; besok
 * "fal-image", "pdf-render", api apa pun yang lambat/terbatas — konsumen
 * cukup panggil withTicket(pool, fn). Tidak perlu service baru per API.
 */

type Waiter = {
  resolve: (granted: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
  enqueuedAt: number;
};

type PoolConfig = {
  maxConcurrent: number;
  maxQueueDepth: number;
  maxWaitMs: number;
};

type Pool = PoolConfig & {
  active: number;
  queue: Waiter[];
  stats: { admitted: number; rejected: number; deduped: number; totalWaitMs: number };
};

const DEFAULTS: PoolConfig = { maxConcurrent: 1, maxQueueDepth: 8, maxWaitMs: 30_000 };

const pools = new Map<string, Pool>();

function getPool(name: string): Pool {
  let p = pools.get(name);
  if (!p) {
    p = { ...DEFAULTS, active: 0, queue: [], stats: { admitted: 0, rejected: 0, deduped: 0, totalWaitMs: 0 } };
    pools.set(name, p);
  }
  return p;
}

/** Konfigurasi pool (idempoten) — panggil sekali saat boot route/module. */
export function configurePool(name: string, cfg: Partial<PoolConfig>) {
  const p = getPool(name);
  Object.assign(p, { ...DEFAULTS, ...cfg });
}

export type TicketInfo = {
  /** posisi di antrean saat acquire; 0 = langsung diproses. */
  position: number;
  /** ms yang dihabiskan menunggu di antrean (0 kalau langsung). */
  waitedMs: number;
};

export type AcquireResult =
  | { ok: true; release: () => void; info: TicketInfo }
  | { ok: false; reason: "queue-full"; retryAfterMs: number; queueDepth: number };

/**
 * Ambil slot. Resolve segera kalau ada kapasitas; kalau tidak, masuk FIFO
 * dan menunggu maxWaitMs (atau slot terbuka). TIDAK busy-wait.
 */
export function acquire(name: string): Promise<AcquireResult> {
  const p = getPool(name);
  if (p.active < p.maxConcurrent) {
    p.active++;
    p.stats.admitted++;
    return Promise.resolve({
      ok: true,
      release: makeRelease(p),
      info: { position: 0, waitedMs: 0 },
    });
  }
  if (p.queue.length >= p.maxQueueDepth) {
    p.stats.rejected++;
    return Promise.resolve({
      ok: false,
      reason: "queue-full" as const,
      retryAfterMs: Math.min(p.maxWaitMs, 3_000),
      queueDepth: p.queue.length,
    });
  }
  const position = p.queue.length + 1;
  return new Promise<AcquireResult>((resolve) => {
    const waiter: Waiter = {
      resolve: (granted) => {
        clearTimeout(waiter.timer);
        if (granted) {
          p.stats.admitted++;
          p.stats.totalWaitMs += Date.now() - waiter.enqueuedAt;
          resolve({
            ok: true,
            release: makeRelease(p),
            info: { position, waitedMs: Date.now() - waiter.enqueuedAt },
          });
        } else {
          p.stats.rejected++;
          resolve({ ok: false, reason: "queue-full", retryAfterMs: 2_000, queueDepth: p.queue.length });
        }
      },
      // fix-2026-10-26-04: waiter yang timeout WAJIB keluar dari queue.
      // Kalau tidak, makeRelease() nanti shift waiter mati ini, resolve(true)
      // no-op (promise sudah settled false), release-nya tak pernah dipanggil
      // siapa pun → p.active tak turun → slot bocor permanen per timeout.
      timer: setTimeout(() => {
        const i = p.queue.indexOf(waiter);
        if (i !== -1) p.queue.splice(i, 1);
        waiter.resolve(false);
      }, p.maxWaitMs),
      enqueuedAt: Date.now(),
    };
    p.queue.push(waiter);
  });
}

function makeRelease(p: Pool) {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = p.queue.shift();
    if (next) next.resolve(true);
    else p.active = Math.max(0, p.active - 1);
  };
}

/**
 * Wrapper satu-liner: dengan slot → jalankan fn; penuh → lempar QueueFullError
 * (route menangkap → 429 + retryAfter). fn HARUS resolve/reject akhirnya
 * memanggil release (ditangani di sini via finally).
 */
export class QueueFullError extends Error {
  retryAfterMs: number;
  queueDepth: number;
  constructor(retryAfterMs: number, queueDepth: number) {
    super("AI sedang sibuk — antrean penuh");
    this.retryAfterMs = retryAfterMs;
    this.queueDepth = queueDepth;
  }
}

export async function withTicket<T>(name: string, fn: (info: TicketInfo) => Promise<T>): Promise<T> {
  const res = await acquire(name);
  if (!res.ok) throw new QueueFullError(res.retryAfterMs, res.queueDepth);
  try {
    return await fn(res.info);
  } finally {
    res.release();
  }
}

/**
 * Single-flight: request identik yang menyusul menunggu hasil pertama
 * (dedupe — MLX tak dijalankan dua kali untuk pertanyaan sama).
 * key = cache key yang sudah dibentuk konsumen (preset+hash data, ticker, dst).
 */
const flights = new Map<string, Promise<unknown>>();

export async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = flights.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => flights.delete(key));
  flights.set(key, p);
  return p;
}

/** Statistik pool utk monitoring/dashboard (read-only snapshot). */
export function gateStats(name?: string) {
  const names = name ? [name] : [...pools.keys()];
  const out: Record<string, unknown> = {};
  for (const n of names) {
    const p = getPool(n);
    const waits = p.stats.admitted;
    out[n] = {
      active: p.active,
      queued: p.queue.length,
      maxConcurrent: p.maxConcurrent,
      maxQueueDepth: p.maxQueueDepth,
      admitted: p.stats.admitted,
      rejected: p.stats.rejected,
      avgWaitMs: waits > 0 ? Math.round(p.stats.totalWaitMs / waits) : 0,
    };
  }
  return out;
}
