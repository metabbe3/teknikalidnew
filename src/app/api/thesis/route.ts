import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { parseBody } from "@/lib/validation";
import { thesisService } from "@/domains/thesis/thesis.service";

const upsertSchema = z.object({
  ticker: z.string().min(1).max(20),
  bias: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
  targetPrice: z.number().positive().nullish(),
  stopLoss: z.number().positive().nullish(),
  rationale: z.string().max(280).optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await thesisService.getTheses(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch theses");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const [data, error] = await parseBody(request, upsertSchema);
    if (error) return error;

    const thesis = await thesisService.upsertThesis(user.id, data!.ticker, {
      bias: data!.bias,
      targetPrice: data!.targetPrice ?? null,
      stopLoss: data!.stopLoss ?? null,
      rationale: data!.rationale,
    });
    return NextResponse.json({ data: thesis }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "save thesis");
  }
}
