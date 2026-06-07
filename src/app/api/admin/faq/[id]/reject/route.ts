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
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await faqService.rejectQuestion(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error, "reject question");
  }
}
