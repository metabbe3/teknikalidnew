import { NextResponse } from "next/server";
import { getRadarScanData } from "@/domains/stock/radar-scanner.service";

export const dynamic = "force-dynamic";

/** Radar Sinyal — kandidat scanner analyst (data fisik ~/.hermes/data/teknikalid-growth/analyst/).
 *  Read-only, single source = scan JSON (SATU PINTU: tidak menghitung ulang). */
export async function GET() {
  const result = await getRadarScanData();
  return NextResponse.json(result);
}
