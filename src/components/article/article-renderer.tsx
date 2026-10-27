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

export function extractHeadings(content: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const regex = /^## (.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
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

export function ArticleContent({ content }: { content: string }) {
  return (
    <article className="article-prose">
      <Markdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug, rehypeStockLinker]}
      >
        {content}
      </Markdown>
    </article>
  );
}
