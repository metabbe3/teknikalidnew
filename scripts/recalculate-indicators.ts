import { technicalAnalysisService } from "../src/domains/stock/technical-analysis.service";
import { runScript } from "./lib/run";

runScript("recalculate-indicators", async () => {
  console.log("Recalculating indicators for all stocks...");
  await technicalAnalysisService.calculateAllIndicators();
  console.log("Indicator recalculation complete.");
});
