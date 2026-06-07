import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");
  const statusCode = searchParams.get("status_code");

  const baseUrl = process.env.AUTH_URL || "https://teknikal.id";
  return NextResponse.redirect(
    `${baseUrl}/premium?order_id=${orderId}&status_code=${statusCode}&transaction_status=pending`
  );
}
