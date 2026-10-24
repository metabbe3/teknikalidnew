/**
 * Preview READ-ONLY job day-2 email (PRD idea-2026-10-19-1).
 * Run: npx tsx --tsconfig tsconfig.json scripts/day2-email-preview.ts
 *
 * Bukti AC2/AC3 dry-run: daftar penerima terpilih + alasan seleksi +
 * render email — TANPA menulis DB apa pun (mode preview_readonly).
 */
import "dotenv/config";
import { runRetentionEmailJob } from "../src/lib/retention-email.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const res = await runRetentionEmailJob({ readOnly: true });
  console.log(`[day2-preview] mode=${res.mode} kandidat(3d)=${res.candidates} terpilih=${res.recipients.length} dedupe-skip=${res.skippedAlreadySent.length}`);
  for (const r of res.recipients) {
    console.log(`- ${r.userId} <${r.email}> alasan=[${r.reasons.join(", ")}] tickers=[${r.tickers.join(",")}] subject="${r.subject}"`);
    console.log(`  htmlPreview: ${r.htmlPreview.replace(/\s+/g, " ").slice(0, 160)}...`);
  }
  if (res.recipients.length === 0) console.log("(tidak ada penerima hari ini — window 1–2 hari)");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
