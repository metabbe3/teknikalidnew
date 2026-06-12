import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";

/**
 * Execute handler with required authentication.
 * Returns standardized { data } response or error.
 */
export async function withAuth<T>(
  handler: (userId: string) => Promise<T>,
) {
  try {
    const user = await authService.requireAuth();
    const result = await handler(user.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "authenticated action");
  }
}

/**
 * Execute handler with optional authentication.
 * Passes undefined userId if not logged in.
 */
export async function withOptionalAuth<T>(
  handler: (userId: string | undefined) => Promise<T>,
) {
  try {
    const user = await authService.getCurrentUser();
    const result = await handler(user?.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "public action");
  }
}

/**
 * Execute handler with admin-only authentication.
 */
export async function withAdmin<T>(
  handler: (userId: string) => Promise<T>,
) {
  try {
    const user = await authService.requireAdmin();
    const result = await handler(user.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "admin action");
  }
}

/** Standard success response */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/** Standard created response */
export function apiCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/** Standard error response */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
