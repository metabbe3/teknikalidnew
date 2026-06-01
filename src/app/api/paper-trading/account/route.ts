import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { initialBalance } = body;

    if (!initialBalance || typeof initialBalance !== "number") {
      return NextResponse.json({ error: "Saldo awal wajib diisi" }, { status: 400 });
    }

    const account = await paperTradingService.createAccount(user.id, initialBalance);
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "membuat akun simulasi");
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const account = await paperTradingService.getAccount(user.id);
    return NextResponse.json({ data: account });
  } catch (error) {
    return handleApiError(error, "mengambil akun simulasi");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));

    if (body.action === "topup" && body.amount) {
      const account = await paperTradingService.topUp(user.id, Number(body.amount));
      return NextResponse.json({ data: account });
    }

    const account = await paperTradingService.togglePublic(user.id);
    return NextResponse.json({ data: account });
  } catch (error) {
    return handleApiError(error, "mengupdate akun simulasi");
  }
}
