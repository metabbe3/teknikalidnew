import type { Metadata } from "next";
import {
  generateMovementMetadataHelper,
  RenderMovementPage,
} from "../movement-page-helper";

export const revalidate = 3600; // 1 hour ISR
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  return generateMovementMetadataHelper(ticker, "naik");
}

export default async function KenapaNaikPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return RenderMovementPage({ ticker, expectedDirection: "naik" });
}
