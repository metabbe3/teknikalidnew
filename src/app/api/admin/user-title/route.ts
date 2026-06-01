import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, customTitle } = await request.json();
    if (!userId || typeof customTitle !== "string") {
      return NextResponse.json({ error: "userId dan customTitle wajib diisi" }, { status: 400 });
    }
    if (customTitle.length > 30) {
      return NextResponse.json({ error: "customTitle maks 30 karakter" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { customTitle },
      select: { id: true, username: true, customTitle: true },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error, "set custom title");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { customTitle: null },
      select: { id: true, username: true, customTitle: true },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error, "remove custom title");
  }
}
