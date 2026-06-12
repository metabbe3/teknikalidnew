import { communityService } from "../src/domains/community/community.service";
import { runScript } from "./lib/run";

runScript("resolve-predictions", async () => {
  console.log("Resolving unresolved predictions...");
  const result = await communityService.resolvePredictions(7);
  console.log(`Done. Resolved ${result.resolved} of ${result.total} predictions.`);
});
