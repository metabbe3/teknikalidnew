import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { imageGenService } from "@/domains/image-gen/image-gen.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const body = await request.json();
    const { prompt, auto, content, tickerTag } = body;

    const result = await imageGenService.startGeneration(user.id, {
      prompt,
      source: auto ? "auto" : "manual",
      content,
      tickerTag,
    });

    return NextResponse.json({ data: result }, { status: 202 });
  } catch (error) {
    return handleApiError(error, "generate image");
  }
}
