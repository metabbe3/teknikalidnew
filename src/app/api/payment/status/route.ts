import { NextRequest, NextResponse } from "next/server";
import { getCoreApi } from "@/lib/midtrans";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const core = getCoreApi();
    const status = await core.transactionStatus(orderId);

    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to check status", detail: error.message },
      { status: 500 }
    );
  }
}
