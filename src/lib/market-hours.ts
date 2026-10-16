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

function getJakartaMinutesOfDay(): number {
  const now = new Date();
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  return jakarta.getHours() * 60 + jakarta.getMinutes();
}

async function getMarketStatusFromYahoo(): Promise<MarketStatusResult> {
  const quote = await fetchQuote("BBCA.JK");
  const state = quote.marketState;

  // Trust REGULAR always. PRE hanya valid sebagai "buka" di jendela pra-sesi pagi
  // WIB (08:00–09:15); Yahoo memasang PRE sepanjang malam utk sesi besok sehingga
  // tanpa jendela ini halaman bilang "Pasar Buka" jam 18:00+ (temuan 16 Okt).
  const preIsMorning = getJakartaMinutesOfDay() >= 480 && getJakartaMinutesOfDay() <= 555;
  // Gerbang jam WIB (temuan 16 Okt): v8 chart meta TIDAK mengirim marketState,
  // fetchQuoteV8 default "REGULAR" → status "Pasar Buka" 24 jam. Jam IDX adalah
  // sumber kebenaran sesi; state Yahoo hanya konfirmasi.
  const mins = getJakartaMinutesOfDay();
  const dayNow = getJakartaDayOfWeek();
  const clockOpen = dayNow >= 1 && dayNow <= 5 && mins >= 540 && mins < 960;
  if ((state === "REGULAR" || (state === "PRE" && preIsMorning)) && clockOpen) {
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
