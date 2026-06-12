import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTHOR_SELECT, serializeAuthor } from "@/lib/author-select";

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
      author: { select: AUTHOR_SELECT },
      replies: {
        where: { parentId: { not: null } },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: AUTHOR_SELECT },
          parent: {
            select: {
              id: true,
              content: true,
              author: { select: AUTHOR_SELECT },
            },
          },
        },
      },
    },
  });

  const data = comments.map((c) => ({
    ...c,
    author: serializeAuthor(c.author),
    replies: c.replies.map((r) => ({
      ...r,
      author: serializeAuthor(r.author),
      parent: r.parent ? { ...r.parent, author: serializeAuthor(r.parent.author) } : null,
    })),
  }));

  return NextResponse.json({ data });
}
