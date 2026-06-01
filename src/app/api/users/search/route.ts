import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    if (!q || q.length < 1) {
      return NextResponse.json({ data: [] });
    }

    const user = await authService.getCurrentUser();
    const users = await authService.searchUsers(q, user?.id, 8);
    return NextResponse.json({ data: users });
  } catch (error) {
    return handleApiError(error, "search users");
  }
}
