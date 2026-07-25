/**
 * Migration: Fix articles whose title leaked AI prompt/conversational meta-text.
 *
 * Background: parseAIResponse previously trusted the JSON title field before the H2,
 * which allowed AI conversational leakage like "Berikut adalah beberapa variasi
 * judul alternatif..." to be stored as the title. This script scans for those,
 * attempts to recover a real headline from the content's first H2, and updates
 * the row in place (preserving slug/content/excerpt for SEO).
 *
 * Behavior:
 *   - Default: dry-run (prints proposed changes, writes nothing).
 *   - --apply : persist changes to the database.
 *   - --since=YYYY-MM-DD : only scan articles published on/after this date.
 *
 * Recovery decision per article:
 *   1. Extract first real H2 from content (skips structural sections).
 *   2. If H2 passes title guard → fix title in place.
 *   3. If no valid H2 → unlist + set status DRAFT for manual review.
 *   4. Never touch content, excerpt, or slug.
 *
 * Idempotent: skips articles whose generationMeta.titleFixedFromLeak is already true.
 */
import { prisma } from "../src/lib/prisma";
import { ArticleStatus } from "../src/generated/prisma/client";
import { runScript } from "./lib/run";
import {
  TITLE_GUARD_PATTERNS,
  findTitleViolation,
  passesTitleGuard,
  extractFirstH2,
} from "../src/domains/article/title-guard";

interface Args {
  apply: boolean;
  since: Date | null;
}

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const sinceArg = argv.find((a) => a.startsWith("--since="));
  let since: Date | null = null;
  if (sinceArg) {
    const value = sinceArg.slice("--since=".length);
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      since = parsed;
    } else {
      throw new Error(`Invalid --since date: ${value}`);
    }
  }
  return { apply, since };
}

/**
 * Build a SQL-style case-insensitive regex alternative for Prisma's `mode: insensitive`
 * on the title column. We can't easily express the whole TITLE_GUARD_PATTERNS in one regex,
 * so we use a disjunction of source patterns.
 *
 * Note: Prisma supports `contains` with insensitive mode but not raw regex. We instead
 * fetch candidates and filter in JS with the authoritative patterns. This is safe for a
 * one-off migration (article count is in the hundreds, not millions).
 */
const CANDIDATE_SUBSTRINGS = [
  "berikut adalah",
  "berikut ini",
  "ini adalah",
  "teks anda",
  "kalimat terakhir",
  "kalimat berikut",
  "lanjutan artikel",
  "lanjutan teks",
  "lanjutan naskah",
  "judul alternatif",
  "variasi judul",
  "sebagai ai",
  "sebagai asisten",
  "sebagai model",
  "secara keseluruhan",
  "inilah artikel",
  "inilah naskah",
  "berdasarkan preview",
  "berdasarkan judul",
  "berdasarkan teks",
  "berdasarkan konten",
  "berdasarkan title",
  "prompt leak",
  "respons ai",
  "response ai",
  "output model",
  "output ai",
  "as an ai",
  "here's",
  "here is",
  "i'd be happy to",
  "based on the preview",
  "based on the prompt",
  "based on the title",
  "based on the content",
  "[insert",
  "[tbd",
  "placeholder",
  "lorem ipsum",
];

runScript("fix-leaked-titles", async () => {
  const args = parseArgs(process.argv.slice(2));

  console.log(`[fix-leaked-titles] Mode: ${args.apply ? "APPLY" : "DRY-RUN (no writes)"}`);
  if (args.since) {
    console.log(`[fix-leaked-titles] Since: ${args.since.toISOString()}`);
  }
  console.log("");

  // Fetch candidates: any article whose title contains one of the leak markers.
  // We use OR of case-insensitive contains; the authoritative filter runs in JS below.
  const where = {
    ...(args.since ? { publishedAt: { gte: args.since } } : {}),
    OR: CANDIDATE_SUBSTRINGS.map((s) => ({ title: { contains: s, mode: "insensitive" as const } })),
  };

  const candidates = await prisma.article.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      status: true,
      isListed: true,
      articleType: true,
      publishedAt: true,
      generationMeta: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  console.log(`[fix-leaked-titles] Candidate rows fetched: ${candidates.length}`);

  // Filter to only those that actually trip the authoritative guard.
  const broken = candidates.filter((a) => findTitleViolation(a.title) !== null);
  console.log(`[fix-leaked-titles] Confirmed broken (match TITLE_GUARD_PATTERNS): ${broken.length}`);

  // Exclude already-fixed ones.
  const pending = broken.filter((a) => {
    const meta = a.generationMeta as Record<string, unknown> | null;
    return meta?.titleFixedFromLeak !== true;
  });
  const skipped = broken.length - pending.length;
  console.log(`[fix-leaked-titles] Already fixed (skipped): ${skipped}`);
  console.log("");

  if (pending.length === 0) {
    console.log("[fix-leaked-titles] Nothing to do. Exiting.");
    return;
  }

  let fixed = 0;
  let unlisted = 0;

  for (const article of pending) {
    const violation = findTitleViolation(article.title)!;
    const recoveredH2 = extractFirstH2(article.content ?? "");
    const h2Passes = recoveredH2 ? passesTitleGuard(recoveredH2) : false;

    console.log("─────────────────────────────────────────────");
    console.log(`ID:       ${article.id}`);
    console.log(`Slug:     ${article.slug}`);
    console.log(`Type:     ${article.articleType}   Status: ${article.status}`);
    console.log(`Rule:     ${violation.rule} — ${violation.message}`);
    console.log(`OLD:      ${article.title}`);
    if (recoveredH2) {
      console.log(`H2 found: ${recoveredH2}${h2Passes ? "" : " (FAILS guard)"}`);
    } else {
      console.log(`H2 found: (none)`);
    }

    if (h2Passes && recoveredH2) {
      console.log(`NEW:      ${recoveredH2}`);
      console.log(`Action:   UPDATE title + bump version`);
      fixed++;

      if (args.apply) {
        const meta = (article.generationMeta as Record<string, string>) ?? {};
        await prisma.article.update({
          where: { id: article.id },
          data: {
            title: recoveredH2,
            version: { increment: 1 },
            generationMeta: {
              ...meta,
              titleFixedFromLeak: "true",
              originalTitle: article.title,
              titleFixedAt: new Date().toISOString(),
              titleFixedRule: violation.rule,
            } as Record<string, string>,
          },
        });
        console.log(`→ Applied.`);
      }
    } else {
      console.log(`NEW:      (no safe replacement)`);
      console.log(`Action:   UNLIST + set DRAFT for manual review`);
      unlisted++;

      if (args.apply) {
        const meta = (article.generationMeta as Record<string, string>) ?? {};
        await prisma.article.update({
          where: { id: article.id },
          data: {
            isListed: false,
            status: ArticleStatus.DRAFT,
            generationMeta: {
              ...meta,
              titleFixedFromLeak: "true",
              titleFixNeedsManualReview: "true",
              originalTitle: article.title,
              titleFixedAt: new Date().toISOString(),
              titleFixedRule: violation.rule,
            } as Record<string, string>,
          },
        });
        console.log(`→ Applied (unlisted + draft).`);
      }
    }
    console.log("");
  }

  console.log("═══════════════════════════════════════");
  console.log("FIX-LEAKED-TITLES SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`Candidates fetched:      ${candidates.length}`);
  console.log(`Broken (matched guard):  ${broken.length}`);
  console.log(`Already fixed (skip):    ${skipped}`);
  console.log(`Processed this run:      ${pending.length}`);
  console.log(`  → Title recovered:     ${fixed}`);
  console.log(`  → Unlisted + draft:    ${unlisted}`);
  console.log(`Mode:                    ${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log("═══════════════════════════════════════");
  if (!args.apply) {
    console.log("Dry-run only. Re-run with --apply to persist changes.");
  }
});
