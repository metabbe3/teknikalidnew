/**
 * CLI wrapper humanizePass — dipanggil teknikalid_growth.py (humanizer gate artikel).
 * Pakai: node --import tsx scripts/humanize_cli.ts <file.md>
 * Output: satu baris JSON {text, edits} di stdout (baris terakhir).
 */
import { readFileSync, writeFileSync } from "fs";
import { humanizePass } from "../src/domains/growth/humanize";

const path = process.argv[2];
if (!path) {
  console.error("usage: humanize_cli.ts <file.md>");
  process.exit(1);
}
const src = readFileSync(path, "utf-8");
const result = humanizePass(src);
writeFileSync(path, result.text, "utf-8"); // tulis balik biar py tak perlu escape
process.stdout.write(JSON.stringify({ text: result.text, edits: result.edits }) + "\n");
