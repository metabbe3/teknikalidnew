import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { parseQuery, parseBody, schemas } from "@/lib/validation";


export const dynamic = "force-dynamic";

// GET /api/admin/users — List all users with pagination, search, filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.adminUsersList);
    if (error) return error;

    const where: Record<string, unknown> = {};
    if (data.search) {
      where.OR = [
        { name: { contains: data.search, mode: "insensitive" } },
        { username: { contains: data.search, mode: "insensitive" } },
        { email: { contains: data.search, mode: "insensitive" } },
      ];
    }
    if (data.role) where.role = data.role;
    if (data.banned === "true") where.bannedAt = { not: null };
    if (data.banned === "false") where.bannedAt = null;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          image: true,
          role: true,
          isPremium: true,
          reputation: true,
          bannedAt: true,
          createdAt: true,
          // Last active = latest page view or post
          pageViews: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          _count: {
            select: {
              posts: true,
              comments: true,
              pageViews: true,
            },
          },
        },
        orderBy: { [data.sortBy]: data.sortOrder },
        skip: (data.page - 1) * data.limit,
        take: data.limit,
      }),
      prisma.user.count({ where }),
    ]);

    const usersWithActivity = users.map((u) => ({
      ...u,
      lastActive: u.pageViews[0]?.createdAt ?? null,
      _count: u._count,
      pageViews: undefined,
    }));

    return NextResponse.json({
      data: {
        users: usersWithActivity,
        total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(total / data.limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "fetch users");
  }
}

// PATCH /api/admin/users — Ban/unban or change role
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const [data, error] = await parseBody(request, schemas.adminUserAction);
    if (error) return error;

    switch (data.action) {
      case "ban": {
        const user = await prisma.user.update({
          where: { id: data.userId },
          data: { bannedAt: new Date() },
          select: { id: true, username: true, bannedAt: true },
        });
        return NextResponse.json({ data: user });
      }
      case "unban": {
        const user = await prisma.user.update({
          where: { id: data.userId },
          data: { bannedAt: null },
          select: { id: true, username: true, bannedAt: true },
        });
        return NextResponse.json({ data: user });
      }
      case "promote": {
        const user = await prisma.user.update({
          where: { id: data.userId },
          data: { role: "ADMIN" as const },
          select: { id: true, username: true, role: true },
        });
        return NextResponse.json({ data: user });
      }
      case "demote": {
        const user = await prisma.user.update({
          where: { id: data.userId },
          data: { role: "USER" as const },
          select: { id: true, username: true, role: true },
        });
        return NextResponse.json({ data: user });
      }
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: ban, unban, promote, demote" },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error, "update user");
  }
}
