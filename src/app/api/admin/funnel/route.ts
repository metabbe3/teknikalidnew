import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/funnel?days=30
 *
 * Daily conversion funnel (WIB calendar days, matching the admin date-filter
 * convention): human pageviews → /auth views → registrations.
 * /auth tracking shipped 2026-09-07, so the auth stages start empty before that.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const days = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("days")) || 30, 7),
      90,
    );

    const rows = await prisma.$queryRaw<
      {
        day: Date;
        views: bigint;
        signin: bigint;
        register: bigint;
        complete: bigint;
        authed: bigint;
        signups: bigint;
      }[]
    >`
      WITH pv AS (
        SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date AS day,
               ("userId" IS NOT NULL) AS authed,
               path
        FROM "PageView"
        WHERE "isBot" = false
          AND "createdAt" >= (now() - (${days} || ' days')::interval)
      )
      SELECT pv.day,
             count(*) AS views,
             count(*) FILTER (WHERE pv.path = '/auth/signin') AS signin,
             count(*) FILTER (WHERE pv.path = '/auth/register') AS register,
             count(*) FILTER (WHERE pv.path = '/auth/complete-profile') AS complete,
             count(*) FILTER (WHERE pv.authed) AS authed,
             (SELECT count(*) FROM "User" u
               WHERE (u."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date = pv.day
                 AND u.email NOT LIKE '%test%') AS signups
      FROM pv
      GROUP BY pv.day
      ORDER BY pv.day DESC
    `;

    const series = rows.map((r) => ({
      day: r.day,
      views: Number(r.views),
      signin: Number(r.signin),
      register: Number(r.register),
      complete: Number(r.complete),
      authed: Number(r.authed),
      signups: Number(r.signups),
    }));

    const totals = series.reduce(
      (acc, s) => ({
        views: acc.views + s.views,
        signin: acc.signin + s.signin,
        register: acc.register + s.register,
        complete: acc.complete + s.complete,
        signups: acc.signups + s.signups,
      }),
      { views: 0, signin: 0, register: 0, complete: 0, signups: 0 },
    );

    // Register-page views per utmSource over the same window — attribution of
    // the signup hook (e.g. signal_page / stocks_screener vs null = organic/direct).
    // UTM tracking shipped 2026-10-04; earlier rows are all null by design.
    const utmRows = await prisma.$queryRaw<{ utmSource: string | null; views: bigint }[]>`
      SELECT "utmSource", count(*) AS views
      FROM "PageView"
      WHERE "isBot" = false
        AND path = '/auth/register'
        AND "createdAt" >= (now() - (${days} || ' days')::interval)
      GROUP BY "utmSource"
      ORDER BY views DESC
    `;
    const registerByUtm = utmRows.map((r) => ({
      utmSource: r.utmSource,
      views: Number(r.views),
    }));

    return NextResponse.json({ data: { series, totals, registerByUtm } });
  } catch (error) {
    return handleApiError(error, "fetch funnel analytics");
  }
}
