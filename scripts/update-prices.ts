import { stockMarketService } from "../src/domains/stock/stock-market.service";
import { getMarketStatus } from "../src/lib/market-hours";
import { runScript } from "./lib/run";

runScript("update-prices", async () => {
  // Crypto is 24/7 — refresh IDR OHLC every day, before the IDX weekend check.
  try {
    await stockMarketService.refreshCryptoPrices();
  } catch (e) {
    console.error("Crypto refresh failed:", e);
  }

  const status = getMarketStatus();
  const now = new Date();
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const day = jakarta.getDay();
  if (day === 0 || day === 6) {
    console.log(`IDX market closed (weekend). Skipping IDX price update.`);
    return;
  }

  console.log("Starting daily IDX price update...");
  await stockMarketService.updateAllStocks();
  console.log("Daily IDX price update complete.");
});
