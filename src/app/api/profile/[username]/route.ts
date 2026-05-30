import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        bio: true,
        createdAt: true,
        posts: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            tickerTag: true,
            likesCount: true,
            commentsCount: true,
            createdAt: true,
          },
        },
        _count: {
          select: { watchlist: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const data = {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      bio: user.bio,
      joinedAt: user.createdAt,
      watchlistCount: user._count.watchlist,
      recentPosts: user.posts,
    };

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
