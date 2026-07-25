import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { faqService } from "@/domains/faq/faq.service";
import { parseBody, schemas } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
    }

    const [data, error] = await parseBody(request, schemas.submitFaq);
    if (error) return error;

    const result = await faqService.submitQuestion(session.user.id, data.question.trim(), data.category);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "submit question");
  }
}
