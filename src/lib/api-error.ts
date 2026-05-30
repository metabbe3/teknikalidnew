import { NextResponse } from "next/server";
import { DomainError } from "@/lib/domain-error";

export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error(`[API Error] ${context}:`, error instanceof Error ? error.message : error);
  const message = error instanceof Error ? error.message : `Failed to ${context}`;
  return NextResponse.json({ error: message }, { status: 500 });
}
