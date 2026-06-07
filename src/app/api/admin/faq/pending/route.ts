import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { faqRepository } from "@/domains/faq/faq.repository";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
    const data = await faqRepository.findPending(limit);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch pending questions");
  }
}
