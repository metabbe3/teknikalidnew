import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { faqService } from "@/domains/faq/faq.service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
    }

    const body = await request.json();
    const { question, category } = body;

    if (!question || typeof question !== "string" || question.trim().length < 5) {
      return NextResponse.json({ error: "Pertanyaan terlalu pendek (min 5 karakter)" }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json({ error: "Pertanyaan terlalu panjang (maks 500 karakter)" }, { status: 400 });
    }

    const result = await faqService.submitQuestion(session.user.id, question.trim(), category);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "submit question");
  }
}
