import fs from "fs";
import path from "path";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

console.log("=== SELFTEST: REMOVE DEAD COMMUNITY BLOCKS ===");

const root = process.cwd();

// 1. Check deleted files do not exist
const sentimentGaugePath = path.join(root, "src/components/stock/sentiment-gauge.tsx");
const stockDiscussionPath = path.join(root, "src/components/community/stock-discussion.tsx");
const commentListPath = path.join(root, "src/components/community/comment-list.tsx");

assert(!fs.existsSync(sentimentGaugePath), "sentiment-gauge.tsx sudah dihapus");
assert(!fs.existsSync(stockDiscussionPath), "stock-discussion.tsx sudah dihapus");
assert(!fs.existsSync(commentListPath), "comment-list.tsx sudah dihapus");

// 2. Check stock page does not import or render SentimentGauge or StockDiscussion
const stockPagePath = path.join(root, "src/app/(public)/stocks/[ticker]/page.tsx");
const stockPageContent = fs.readFileSync(stockPagePath, "utf8");

assert(!stockPageContent.includes("SentimentGauge"), "Stock page tidak lagi mengimpor/merender SentimentGauge");
assert(!stockPageContent.includes("StockDiscussion"), "Stock page tidak lagi mengimpor/merender StockDiscussion");
assert(!stockPageContent.includes("<SentimentGauge"), "Tidak ada tag <SentimentGauge di stock page");
assert(!stockPageContent.includes("<StockDiscussion"), "Tidak ada tag <StockDiscussion di stock page");

// 3. Check for dead anchors/links to diskusi or sentimen
assert(!stockPageContent.includes("#diskusi"), "Tidak ada anchor link #diskusi di stock page");
assert(!stockPageContent.includes("#sentimen"), "Tidak ada anchor link #sentimen di stock page");

// 4. Check that dead strings are absent from stock page and stock components
assert(!stockPageContent.includes("Belum ada diskusi"), "String 'Belum ada diskusi' tidak ada di stock page");
assert(!stockPageContent.includes("Sentimen Komunitas"), "String 'Sentimen Komunitas' tidak ada di stock page");

// 5. Grep-level check on src/
const allSrcFiles = getAllFiles(path.join(root, "src"));
let sentimentGaugeMatches = 0;
let stockDiscussionMatches: string[] = [];

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("SentimentGauge")) {
    sentimentGaugeMatches++;
  }
  if (content.includes("StockDiscussion")) {
    stockDiscussionMatches.push(file);
  }
}

assert(sentimentGaugeMatches === 0, "SentimentGauge 0 match di seluruh src/");

// StockDiscussion only allowed in feed.tsx (feed props / variant)
const allowedStockDiscussion = stockDiscussionMatches.every((f) =>
  f.endsWith("feed.tsx")
);
assert(
  allowedStockDiscussion && stockDiscussionMatches.length <= 1,
  `StockDiscussion hanya tersisa di feed.tsx (sisa internal feedProps yang dijelaskan), bukan stock page. Found in: ${stockDiscussionMatches.join(", ")}`
);

console.log("\nRESULT: ALL PASS");

function getAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}
