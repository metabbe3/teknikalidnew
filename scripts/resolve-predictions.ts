import "dotenv/config";
import { communityService } from "../src/domains/community/community.service";

async function main() {
  console.log("Resolving unresolved predictions...");
  const result = await communityService.resolvePredictions(7);
  console.log(`Done. Resolved ${result.resolved} of ${result.total} predictions.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
