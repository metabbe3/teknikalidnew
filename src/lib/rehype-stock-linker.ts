import type { Root, Element, Text, Parent } from "hast";
import { ALL_TICKERS } from "./idx-stocks";

// Build a Set of tickers without .JK suffix for fast lookup
const TICKER_SET = new Set(ALL_TICKERS.map((t) => t.replace(".JK", "")));

// Match standalone 2-5 uppercase letter words
const TICKER_RE = /\b([A-Z]{2,5})\b/g;

/** Check if an ancestor is an <a> element (to avoid nested links) */
function isInsideLink(stack: Element[]): boolean {
  return stack.some((el) => el.tagName === "a");
}

/** Rehype plugin that wraps stock ticker text in links to /stocks/TICKER.JK */
export function rehypeStockLinker() {
  return (tree: Root) => {
    visit(tree, []);
  };
}

function visit(node: Root | Element | Text, ancestors: Element[]) {
  if (node.type === "text") {
    if (isInsideLink(ancestors)) return;

    const text = node.value;
    const matches = [...text.matchAll(TICKER_RE)];
    if (matches.length === 0) return;

    // Filter to actual stock tickers
    const tickerMatches = matches.filter((m) => TICKER_SET.has(m[1]));
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
          className: ["ticker-link"],
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
    visit(child as Text | Element, ancestors);
  }

  if (isElement) ancestors.pop();
}
