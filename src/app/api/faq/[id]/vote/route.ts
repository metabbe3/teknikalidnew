import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { faqService } from "@/domains/faq/faq.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isHelpful } = body;

    if (typeof isHelpful !== "boolean") {
      return NextResponse.json({ error: "isHelpful harus boolean" }, { status: 400 });
    }

    await faqService.voteOnQuestion(id, session.user.id, isHelpful);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error, "vote on question");
  }
}
