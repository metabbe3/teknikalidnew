import { NextRequest, NextResponse } from "next/server";

// Redirect finish/error/pending back to a status page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");
  const statusCode = searchParams.get("status_code");
  const transactionStatus = searchParams.get("transaction_status");

  // Redirect to premium page with query params
  const baseUrl = process.env.AUTH_URL || "https://teknikal.id";
  return NextResponse.redirect(
    `${baseUrl}/premium?order_id=${orderId}&status_code=${statusCode}&transaction_status=${transactionStatus}`
  );
}
