import { NextRequest, NextResponse } from "next/server";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { qstashReceiver } from "@/lib/queue";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  // Verify QStash signature
  const signature = request.headers.get("upstash-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    await qstashReceiver.verify({ signature, body });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: { batch?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { batch } = parsed;
  if (!Array.isArray(batch) || batch.length === 0) {
    return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
  }

  try {
    await dataSyncService.processBatch(batch as string[]);
    return NextResponse.json({ success: true, processed: batch.length });
  } catch (error) {
    return handleApiError(error, "process batch");
  }
}
