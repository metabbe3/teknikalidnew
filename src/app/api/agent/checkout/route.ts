import { NextRequest, NextResponse } from "next/server";
import { getSnap } from "@/lib/midtrans";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// AGENT checkout (owner 5 Nov): web register → bayar agent subscription via Midtrans.
// Order ID format WAJIB `TA-<chatId>-<TIER>-<ts>` (diparse agentd webhook) — chatId
// diambil dari binding email↔Telegram, BUKAN dari body client (anti spoof).
// REBASE HARGA 6 Nov (owner paywall test + Argon): Night Trader (basic) 29000
// promo bulan pertama 14900; Pro 79000 promo 29000. Label promo = "bulan pertama",
// BUKAN -90% (margin minus setelah biaya gateway; churn shock 10x).
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { tier, promo } = body;

    if (tier !== "basic" && tier !== "pro") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Binding: email web ↔ chat_id Telegram (tabel agent.agent_web_binding).
    // Tanpa binding, user belum boleh bayar agent (belum /start bot).
    const rows = await prisma.$queryRawUnsafe<Array<{ chat_id: string }>>(
      `SELECT chat_id::text FROM agent.agent_web_binding WHERE email = $1 LIMIT 1`,
      session.email
    );
    if (!rows.length) {
      return NextResponse.json(
        { error: "BINDING_REQUIRED", message: "Hubungkan akun Telegram dulu (buka bot, /start)." },
        { status: 409 }
      );
    }
    const chatId = rows[0].chat_id;

    // Promo eligibility: 1x per chat (agent.agent_promo_redemption) — cek server-side.
    let usePromo = promo === true;
    if (usePromo) {
      const redeemed = await prisma.$queryRawUnsafe<Array<{ n: string }>>(
        `SELECT count(*)::text AS n FROM agent.agent_promo_redemption WHERE chat_id = $1`,
        chatId
      );
      if (Number(redeemed[0]?.n ?? "0") > 0) usePromo = false;
    }

    const price = usePromo ? (tier === "basic" ? 14900 : 29000) : tier === "basic" ? 29000 : 79000;
    const tierTag = usePromo ? `PROMO${tier.toUpperCase()}` : tier.toUpperCase();
    const orderId = `TA-${chatId}-${tierTag}-${Date.now()}`;

    const snap = getSnap();
    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: price },
      item_details: [
        {
          id: tier,
          price,
          quantity: 1,
          name: usePromo
            ? `TeknikalAgent ${tier === "basic" ? "Night Trader" : "Pro"} — bulan pertama ${price === 14900 ? "Rp14.900" : "Rp29.000"}`
            : `TeknikalAgent ${tier === "basic" ? "Night Trader" : "Pro"}`,
          category: "Subscription",
        },
      ],
      customer_details: {
        first_name: session.name ?? "TeknikalAgent User",
        email: session.email,
      },
    };

    const tx = await snap.createTransaction(parameter);
    return NextResponse.json({
      token: tx.token,
      redirect_url: tx.redirect_url,
      order_id: orderId,
      price,
      promo: usePromo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // anon → 401 rapi (page /agent redirect ke register)
    if (/not authenticated|unauthorized/i.test(message)) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    console.error("[agent-checkout]", message);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
