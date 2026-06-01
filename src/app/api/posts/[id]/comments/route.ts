import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvatarUrl } from "@/lib/avatar";

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  image: true,
} as const;

function stripAuthor(a: { id: string; username: string; name: string | null; email: string; image: string | null }) {
  return { id: a.id, username: a.username, name: a.name, image: getAvatarUrl(a.image, a.email) };
}

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
    author: stripAuthor(c.author),
    replies: c.replies.map((r) => ({
      ...r,
      author: stripAuthor(r.author),
      parent: r.parent ? { ...r.parent, author: stripAuthor(r.parent.author) } : null,
    })),
  }));

  return NextResponse.json({ data });
}
