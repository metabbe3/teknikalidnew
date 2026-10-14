import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    await requireAdmin();

    const count = await prisma.report.count({ where: { status: "PENDING" } });
    return NextResponse.json({ data: { count } });
  } catch (error) {
    return handleApiError(error, "fetch pending report count");
  }
}
