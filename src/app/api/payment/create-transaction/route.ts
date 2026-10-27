import { NextRequest, NextResponse } from "next/server";
import { getSnap } from "@/lib/midtrans";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  try {
    // Auth hardening (security-audit 28 Okt): order attribution HARUS dari session,
    // bukan body client — cegah attribution spoof + transaksi spam anonim.
    const session = await requireAuth();
    const body = await request.json();
    const { planId } = body;
    const userId = session.id;
    const userEmail = session.email;
    const userName = session.name ?? undefined;

    // Validate plan
    const plans: Record<string, { name: string; price: number; duration: string }> = {
      monthly: { name: "Premium Monthly", price: 99000, duration: "30d" },
      yearly: { name: "Premium Yearly", price: 799000, duration: "365d" },
    };

    const plan = plans[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const orderId = `TKID-${planId.toUpperCase()}-${userId}-${timestamp}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.price,
      },
      item_details: [
        {
          id: planId,
          price: plan.price,
          quantity: 1,
          name: plan.name,
          category: "Subscription",
        },
      ],
      customer_details: {
        first_name: userName || "TeknikalID User",
        email: userEmail || "",
      },
      custom_field1: userId,
      custom_field2: planId,
      custom_field3: plan.duration,
      callbacks: {
        finish: `${process.env.AUTH_URL}/payment/finish`,
        error: `${process.env.AUTH_URL}/payment/error`,
        pending: `${process.env.AUTH_URL}/payment/pending`,
      },
    };

    const snap = getSnap();
    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
    });
  } catch (error: unknown) {
    console.error("Midtrans create transaction error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create transaction", detail: message },
      { status: 500 }
    );
  }
}
