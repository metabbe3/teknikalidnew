import "dotenv/config";
import { technicalAnalysisService } from "../src/domains/stock/technical-analysis.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Recalculating indicators for all stocks...");
  await technicalAnalysisService.calculateAllIndicators();
  console.log("Indicator recalculation complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
