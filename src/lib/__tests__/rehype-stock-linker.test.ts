import { test } from "node:test";
import assert from "node:assert/strict";
import type { Root, Element, Text } from "hast";
import { rehypeStockLinker, extractArticleTickers } from "../rehype-stock-linker";

test("extractArticleTickers: extracts valid IDX tickers in priority order and caps at max", () => {
  const result = extractArticleTickers(
    {
      tickerTag: "BBCA.JK",
      tags: ["finance", "BBRI", "FAKE"],
      title: "Analisa BMRI dan BBCA Hari Ini",
      excerpt: "Saham TLKM serta ASII menguat, sedangkan ZZZZ tidak valid.",
      content: "Pergerakan GOTO dan UNTR menarik perhatian investor.",
    },
    4,
  );

  assert.deepEqual(result, ["BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK"]);
});

test("rehypeStockLinker: converts standalone tickers into pill chips with engagement attributes (max 1 per ticker)", () => {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "h2",
        properties: {},
        children: [{ type: "text", value: "Heading BBCA tidak boleh jadi link" }],
      },
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          {
            type: "text",
            value: "Saham BBCA dan BBRI naik, sedangkan BBCA disebut lagi.",
          },
        ],
      },
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: "/existing" },
            children: [{ type: "text", value: "Link TLKM eksisting" }],
          },
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: [{ type: "text", value: "ASII" }],
          },
        ],
      },
    ],
  };

  const plugin = rehypeStockLinker();
  plugin(tree);

  // 1. Heading should remain untouched (no <a> inside <h2>)
  const h2 = tree.children[0] as Element;
  assert.equal(h2.children.length, 1);
  assert.equal(h2.children[0].type, "text");

  // 2. First paragraph: first BBCA and BBRI become <a>, second BBCA stays text
  const p1 = tree.children[1] as Element;
  const linksInP1 = p1.children.filter(
    (c): c is Element => c.type === "element" && c.tagName === "a",
  );
  assert.equal(linksInP1.length, 2);

  const bbcaLink = linksInP1[0];
  assert.equal(bbcaLink.properties.href, "/stocks/BBCA.JK");
  assert.equal(bbcaLink.properties["data-engagement"], "chip_beritaInlineTicker");
  assert.equal(bbcaLink.properties["data-nav-label"], "nav_newsTickerChip_click");
  assert.ok(Array.isArray(bbcaLink.properties.className));
  assert.ok((bbcaLink.properties.className as string[]).includes("inline-flex"));
  assert.equal((bbcaLink.children[0] as Text).value, "BBCA");

  const bbriLink = linksInP1[1];
  assert.equal(bbriLink.properties.href, "/stocks/BBRI.JK");
  assert.equal((bbriLink.children[0] as Text).value, "BBRI");

  // Verify trailing text still contains the second BBCA unlinked
  const trailingText = p1.children[p1.children.length - 1] as Text;
  assert.equal(trailingText.type, "text");
  assert.ok(trailingText.value.includes("BBCA disebut lagi"));

  // 3. Second paragraph: existing <a> and <code> should not have nested <a>
  const p2 = tree.children[2] as Element;
  const existingAnchor = p2.children[0] as Element;
  assert.equal(existingAnchor.children.length, 1);
  assert.equal(existingAnchor.children[0].type, "text");

  const codeEl = p2.children[1] as Element;
  assert.equal(codeEl.children.length, 1);
  assert.equal(codeEl.children[0].type, "text");
});
