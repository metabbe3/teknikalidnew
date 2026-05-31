import { NextRequest, NextResponse } from "next/server";
import { communityService } from "@/domains/community/community.service";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const post = await communityService.getPost(id, session?.user?.id);

    return NextResponse.json({ data: post });
  } catch (error) {
    return handleApiError(error, "fetch post");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await communityService.deletePost(
      { id: session.user.id, role: session.user.role ?? "USER" },
      id
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "delete post");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const result = await communityService.updatePost(
      { id: session.user.id, role: session.user.role ?? "USER" },
      id,
      content
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "update post");
  }
}
