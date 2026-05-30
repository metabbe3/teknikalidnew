import { fetchQuote } from "@/lib/yahoo-finance";
import { getMarketStatus } from "./market-hours.client";

export interface MarketStatusResult {
  isOpen: boolean;
  label: string;
  reason?: "weekend" | "holiday" | "after_hours";
  source: "yahoo" | "fallback";
}

export { getMarketStatus };

function getJakartaDayOfWeek(): number {
  const now = new Date();
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  return jakarta.getDay();
}

async function getMarketStatusFromYahoo(): Promise<MarketStatusResult> {
  const quote = await fetchQuote("BBCA.JK");
  const state = quote.marketState;

  if (state === "REGULAR" || state === "PRE") {
    return { isOpen: true, label: "PASAR BUKA", source: "yahoo" };
  }

  const day = getJakartaDayOfWeek();
  if (day === 0 || day === 6) {
    return { isOpen: false, label: "PASAR TUTUP", reason: "weekend", source: "yahoo" };
  }

  if (state === "CLOSED" || state === "POSTPOST") {
    return { isOpen: false, label: "PASAR TUTUP", reason: "holiday", source: "yahoo" };
  }

  return { isOpen: false, label: "PASAR TUTUP", reason: "after_hours", source: "yahoo" };
}

export async function getMarketStatusWithFallback(): Promise<MarketStatusResult> {
  try {
    return await getMarketStatusFromYahoo();
  } catch {
    const status = getMarketStatus();
    const day = getJakartaDayOfWeek();
    let reason: MarketStatusResult["reason"];
    if (day === 0 || day === 6) reason = "weekend";
    else if (!status.open) reason = "after_hours";

    return {
      isOpen: status.open,
      label: status.open ? "PASAR BUKA" : "PASAR TUTUP",
      reason,
      source: "fallback",
    };
  }
}
