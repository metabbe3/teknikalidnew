import { NextResponse } from "next/server";
import { DomainError } from "@/lib/domain-error";

export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  // Log full error server-side, return generic message to client in production
  console.error(`[API Error] ${context}:`, error instanceof Error ? error.stack ?? error.message : error);
  const message = process.env.NODE_ENV === "production"
    ? `Failed to ${context}`
    : error instanceof Error ? error.message : `Failed to ${context}`;
  return NextResponse.json({ error: message }, { status: 500 });
}
