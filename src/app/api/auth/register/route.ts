import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Password tidak cocok" });

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    await authService.register(body.email, body.password, body.confirmPassword);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "register");
  }
}
