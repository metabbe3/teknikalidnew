/**
 * Selftest: audit + recipe v2 system prompt web /api/ai/stock (21 Nov 2026).
 *
 * Kriteria:
 *  1. Klausa gate WAJIB (sitasi data, label waktu, disclaimer, "kamu", anti-CJK, ticker,
 *     Rp penuh, relasi SMA, [FOLLOWUPS], larangan beli/jual, anti-gorengan) masih ada.
 *  2. Frasa kontradiksi/duplikasi v1 sudah hilang.
 *  3. Prompt lebih ramping dari baseline v1 (≤ 80% karakter).
 *  4. Newbie-kompak: hanya guest + ask + riwayat kosong.
 *  5. route.ts memakai prompt v2 & jalur rate-limit/guest tidak berubah.
 *
 * Run: npx tsx src/domains/ai/aichat-prompt-audit.selftest.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STOCK_SYSTEM_PROMPT, NEWBIE_COMPACT_NOTE, shouldUseNewbieCompact } from "./stock-prompt";

const P = STOCK_SYSTEM_PROMPT;
const V1_CHARS = 7570; // baseline GLM_SYSTEM v1 (HEAD c3d62b9), diukur 21 Nov

const REQUIRED: Array<[string, RegExp]> = [
  ["sitasi: angka hanya dari DATA", /hanya pakai ANGKA dari DATA/],
  ["sitasi: dilarang mengarang angka", /DILARANG mengarang harga, level, atau angka/],
  ["sitasi: headline artikelTerkini + mana yang didukung data", /artikelTerkini[^.]*sebut mana yang didukung data/],
  ["sitasi: rujuk keterbukaan BEI / DES OJK", /keterbukaan informasi BEI/],
  ["sitasi: DES OJK / ISSI BEI", /DES OJK \/ ISSI BEI/],
  ["label waktu: close <tanggal>", /close <tanggal dari DATA>/],
  ["label waktu: dilarang 'hari ini' utk EOD", /DILARANG bilang 'hari ini' untuk angka EOD/],
  ["disclaimer: bukan saran beli/jual", /bukan saran beli\/jual/],
  ["disclaimer: bukan rekomendasi beli/jual", /bukan rekomendasi beli\/jual/],
  ["larangan bilang beli/jangan-beli", /JANGAN bilang beli atau jangan-beli/],
  ["bahasa kamu", /panggil user 'kamu'/],
  ["anti-CJK", /DILARANG KERAS menyisipkan karakter Cina\/Jepang\/Korea/],
  ["sebut ticker", /KODE SAHAM/],
  ["Rp penuh tanpa potong digit", /DILARANG memotong digit/],
  ["relasi SMA konsisten", /close di atas nilai SMA = 'di atas'/],
  ["arah pasar apa adanya", /marketContext\.ihsg\.arah APA ADANYA/],
  ["trailer FOLLOWUPS", /\[FOLLOWUPS\] Pertanyaan 1\? \| Pertanyaan 2\? \| Pertanyaan 3\?/],
  ["larangan chip transaksi", /DILARANG chip ajakan transaksi/],
  ["anti-gorengan", /DILARANG melabel emiten 'gorengan'/],
  ["posisiUser tanpa suruh cut loss/hold", /tanpa menyuruh cut loss atau hold/],
  ["premiseCheck", /premiseCheck/],
  ["asumsiEmiten", /asumsiEmiten/],
  ["tickerCorrection", /tickerCorrection/],
  ["dividen payout tidak boleh 'tidak tersedia'", /DILARANG bilang 'payout ratio tidak tersedia'/],
  ["satuan miliar", /Rp X miliar/],
];

const FORBIDDEN_V1: Array<[string, RegExp]> = [
  ["gaul dianjurkan vs jangan paksa gaul", /boleh 'nih'|ngobrol kayak teman/i],
  ["persona gue/lo (kontradiksi 'kamu')", /\b(gue|lo|lu|elo)\b/i],
  ["contoh 'hari ini' bertentangan label waktu", /hari ini justru/i],
  ["5 aturan 'kalimat PERTAMA' saling rebut", /KALIMAT PERTAMA/],
  ["buka 1-2 kalimat santai (vs verdict 1 baris)", /1-2 kalimat santai/],
  ["3-4 bullet (vs max 3)", /3-4 bullet/],
  ["empati = kalimat validasi terpisah di depan", /1 kalimat validasi emosi/],
  ["jawab intinya dulu (duplikat verdict-first)", /Jawab intinya dulu/],
  ["label waktu 'di awal' (vs verdict)", /sekali di awal/],
  ["disclaimer duplikat 'Satu kalimat penutup bahwa ini edukasi'", /Satu kalimat penutup/],
  ["format ribuan duplikat 'angka format ribuan Indonesia (8.200)'", /8\.200/],
];

describe("prompt web v2: klausa wajib dipertahankan", () => {
  for (const [name, re] of REQUIRED) {
    it(name, () => assert.match(P, re));
  }
  it("satu string tunggal (Z.ai system wajib string)", () => assert.equal(typeof P, "string"));
});

describe("prompt web v2: kontradiksi/duplikasi v1 hilang", () => {
  for (const [name, re] of FORBIDDEN_V1) {
    it(name, () => assert.doesNotMatch(P, re));
  }
  it("'DILARANG mengarang' tidak diulang >2x", () => {
    assert.ok((P.match(/DILARANG mengarang/g) ?? []).length <= 2);
  });
  it("tidak ada kalimat/blok duplikat persis", () => {
    const parts = P.split(/(?<=[.;])\s+/).filter((x) => x.length > 40);
    assert.equal(new Set(parts).size, parts.length);
  });
  it("tepat 1 pohon keputusan (urutan harga→teknikal→berita→jawab)", () => {
    assert.equal((P.match(/POHON KEPUTUSAN/g) ?? []).length, 1);
    const i1 = P.indexOf("(1) HARGA"), i2 = P.indexOf("(2) TEKNIKAL"), i3 = P.indexOf("(3) BERITA"), i4 = P.indexOf("(4) JAWAB");
    assert.ok(i1 > 0 && i1 < i2 && i2 < i3 && i3 < i4);
  });
  it("verdict-first + max 3 bullet", () => {
    assert.match(P, /verdict-first/);
    assert.match(P, /MAKSIMAL 3 bullet/);
  });
});

describe("prompt web v2: ukuran", () => {
  it(`≤ 80% karakter v1 (${V1_CHARS})`, () => {
    assert.ok(P.length <= V1_CHARS * 0.8, `len=${P.length}`);
  });
});

describe("newbie-kompak", () => {
  it("guest + ask + riwayat kosong → true", () =>
    assert.equal(shouldUseNewbieCompact({ authed: false, mode: "ask", historyLength: 0 }), true));
  it("login → false", () =>
    assert.equal(shouldUseNewbieCompact({ authed: true, mode: "ask", historyLength: 0 }), false));
  it("sudah ada riwayat → false", () =>
    assert.equal(shouldUseNewbieCompact({ authed: false, mode: "ask", historyLength: 2 }), false));
  it("summarize (kartu) → false", () =>
    assert.equal(shouldUseNewbieCompact({ authed: false, mode: "summarize", historyLength: 0 }), false));
  it("note memuat batas 110 kata + klausa wajib tetap", () => {
    assert.match(NEWBIE_COMPACT_NOTE, /110 kata/);
    assert.match(NEWBIE_COMPACT_NOTE, /Label waktu/);
    assert.match(NEWBIE_COMPACT_NOTE, /\[FOLLOWUPS\]/);
  });
});

describe("route.ts: wiring & invarian rate-limit", () => {
  const route = readFileSync(join(process.cwd(), "src/app/api/ai/stock/route.ts"), "utf8");
  it("memakai STOCK_SYSTEM_PROMPT, tak ada prompt inline lama", () => {
    assert.match(route, /from "@\/domains\/ai\/stock-prompt"/);
    assert.doesNotMatch(route, /const GLM_SYSTEM = \[/);
  });
  it("rate-limit & kuota tak berubah", () => {
    assert.match(route, /aiRateCheck\(ip, authed\)/);
    assert.match(route, /50 pertanyaan/);
    assert.match(route, /150 pertanyaan/);
  });
  it("jalur tetap /api/ai/stock; string konteks bebas 'Gue' & 'close hari ini'", () => {
    assert.doesNotMatch(route, /Gue asumsi/);
    assert.doesNotMatch(route, /close hari ini/);
    assert.match(route, /shouldUseNewbieCompact\(\{ authed, mode, historyLength: chatHistory\.length \}\)/);
  });
});
