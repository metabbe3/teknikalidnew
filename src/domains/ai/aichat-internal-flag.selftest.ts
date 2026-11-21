/**
 * Selftest Wave-5: DATA INTEGRITY (audit Opus 21 Nov 2026).
 *
 * Verifikasi pure helper shouldMarkInternal({ anonId, userId, qaHeader })
 * untuk flag isInternal di model AiChatLog.
 *
 * Kriteria:
 * 1. anonId null && userId null -> true (battery internal historis & automated run tanpa identitas)
 * 2. ada anonId -> false (manusia riil di web dengan anonId)
 * 3. ada userId -> false (manusia riil login)
 * 4. qaHeader match -> true (request QA battery yang membawa token identifikasi)
 *
 * Run: npx tsx src/domains/ai/aichat-internal-flag.selftest.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldMarkInternal } from "./ai-gate.service";

describe("shouldMarkInternal (AiChatLog isInternal detector)", () => {
  it("return true saat anonId null dan userId null (kriteria QA battery historis)", () => {
    assert.equal(
      shouldMarkInternal({ anonId: null, userId: null }),
      true,
      "anonId null & userId null harus ditandai internal",
    );
    assert.equal(
      shouldMarkInternal({ anonId: undefined, userId: undefined }),
      true,
      "anonId undefined & userId undefined harus ditandai internal",
    );
    assert.equal(
      shouldMarkInternal({}),
      true,
      "objek kosong tanpa anonId/userId harus ditandai internal",
    );
    assert.equal(
      shouldMarkInternal(undefined),
      true,
      "tanpa parameter harus default internal",
    );
    assert.equal(
      shouldMarkInternal({ anonId: "", userId: null }),
      true,
      "anonId string kosong harus dianggap tidak ada",
    );
    assert.equal(
      shouldMarkInternal({ anonId: "   ", userId: "   " }),
      true,
      "whitespace-only anonId & userId harus dianggap tidak ada",
    );
  });

  it("return false saat ada anonId (pengunjung web riil)", () => {
    assert.equal(
      shouldMarkInternal({
        anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
        userId: null,
      }),
      false,
      "pengunjung dengan anonId valid bukan internal",
    );
    assert.equal(
      shouldMarkInternal({
        anonId: "c3d4e5f6-1234-5678-90ab-cdef12345678",
        userId: null,
      }),
      false,
      "pengunjung anonim lain bukan internal",
    );
  });

  it("return false saat ada userId (pengguna login)", () => {
    assert.equal(
      shouldMarkInternal({
        anonId: null,
        userId: "usr_ck87xyz123",
      }),
      false,
      "pengguna terautentikasi bukan internal",
    );
    assert.equal(
      shouldMarkInternal({
        anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
        userId: "usr_ck87xyz123",
      }),
      false,
      "pengguna login dengan anonId juga bukan internal",
    );
  });

  it("return true saat qaHeader cocok dengan QA_MARKER_TOKEN via process.env", () => {
    const originalEnv = process.env.QA_MARKER_TOKEN;
    try {
      process.env.QA_MARKER_TOKEN = "qa-secret-token-xyz";

      // Meskipun ada anonId, jika membawa marker token QA yang cocok -> harus true
      assert.equal(
        shouldMarkInternal({
          anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
          userId: null,
          qaHeader: "qa-secret-token-xyz",
        }),
        true,
        "qaHeader cocok dengan QA_MARKER_TOKEN harus ditandai internal",
      );

      // Bahkan untuk user yang login
      assert.equal(
        shouldMarkInternal({
          anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
          userId: "usr_test_account",
          qaHeader: "qa-secret-token-xyz",
        }),
        true,
        "qaHeader QA valid pada sesi login tetap internal",
      );

      // Jika marker tidak cocok
      assert.equal(
        shouldMarkInternal({
          anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
          userId: null,
          qaHeader: "wrong-token",
        }),
        false,
        "qaHeader salah dengan anonId valid tidak boleh ditandai internal",
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.QA_MARKER_TOKEN;
      } else {
        process.env.QA_MARKER_TOKEN = originalEnv;
      }
    }
  });

  it("return true saat qaHeader cocok via expectedToken parameter", () => {
    assert.equal(
      shouldMarkInternal({
        anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
        userId: null,
        qaHeader: "custom-marker-123",
        expectedToken: "custom-marker-123",
      }),
      true,
      "qaHeader cocok via parameter expectedToken",
    );
    assert.equal(
      shouldMarkInternal({
        anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
        userId: null,
        qaHeader: "different-marker",
        expectedToken: "custom-marker-123",
      }),
      false,
      "qaHeader tidak cocok dengan expectedToken",
    );
  });

  it("tidak menandai internal jika QA_MARKER_TOKEN tidak diset dan qaHeader sembarang dikirim pengunjung dengan anonId", () => {
    const originalEnv = process.env.QA_MARKER_TOKEN;
    try {
      delete process.env.QA_MARKER_TOKEN;

      assert.equal(
        shouldMarkInternal({
          anonId: "b01a71a1-0000-4000-8000-a71f00d66001",
          userId: null,
          qaHeader: "unconfigured-header-value",
        }),
        false,
        "tanpa konfigurasi token, header acak tidak boleh menandai user sebagai internal",
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.QA_MARKER_TOKEN = originalEnv;
      }
    }
  });
});
