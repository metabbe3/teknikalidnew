import "dotenv/config";
import { stockMarketService } from "../src/domains/stock/stock-market.service";
import { prisma } from "../src/lib/prisma";
import { getMarketStatus } from "../src/lib/market-hours";

async function main() {
  const status = getMarketStatus();
  const now = new Date();
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const day = jakarta.getDay();
  if (day === 0 || day === 6) {
    console.log(`Market closed (weekend). Skipping price update.`);
    return;
  }

  console.log("Starting daily price update...");
  await stockMarketService.updateAllStocks();
  console.log("Daily price update complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
