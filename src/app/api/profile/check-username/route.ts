import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username query parameter is required" }, { status: 400 });
    }

    if (!authService.checkUsernameFormat(username)) {
      return NextResponse.json({ available: false });
    }

    const available = await authService.isUsernameAvailable(username);
    return NextResponse.json({ available });
  } catch {
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 });
  }
}
