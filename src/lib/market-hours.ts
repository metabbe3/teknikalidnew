import { fetchQuote } from "@/lib/yahoo-finance";

export interface MarketStatusResult {
  isOpen: boolean;
  label: string;
  reason?: "weekend" | "holiday" | "after_hours";
  source: "yahoo" | "fallback";
}

export function getMarketStatus(): { label: string; open: boolean } {
  const now = new Date();
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const day = jakarta.getDay();
  const totalMinutes = jakarta.getHours() * 60 + jakarta.getMinutes();

  if (day === 0 || day === 6) return { label: "CLOSED", open: false };
  if (totalMinutes >= 540 && totalMinutes < 960) return { label: "OPEN", open: true };
  return { label: "CLOSED", open: false };
}

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
