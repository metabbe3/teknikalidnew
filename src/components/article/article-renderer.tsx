import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { remarkCallouts } from "@/lib/remark-callouts";
import { rehypeStockLinker } from "@/lib/rehype-stock-linker";
import { ALL_TICKERS } from "@/lib/idx-stocks";

// Stored-XSS guard for LLM-generated article markdown rendered via rehypeRaw.
// Strict schema on top of defaultSchema: style/on*/script/iframe stay blocked,
// defaultSchema already restricts href/src protocols (no javascript:, data:).
// Bentuk attribute di rehype-sanitize v6 = ARRAY of names (bukan object).
// Object-spread {...array} menghasilkan keys numerik → attribute asli
// (src/href) tak ter-allow → ter-strip. Karena itu extend via concat array.
const defaultAttrs = defaultSchema.attributes ?? {};
const attr = (tag: keyof typeof defaultAttrs, extra: string[]) => [
  ...((defaultAttrs[tag] as string[]) ?? []),
  ...extra,
];
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "img",
    "figure",
    "figcaption",
    "mark",
    "s",
    "del",
    "ins",
    "sub",
    "sup",
    "details",
    "summary",
    "kbd",
    "input", // GFM task-list checkbox
  ],
  attributes: {
    ...defaultAttrs,
    "*": attr("*", ["className", "id"]),
    a: attr("a", ["target", "rel"]),
    // src/href asli tetap dibatasi protokol oleh defaultSchema.protocols (http/https).
    img: attr("img", ["alt", "title", "width", "height", "loading", "className"]),
    input: ["type", "checked", "disabled"],
    td: attr("td", ["colSpan", "rowSpan", "align"]),
    th: attr("th", ["colSpan", "rowSpan", "align"]),
  },
};

export function extractHeadings(content: string, title?: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const regex = /^(#{1,2}) (.+)$/gm;
  const normTitle = title ? normalizeTitle(title) : "";
  let match;
  let firstHeadingChecked = false;
  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const normHeading = normalizeTitle(text);
    if (!firstHeadingChecked) {
      firstHeadingChecked = true;
      // wave2-review (Argon 6 Nov): drop heading pertama HANYA jika duplikat judul.
      // H1 pertama yang beda teks = konten nyata -> didemote (di remark) & tetap masuk TOC.
      if (
        normTitle &&
        (normHeading === normTitle ||
          normHeading.startsWith(normTitle) ||
          normTitle.startsWith(normHeading))
      ) {
        continue;
      }
    } else {
      if (
        normTitle &&
        (normHeading === normTitle ||
          normHeading.startsWith(normTitle) ||
          normTitle.startsWith(normHeading))
      ) {
        continue;
      }
    }
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, text });
  }
  return headings;
}

export function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * ux-2026-11-11-02 (PRD prd-2026-11-12-01, OPSI A): compute a mid-article
 * insertion slot for the RelatedSignals retention block.
 *
 * Rule (AC1/AC2): slot sits exactly AFTER the block that follows the 2nd
 * non-title-duplicate H2 heading — an area reached by 84% of readers (median
 * article scroll is only 23%, the old bottom position at 73% was never seen).
 * Fallback for articles with 0/1 qualifying H2: after the 4th top-level
 * paragraph. If neither rule yields a slot that is strictly BEFORE the end of
 * content, returns insertAt=null (module stays only at its original bottom
 * position — no empty state, no near-bottom duplicate).
 *
 * Pure string function (unit-testable, no React/DB): page-level code splits
 * content and renders <ArticleContent> twice — identical markdown pipeline
 * (same remark/rehype plugin chain) on both halves, so sanitization, heading
 * transforms, TOC ids, and stock-linker are unchanged.
 */
export interface MidArticleSplit {
  before: string;
  after: string;
  insertAt: number | null;
}

const MID_HEADING_TARGET = 2;
const MID_PARAGRAPH_FALLBACK = 4;

export function splitMidArticle(content: string, title?: string): MidArticleSplit {
  const lines = content.split("\n");
  const n = lines.length;
  const normTitle = title ? normalizeTitle(title) : "";

  // Heading = ATX markdown (## X) ATAU block-level HTML heading (<h2>...</h2>)
  // — artikel lama (Sep 2026) tersimpan sebagai HTML mentah per-baris.
  const isHeadingLine = (line: string): boolean =>
    /^#{1,2} /.test(line) || /^<h[1-3][\s>]/.test(line.trimStart());
  const isFenceLine = (line: string): boolean => line.trimStart().startsWith("```");
  // HTML one-liner blocks end with a closing tag — next line starts a new block.
  const endsBlock = (line: string): boolean => {
    const t = line.trimEnd();
    return t.endsWith("</p>") || t.endsWith("</h2>") || t.endsWith("</h3>") || t.endsWith("</blockquote>") || t.endsWith("</ul>") || t.endsWith("</ol>");
  };
  const isTitleDuplicate = (line: string): boolean => {
    if (!normTitle) return false;
    // strip ATX prefix, then strip HTML tags (old raw-HTML articles)
    const text = line.replace(/^#{1,2} /, "").replace(/<[^>]+>/g, "").trim();
    if (!text) return false; // tag-only line (e.g. bare <h2> opener) — cannot judge
    const normHeading = normalizeTitle(text);
    return (
      normHeading === normTitle ||
      normHeading.startsWith(normTitle) ||
      normTitle.startsWith(normHeading)
    );
  };

  // Pre-compute fence state per line: '#' lines INSIDE fences are content.
  const inFence: boolean[] = new Array(n).fill(false);
  {
    let fenceOpen = false;
    for (let j = 0; j < n; j++) {
      if (isFenceLine(lines[j])) fenceOpen = !fenceOpen;
      inFence[j] = fenceOpen;
    }
  }

  // Slot line = first CONTENT line AFTER the block that follows the anchor
  // (blank lines stay at the end of `before`, so `after` starts with content).
  // Returns null when the block is the LAST block (slot would equal page
  // bottom — pointless duplicate of the existing bottom module).
  const slotAfterBlock = (blockStart: number): number | null => {
    let m = blockStart;
    while (m < n) {
      const l = lines[m];
      if (l.trim() === "" || isHeadingLine(l) || isFenceLine(l)) break;
      m++;
      if (endsBlock(l)) break; // HTML one-liner block complete (</p>, </h2>, …)
    }
    while (m < n && lines[m].trim() === "") m++;
    if (m >= n) return null; // block runs to EOF -> no mid slot
    return m;
  };

  // Pass 1: 2nd qualifying H2 -> slot after the block following it.
  let headingCount = 0;
  for (let j = 0; j < n; j++) {
    if (inFence[j]) continue;
    const line = lines[j];
    if (!isHeadingLine(line) || isTitleDuplicate(line)) continue;
    headingCount++;
    if (headingCount < MID_HEADING_TARGET) continue;
    if (headingCount > MID_HEADING_TARGET) break;

    // Find start of the block following the heading: skip blanks; a glued
    // content line right under the heading counts as that block too.
    let k = j + 1;
    while (k < n && lines[k].trim() === "") k++;
    if (k >= n) return { before: content, after: "", insertAt: null }; // heading is last line
    const insertAtLine = slotAfterBlock(k);
    if (insertAtLine === null) return { before: content, after: "", insertAt: null };
    const insertAt = lines.slice(0, insertAtLine).reduce((acc, l) => acc + l.length + 1, 0);
    return { before: content.slice(0, insertAt), after: content.slice(insertAt), insertAt };
  }

  // Pass 2 (fallback, 0/1 qualifying heading): after the 4th paragraph block.
  // CommonMark block starts: line 0, after blank, after a heading (ATX heading
  // is its own block even when glued), or after a closing fence line.
  let paragraphCount = 0;
  for (let j = 0; j < n; j++) {
    if (inFence[j]) continue;
    const line = lines[j];
    const prev = j > 0 ? lines[j - 1] : null;
    const startsBlock =
      j === 0 ||
      prev === null ||
      prev.trim() === "" ||
      isHeadingLine(prev) ||
      endsBlock(prev) ||
      (isFenceLine(prev) && !inFence[j]);
    if (!startsBlock || isHeadingLine(line) || isFenceLine(line) || line.trim() === "") continue;
    paragraphCount++;
    if (paragraphCount === MID_PARAGRAPH_FALLBACK) {
      const insertAtLine = slotAfterBlock(j);
      if (insertAtLine === null) return { before: content, after: "", insertAt: null };
      const insertAt = lines.slice(0, insertAtLine).reduce((acc, l) => acc + l.length + 1, 0);
      return { before: content.slice(0, insertAt), after: content.slice(insertAt), insertAt };
    }
  }

  return { before: content, after: "", insertAt: null };
}

const TICKER_SET = new Set(ALL_TICKERS.map((t) => t.replace(".JK", "")));

export function extractTickers(content: string): string[] {
  const matches = content.match(/\b([A-Z]{2,5})\b/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    if (!seen.has(m) && TICKER_SET.has(m)) {
      seen.add(m);
      result.push(`${m}.JK`);
    }
  }
  return result;
}

interface MdastNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MdastNode[];
}

function getNodeText(node: MdastNode | null | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(getNodeText).join("");
  }
  return "";
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * seo-2026-11-05 / ux-wave2:
 * 1. Drop the first heading if its text matches the article's H1 title (100% duplicate H2 removal).
 * 2. Demote any remaining H1 in the markdown body to H2 (single H1 invariant for the page).
 */
export function remarkDropDuplicateHeading(title?: string) {
  return (tree: { children?: MdastNode[] }) => {
    if (!tree?.children || !Array.isArray(tree.children)) return;
    const normTitle = title ? normalizeTitle(title) : "";
    let firstHeadingChecked = false;
    const newChildren: MdastNode[] = [];

    for (const node of tree.children) {
      if (node.type === "heading" && (node.depth === 1 || node.depth === 2)) {
        const headingText = getNodeText(node);
        const normHeading = normalizeTitle(headingText);

        if (!firstHeadingChecked) {
          firstHeadingChecked = true;
          // wave2-review (Argon 6 Nov): HAPUS heading pertama hanya jika duplikat judul.
          // H1 pertama yang teksnya BEDA = konten nyata -> JANGAN hapus; jatuh ke demote H2 di bawah.
          if (
            normTitle &&
            (normHeading === normTitle ||
              normHeading.startsWith(normTitle) ||
              normTitle.startsWith(normHeading))
          ) {
            continue;
          }
        } else {
          // If any subsequent heading is identical to title, drop it too
          if (
            normTitle &&
            (normHeading === normTitle ||
              normHeading.startsWith(normTitle) ||
              normTitle.startsWith(normHeading))
          ) {
            continue;
          }
        }
        // Ensure no depth 1 headings remain in body
        if (node.depth === 1) {
          node.depth = 2;
        }
        newChildren.push(node);
      } else {
        newChildren.push(node);
      }
    }
    tree.children = newChildren;
  };
}

export function remarkDemoteH1(title?: string) {
  return remarkDropDuplicateHeading(title);
}

export function ArticleContent({ content, title }: { content: string; title?: string }) {
  const dropDuplicatePlugin = () => remarkDropDuplicateHeading(title);

  return (
    <article className="article-prose">
      <Markdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts, dropDuplicatePlugin]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug, rehypeStockLinker]}
      >
        {content}
      </Markdown>
    </article>
  );
}
