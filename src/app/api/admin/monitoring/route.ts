import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLatencySnapshot } from "@/lib/api-latency-log";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * adm-2026-11-09 — Monitoring hub API: satu pintu untuk 3 sumber:
 *  1. latency   → snapshot live + flush terakhir per route (api-latency-log)
 *  2. queries   → pg_stat_statements top slow (via $queryRaw — butuh superuser? tidak:
 *                 teknikalid = superuser di container ini, pg_read_all_stats default utk owner)
 *  3. errors    → AppErrorLog terbaru (already DB-backed)
 */
async function getSlowQueries() {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ avg_ms: string; calls: string; total_s: string; query: string }>
    >`
      SELECT round(mean_exec_time::numeric,1) AS avg_ms,
             calls::text,
             round((total_exec_time/1000)::numeric,1) AS total_s,
             left(regexp_replace(query, E'[\\n\\r\\t ]+', ' ', 'g'), 220) AS query
      FROM pg_stat_statements
      WHERE query NOT ILIKE '%pg_stat_statements%'
        AND calls > 3
      ORDER BY mean_exec_time DESC
      LIMIT 25`;
    return rows.map((r) => ({
      avgMs: Number(r.avg_ms),
      calls: Number(r.calls),
      totalS: Number(r.total_s),
      query: r.query,
    }));
  } catch (e) {
    return [{ avgMs: -1, calls: 0, totalS: 0, query: `pg_stat_statements error: ${String(e).slice(0, 120)}` }];
  }
}

async function getErrors() {
  try {
    const rows = await prisma.appErrorLog.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { kind: true, path: true, message: true, count: true, createdAt: true, updatedAt: true },
    });
    return rows;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "OWNER"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 }); // anti-fingerprint: 404, bukan 401
  }
  const url = new URL(req.url);
  const section = url.searchParams.get("section") ?? "all";

  const out: Record<string, unknown> = { ok: true, section, at: new Date().toISOString() };
  if (section === "all" || section === "latency") {
    out.latency = await getLatencySnapshot();
  }
  if (section === "all" || section === "queries") {
    out.queries = await getSlowQueries();
  }
  if (section === "all" || section === "errors") {
    out.errors = await getErrors();
  }
  return NextResponse.json(out);
}
