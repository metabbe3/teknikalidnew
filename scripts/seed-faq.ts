/**
 * Seed script: Generate initial FAQ content from the curated topic catalog.
 *
 * Usage:
 *   DATABASE_URL="postgresql://teknikalid:5gaWHFzdeG7P3jG8SS0zhgNqytGPN0@localhost:5433/teknikalid" npx tsx scripts/seed-faq.ts
 */
import "dotenv/config";
import { faqService } from "../src/domains/faq/faq.service";

const TOTAL = 20;
const BATCH_SIZE = 5;

async function main() {
  console.log(`\n🌱 Seeding FAQ — generating ${TOTAL} items in batches of ${BATCH_SIZE}...\n`);

  let totalGenerated = 0;
  let totalErrors = 0;
  let batches = Math.ceil(TOTAL / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const remaining = TOTAL - totalGenerated;
    const count = Math.min(BATCH_SIZE, remaining);
    if (count <= 0) break;

    console.log(`\n--- Batch ${b + 1}/${batches} (${count} items) ---`);

    try {
      const result = await faqService.runDailyGeneration(count);
      totalGenerated += result.generated.length;
      totalErrors += result.errors.length;

      for (const slug of result.generated) {
        console.log(`  ✅ ${slug}`);
      }
      for (const err of result.errors) {
        console.log(`  ❌ ${err}`);
      }
    } catch (err) {
      console.log(`  ❌ Batch failed: ${err instanceof Error ? err.message : err}`);
      totalErrors += count;
    }
  }

  console.log(`\n🎯 Done! Generated: ${totalGenerated}, Errors: ${totalErrors}\n`);
  process.exit(0);
}

main();
