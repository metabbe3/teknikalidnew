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
    const body = await request.json();
    const { shortAnswer, longAnswer, format, metaDescription } = body;

    if (!shortAnswer || typeof shortAnswer !== "string") {
      return NextResponse.json({ error: "shortAnswer diperlukan" }, { status: 400 });
    }

    const result = await faqService.approveQuestion(id, shortAnswer, longAnswer, format, metaDescription);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "approve question");
  }
}
