import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comments = await prisma.comment.findMany({
    where: { postId: id, parentId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: {
        select: { id: true, username: true, name: true, image: true },
      },
      replies: {
        where: { parentId: { not: null } },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, username: true, name: true, image: true },
          },
          parent: {
            select: {
              id: true,
              content: true,
              author: { select: { id: true, username: true, name: true, image: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ data: comments });
}
