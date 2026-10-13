import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerCtaHref } from "./register-cta";

/**
 * PRD idea-2026-10-13-2 AC2: CTA register kontekstual dengan atribusi
 * ai-search (utm_source=ai-search&utm_medium=referral) yang tertangkap
 * PageView di halaman /auth/ (extractPageviewAttribution).
 */
describe("registerCtaHref — atribusi ai-search (PRD idea-2026-10-13-2)", () => {
  it("golden-cross slug → href utm_source=ai-search + utm_medium=referral + campaign slug", () => {
    assert.equal(
      registerCtaHref("saham-golden-cross"),
      "/auth/register?utm_source=ai-search&utm_medium=referral&utm_campaign=saham-golden-cross",
    );
  });

  it("semua nilai utm lolos regex parseUtmParam ([a-z0-9_-]{1,32}) agar tidak dinull-kan tracker", () => {
    const href = registerCtaHref("saham-volume-spike");
    const params = new URLSearchParams(href.split("?")[1]);
    for (const [k, v] of params) {
      assert.match(v, /^[a-z0-9_-]{1,32}$/, `param ${k}="${v}" gagal validasi tracker`);
    }
  });

  it("path tujuan adalah halaman register yang benar-benar ada (bukan /auth/signup)", () => {
    assert.ok(registerCtaHref("saham-oversold").startsWith("/auth/register?"));
  });
});
