import "dotenv/config";
import { articleService } from "../src/domains/article/article.service";
import { imageGenService } from "../src/domains/image-gen/image-gen.service";
import { articleRepository } from "../src/domains/article/article.repository";

const ADMIN_ID = "cmpqtl0gc0000rc0z39jugn70";
const TICKER = "BBCA.JK";

async function main() {
  console.log(`\n=== Generating article for ${TICKER} ===\n`);

  // Step 1: Generate article
  console.log("1. Generating article with Claude AI...");
  const result = await articleService.generateStockAnalysis(TICKER);
  console.log(`   Article created: "${result.title}" (id: ${result.id})`);

  // Step 2: Build image prompt using Claude
  console.log("\n2. Building image prompt with Claude AI...");
  const article = await articleRepository.findById(result.id);
  const prompt = await imageGenService.startGeneration(ADMIN_ID, {
    source: "auto",
    content: article?.title ?? result.title,
    tickerTag: TICKER,
  });
  console.log(`   Image generation started (jobId: ${prompt.jobId})`);

  // Step 3: Poll for image
  console.log("\n3. Waiting for ComfyUI to generate image...");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await imageGenService.getJobStatus(prompt.jobId, ADMIN_ID);
    process.stdout.write(`   [${(i + 1) * 2}s] Status: ${status.status}\n`);
    if (status.status === "completed" && status.imageUrl) {
      console.log(`\n   Image ready: ${status.imageUrl}`);
      // Attach to article
      await articleService.updateCoverImage(result.id, status.imageUrl);
      console.log(`   Cover image attached to article!`);
      break;
    }
    if (status.status === "failed") {
      console.log(`\n   Image generation failed: ${status.error}`);
      break;
    }
  }

  console.log(`\n=== Done! Article: ${result.title} ===`);
  console.log(`    Slug: ${result.slug}`);
  console.log(`    ID: ${result.id}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
