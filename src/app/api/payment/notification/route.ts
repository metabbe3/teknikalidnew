import { NextRequest, NextResponse } from "next/server";
import { verifySignature, MidtransNotification } from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";

// Midtrans sends webhook notifications here
export async function POST(request: NextRequest) {
  try {
    const notification: MidtransNotification = await request.json();

    const {
      order_id,
      transaction_status,
      fraud_status,
      gross_amount,
      status_code,
      signature_key,
      payment_type,
      custom_field1: userId,
      custom_field2: planId,
      custom_field3: duration,
    } = notification;

    console.log("[Midtrans] Notification received:", JSON.stringify({
      order_id, transaction_status, status_code, gross_amount, payment_type, fraud_status,
    }));

    // Verify signature to ensure it's really from Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;

    if (!serverKey) {
      console.error("[Midtrans] MIDTRANS_SERVER_KEY not configured");
      return NextResponse.json({ error: "Server key not configured" }, { status: 500 });
    }

    const isValid = verifySignature(
      order_id,
      status_code,
      gross_amount,
      serverKey,
      signature_key
    );

    if (!isValid) {
      console.error("[Midtrans] Invalid signature for order:", order_id);
      // For test notifications from Midtrans dashboard, still return 200
      if (order_id?.startsWith("payment_notif_test_")) {
        console.log("[Midtrans] Test notification accepted without signature check");
        return NextResponse.json({ status: "ok", message: "test notification received" });
      }
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Determine the effective transaction status
    let effectiveStatus = transaction_status;

    if (transaction_status === "capture") {
      if (fraud_status === "accept") {
        effectiveStatus = "capture"; // Successful credit card capture
      } else {
        effectiveStatus = "deny"; // Fraud detected
      }
    }

    // Handle based on status
    switch (effectiveStatus) {
      case "capture":
      case "settlement":
        // Payment successful — activate premium
        await handlePaymentSuccess(order_id, userId, planId, duration, gross_amount, payment_type);
        break;

      case "pending":
        // Payment pending — log it
        await handlePaymentPending(order_id, userId, planId, gross_amount, payment_type);
        break;

      case "deny":
      case "cancel":
      case "expire":
        // Payment failed/expired — log it
        await handlePaymentFailure(order_id, userId, planId, effectiveStatus);
        break;

      case "refund":
      case "partial_refund":
        // Refund — deactivate premium
        await handleRefund(order_id, userId, planId);
        break;

      default:
        console.log(`Unhandled transaction status: ${effectiveStatus} for order ${order_id}`);
    }

    // Always return 200 to Midtrans so they stop retrying
    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Midtrans notification error:", error);
    return NextResponse.json({ status: "ok" }); // Still return 200
  }
}

async function handlePaymentSuccess(
  orderId: string,
  userId: string | undefined,
  planId: string | undefined,
  duration: string | undefined,
  grossAmount: string,
  paymentType: string
) {
  if (!planId || !duration) return;

  const durationDays = parseInt(duration.replace("d", ""));
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const amount = parseInt(parseFloat(grossAmount).toString());

  // Check if user exists
  let userExists = false;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    userExists = !!user;
  }

  if (!userExists) {
    // User doesn't exist (e.g. test payment) — just log it
    console.log(`[Midtrans] Payment success for non-existent user: ${userId}, order: ${orderId}, amount: ${grossAmount}`);
    try {
      await prisma.payment.create({
        data: {
          orderId,
          userId: userId || "unknown",
          planId,
          amount,
          status: "success",
          paymentType,
          paidAt: new Date(),
          expiresAt,
        },
      });
    } catch (e) {
      console.log(`[Midtrans] Could not save payment record: ${e}`);
    }
    return;
  }

  // Real user — upsert payment and activate premium
  await prisma.payment.upsert({
    where: { orderId },
    update: {
      status: "success",
      paymentType,
      paidAt: new Date(),
    },
    create: {
      orderId,
      userId,
      planId,
      amount,
      status: "success",
      paymentType,
      paidAt: new Date(),
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: true,
      premiumExpiresAt: expiresAt,
      premiumPlan: planId,
    },
  });

  console.log(`✅ Premium activated for user ${userId}, plan ${planId}, expires ${expiresAt}`);
}

async function handlePaymentPending(
  orderId: string,
  userId: string | undefined,
  planId: string | undefined,
  grossAmount: string,
  paymentType: string
) {
  if (!userId || !planId) return;

  await prisma.payment.upsert({
    where: { orderId },
    update: { status: "pending" },
    create: {
      orderId,
      userId,
      planId,
      amount: parseInt(grossAmount),
      status: "pending",
      paymentType,
    },
  });

  console.log(`⏳ Payment pending for order ${orderId}`);
}

async function handlePaymentFailure(
  orderId: string,
  userId: string | undefined,
  planId: string | undefined,
  status: string
) {
  if (!userId || !planId) return;

  await prisma.payment.upsert({
    where: { orderId },
    update: { status },
    create: {
      orderId,
      userId,
      planId,
      amount: 0,
      status,
    },
  });

  console.log(`❌ Payment ${status} for order ${orderId}`);
}

async function handleRefund(orderId: string, userId: string | undefined, planId: string | undefined) {
  if (!userId) return;

  await prisma.payment.update({
    where: { orderId },
    data: { status: "refunded" },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: false,
      premiumExpiresAt: null,
      premiumPlan: null,
    },
  });

  console.log(`🔄 Refund processed for order ${orderId}`);
}
