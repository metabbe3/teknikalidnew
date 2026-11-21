/**
 * Selftest Wave-11b: First-Question Suggestions + Guest Chat Quota (Argon detik-60).
 *
 * Verifikasi:
 * 1. Pure function buildGuestSuggestions(ticker?: string): string[]
 *    - Tepat 3 item
 *    - Ticker-aware vs generik
 *    - Tidak ada duplikat
 *    - Panjang setiap item < 90 karakter
 * 2. Ekstraksi ticker dari konteks (props, pageContext, pathname)
 * 3. Logika kuota lokal guest (50 pertanyaan/hari, decrement, clamp 0, date rollover)
 *
 * Run: npx tsx src/components/uhu/guest-suggestions.selftest.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGuestSuggestions,
  extractTickerFromContext,
  getGuestRemainingQuota,
  incrementGuestChatCount,
  setGuestChatCountMax,
  resetGuestChatCount,
} from "../../lib/guest-suggestions";

function createMockStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => {
      map.set(key, String(val));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe("Wave-11b: buildGuestSuggestions (Pure Function)", () => {
  it("menghasilkan 3 pertanyaan spesifik saham saat ticker diberikan", () => {
    const suggestions = buildGuestSuggestions("BBCA");

    assert.equal(suggestions.length, 3, "Harus tepat 3 item pertanyaan");
    assert.equal(
      suggestions[0],
      "Sekarang waktu yang bagus buat beli BBCA?",
      "Pertanyaan 1 harus sesuai template",
    );
    assert.equal(
      suggestions[1],
      "Kenapa BBCA gerak hari ini?",
      "Pertanyaan 2 harus sesuai template",
    );
    assert.equal(
      suggestions[2],
      "Arti skor sinyal BBCA buat pemula?",
      "Pertanyaan 3 harus sesuai template",
    );

    // Cek tidak ada duplikat
    const unique = new Set(suggestions);
    assert.equal(unique.size, 3, "Tidak boleh ada pertanyaan duplikat");

    // Cek batas panjang < 90 karakter
    for (const q of suggestions) {
      assert.ok(
        q.length < 90,
        `Panjang pertanyaan "${q}" (${q.length}) harus kurang dari 90 karakter`,
      );
    }
  });

  it("menghilangkan suffix .JK dan menormalkan kapitalisasi ticker", () => {
    const suggestionsJk = buildGuestSuggestions("bbca.jk");
    assert.equal(suggestionsJk[0], "Sekarang waktu yang bagus buat beli BBCA?");
    assert.equal(suggestionsJk[1], "Kenapa BBCA gerak hari ini?");
    assert.equal(suggestionsJk[2], "Arti skor sinyal BBCA buat pemula?");

    const suggestionsTrim = buildGuestSuggestions("  tlkm  ");
    assert.equal(suggestionsTrim[0], "Sekarang waktu yang bagus buat beli TLKM?");
  });

  it("menghasilkan 3 pertanyaan generik IDX saat tanpa ticker (panel global)", () => {
    const cases = [undefined, "", "   "];

    for (const input of cases) {
      const suggestions = buildGuestSuggestions(input);

      assert.equal(suggestions.length, 3, "Harus tepat 3 item pertanyaan");
      assert.equal(
        suggestions[0],
        "Saham apa yang lagi menarik minggu ini?",
        "Pertanyaan generik 1 harus sesuai spek",
      );
      assert.equal(
        suggestions[1],
        "Bedanya investor vs trader buat pemula?",
        "Pertanyaan generik 2 harus sesuai spek",
      );
      assert.equal(
        suggestions[2],
        "Cara baca skor sinyal di teknikal.id?",
        "Pertanyaan generik 3 harus sesuai spek",
      );

      // Cek tidak ada duplikat
      const unique = new Set(suggestions);
      assert.equal(unique.size, 3, "Tidak boleh ada duplikat generik");

      // Cek batas panjang < 90 karakter
      for (const q of suggestions) {
        assert.ok(
          q.length < 90,
          `Panjang pertanyaan generik "${q}" (${q.length}) harus < 90 karakter`,
        );
      }
    }
  });

  it("bersifat pure: pemanggilan berulang mengembalikan array baru yang identik tanpa side effect", () => {
    const res1 = buildGuestSuggestions("BBRI");
    const res2 = buildGuestSuggestions("BBRI");

    assert.notEqual(res1, res2, "Harus mengembalikan instance array baru");
    assert.deepEqual(res1, res2, "Konten harus identik");
  });
});

describe("Wave-11b: extractTickerFromContext", () => {
  it("memprioritaskan tickerProp jika disediakan", () => {
    const ticker = extractTickerFromContext("BBCA", "BBRI.JK", "/stocks/BMRI.JK");
    assert.equal(ticker, "BBCA");
  });

  it("fallback ke pageContext jika tickerProp tidak ada", () => {
    const ticker1 = extractTickerFromContext(undefined, "BBRI.JK", "/stocks/BMRI.JK");
    assert.equal(ticker1, "BBRI");

    const ticker2 = extractTickerFromContext(undefined, "TLKM", "/");
    assert.equal(ticker2, "TLKM");
  });

  it("fallback ke pathname jika tickerProp dan pageContext kosong", () => {
    const ticker1 = extractTickerFromContext(undefined, undefined, "/stocks/ASII.JK");
    assert.equal(ticker1, "ASII");

    const ticker2 = extractTickerFromContext(
      undefined,
      undefined,
      "/saham/GOTO/kenapa-naik-hari-ini",
    );
    assert.equal(ticker2, "GOTO");
  });

  it("mengembalikan undefined untuk halaman umum/non-saham", () => {
    assert.equal(extractTickerFromContext(undefined, undefined, "/"), undefined);
    assert.equal(extractTickerFromContext(undefined, undefined, "/pasar"), undefined);
    assert.equal(extractTickerFromContext(undefined, undefined, "/stocks"), undefined);
  });
});

describe("Wave-11b: Guest Chat Quota (Local Storage Counter)", () => {
  it("mengembalikan sisa kuota awal 50 saat belum ada chat", () => {
    const storage = createMockStorage();
    const remaining = getGuestRemainingQuota(storage);
    assert.equal(remaining, 50, "Sisa kuota awal guest harus 50");
  });

  it("mengurangi kuota secara akurat tiap increment", () => {
    const storage = createMockStorage();
    const now = new Date("2026-11-21T10:00:00Z");

    const r1 = incrementGuestChatCount(storage, now);
    assert.equal(r1, 49, "Setelah 1 chat, sisa 49");
    assert.equal(getGuestRemainingQuota(storage, now), 49);

    const r2 = incrementGuestChatCount(storage, now);
    assert.equal(r2, 48, "Setelah 2 chat, sisa 48");
    assert.equal(getGuestRemainingQuota(storage, now), 48);
  });

  it("clamp sisa kuota pada 0 saat kuota habis", () => {
    const storage = createMockStorage();
    const now = new Date("2026-11-21T10:00:00Z");

    setGuestChatCountMax(storage, now);
    assert.equal(getGuestRemainingQuota(storage, now), 0, "Batas maks -> sisa 0");

    const rOver = incrementGuestChatCount(storage, now);
    assert.equal(rOver, 0, "Sisa kuota tidak boleh negatif (clamp 0)");
    assert.equal(getGuestRemainingQuota(storage, now), 0);
  });

  it("mereset kuota ke 50 saat ganti hari (date rollover)", () => {
    const storage = createMockStorage();
    const day1 = new Date("2026-11-21T10:00:00Z");
    const day2 = new Date("2026-11-22T10:00:00Z");

    incrementGuestChatCount(storage, day1);
    incrementGuestChatCount(storage, day1);
    assert.equal(getGuestRemainingQuota(storage, day1), 48);

    // Hari berikutnya -> otomatis reset ke 50
    assert.equal(getGuestRemainingQuota(storage, day2), 50);

    const rNewDay = incrementGuestChatCount(storage, day2);
    assert.equal(rNewDay, 49);
  });

  it("resetGuestChatCount menghapus catatan kuota", () => {
    const storage = createMockStorage();
    const now = new Date("2026-11-21T10:00:00Z");

    incrementGuestChatCount(storage, now);
    assert.equal(getGuestRemainingQuota(storage, now), 49);

    resetGuestChatCount(storage);
    assert.equal(getGuestRemainingQuota(storage, now), 50);
  });
});

console.log("RESULT: ALL PASS");
