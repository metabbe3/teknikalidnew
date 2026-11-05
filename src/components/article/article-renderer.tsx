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
      if (
        level === 1 ||
        (normTitle &&
          (normHeading === normTitle ||
            normHeading.startsWith(normTitle) ||
            normTitle.startsWith(normHeading)))
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
          // Heading pertama depth-1 (atau depth-2 yang teksnya identik dgn judul/H1) -> HAPUS dari AST
          if (
            node.depth === 1 ||
            (normTitle &&
              (normHeading === normTitle ||
                normHeading.startsWith(normTitle) ||
                normTitle.startsWith(normHeading)))
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
