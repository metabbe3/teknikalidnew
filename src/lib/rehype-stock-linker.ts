import type { Root, Element, Text, Parent } from "hast";
import { ALL_TICKERS } from "./idx-stocks";

// Build a Set of tickers without .JK suffix for fast lookup
const TICKER_SET = new Set(ALL_TICKERS.map((t) => t.replace(".JK", "")));

// Match standalone 2-5 uppercase letter words
const TICKER_RE = /\b([A-Z]{2,5})\b/g;

const SKIP_TAGS = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6"]);

/** Check if an ancestor is a link, heading, or code element (to avoid nested links or polluting headings) */
function isInsideSkippedElement(stack: Element[]): boolean {
  return stack.some((el) => SKIP_TAGS.has(el.tagName));
}

export interface ArticleTickerInput {
  tickerTag?: string | null;
  tags?: string[] | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
}

/**
 * Extract up to `max` valid IDX tickers (normalized to `XXXX.JK`) from article metadata & text.
 * Priority order: tickerTag -> tags -> title -> excerpt -> content.
 */
export function extractArticleTickers(item: ArticleTickerInput, max = 6): string[] {
  if (max <= 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  const tryAdd = (raw: string | null | undefined) => {
    if (!raw || result.length >= max) return;
    const clean = raw.trim().toUpperCase().replace(/\.JK$/, "");
    if (clean && TICKER_SET.has(clean) && !seen.has(clean)) {
      seen.add(clean);
      result.push(`${clean}.JK`);
    }
  };

  const scanText = (text: string | null | undefined) => {
    if (!text || result.length >= max) return;
    const matches = text.matchAll(TICKER_RE);
    for (const m of matches) {
      tryAdd(m[1]);
      if (result.length >= max) break;
    }
  };

  tryAdd(item.tickerTag);
  if (Array.isArray(item.tags)) {
    for (const t of item.tags) {
      tryAdd(t);
      if (result.length >= max) break;
    }
  }
  scanText(item.title);
  scanText(item.excerpt);
  scanText(item.content);

  return result;
}

/** Rehype plugin that wraps stock ticker text in pill chip links to /stocks/TICKER.JK (max 1 autolink per ticker per article) */
export function rehypeStockLinker() {
  return (tree: Root) => {
    const linkedTickers = new Set<string>();
    visit(tree, [], linkedTickers);
  };
}

function visit(node: Root | Element | Text, ancestors: Element[], linkedTickers: Set<string>) {
  if (node.type === "text") {
    if (isInsideSkippedElement(ancestors)) return;

    const text = node.value;
    const matches = [...text.matchAll(TICKER_RE)];
    if (matches.length === 0) return;

    // Filter to actual stock tickers (max 1 autolink per ticker per article)
    const tickerMatches: RegExpExecArray[] = [];
    for (const m of matches) {
      const code = m[1];
      if (TICKER_SET.has(code) && !linkedTickers.has(code)) {
        linkedTickers.add(code);
        tickerMatches.push(m);
      }
    }
    if (tickerMatches.length === 0) return;

    const parent = ancestors[ancestors.length - 1];
    if (!parent) return;

    // Build replacement nodes
    const newChildren: Array<Text | Element> = [];
    let lastIndex = 0;

    for (const match of tickerMatches) {
      const ticker = match[1];
      const start = match.index!;
      const end = start + ticker.length;

      if (start > lastIndex) {
        newChildren.push({ type: "text", value: text.slice(lastIndex, start) });
      }

      newChildren.push({
        type: "element",
        tagName: "a",
        properties: {
          href: `/stocks/${ticker}.JK`,
          className: [
            "ticker-link",
            "inline-flex",
            "items-center",
            "rounded-md",
            "border",
            "border-accent/25",
            "bg-accent/10",
            "px-1.5",
            "py-0.5",
            "font-mono",
            "text-[0.85em]",
            "font-semibold",
            "text-accent",
            "no-underline",
            "hover:bg-accent/20",
            "transition-colors",
          ],
          "data-engagement": "chip_beritaInlineTicker",
          "data-nav-label": "nav_newsTickerChip_click",
        },
        children: [{ type: "text", value: ticker }],
      });

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      newChildren.push({ type: "text", value: text.slice(lastIndex) });
    }

    // Replace in parent
    const idx = parent.children.indexOf(node);
    if (idx !== -1) {
      parent.children.splice(idx, 1, ...newChildren);
    }
    return;
  }

  // Element or Root — recurse into children
  const children = (node as Parent).children;
  if (!children) return;

  const isElement = node.type === "element";
  if (isElement) ancestors.push(node as Element);

  // Iterate over a snapshot since we may mutate children
  for (const child of [...children]) {
    visit(child as Text | Element, ancestors, linkedTickers);
  }

  if (isElement) ancestors.pop();
}
