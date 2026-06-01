import { NextResponse } from "next/server";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const tags = await communityService.getTrendingTags();
    return NextResponse.json({ data: tags });
  } catch (error) {
    return handleApiError(error, "fetch trending tags");
  }
}
