import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";
import { parseQuery, schemas } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.userSearch);
    if (error) return error;

    const user = await authService.getCurrentUser();
    const users = await authService.searchUsers(data.q, user?.id, 8);
    return NextResponse.json({ data: users });
  } catch (error) {
    return handleApiError(error, "search users");
  }
}
