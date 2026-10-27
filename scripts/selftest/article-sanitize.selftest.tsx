// Selftest: stored-XSS guard di article renderer (fix-2026-10-26-09).
// Render payload via react-dom/server renderToStaticMarkup, assert malicious
// payload sterilized dan konten legit (tabel/callout/img/heading id) selamat.
// Run: npx tsx scripts/selftest/article-sanitize.selftest.ts → exit 0 = PASS.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleContent } from "@/components/article/article-renderer";

const render = (md: string) => renderToStaticMarkup(<ArticleContent content={md} />);

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

// --- Malicious payloads: output TIDAK boleh mengandung marker XSS ---
const malicious: [string, string][] = [
  ["script-tag", "<script>alert(1)</script>"],
  ["img-onerror", "<img src=x onerror=alert(1)>"],
  ["js-href", "[x](javascript:alert(1))"],
  ["style-js", '<div style="background:url(javascript:1)"> styled </div>'],
];
const markers = ["<script", "onerror", "javascript:", "alert(1)"];

for (const [name, md] of malicious) {
  const out = render(md);
  for (const m of markers) {
    check(`${name}: no "${m}"`, !out.includes(m), `output: ${out}`);
  }
}

// --- Legit markdown: fitur artikel TIDAK boleh rusak ---
const legit =
  "| Kolom A | Kolom B |\n" +
  "| --- | --- |\n" +
  "| 1 | 2 |\n\n" +
  ':::tip{label="Cara baca"}\nIsi callout\n:::\n\n' +
  "![gambar](https://example.com/a.png)\n\n" +
  "## Foo Bar\n";

const legitOut = render(legit);
check("tabel GFM selamat", legitOut.includes("<table"), legitOut);
check("callout className selamat", legitOut.includes("tip-box"), legitOut);
check("callout label selamat", legitOut.includes("callout-label"), legitOut);
check("img markdown selamat", legitOut.includes("<img") && legitOut.includes("https://example.com/a.png"), legitOut);
check("heading id (rehypeSlug) selamat", legitOut.includes('id="foo-bar"'), legitOut);

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
