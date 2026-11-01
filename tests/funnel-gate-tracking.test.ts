import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getGateRegisterHref, executeRegister } from "../src/lib/register-funnel";

describe("Funnel Gate Tracking & Honest Register Telemetry", () => {
  // Kasus 1: href ctx benar ter-encode
  it("Kasus 1: href ctx benar ter-encode", () => {
    const href1 = getGateRegisterHref("BBCA.JK");
    assert.equal(href1, "/auth/register?ctx=BBCA.JK");

    const href2 = getGateRegisterHref("BBCA/JK & GOTO");
    assert.equal(href2, "/auth/register?ctx=BBCA%2FJK%20%26%20GOTO");

    // Pastikan decoding query parameter mengembalikan konteks asli persis
    const url = new URL(`https://teknikal.id${href2}`);
    assert.equal(url.searchParams.get("ctx"), "BBCA/JK & GOTO");
  });

  // Kasus 2: register_success fire only on success path — mock fetch
  it("Kasus 2: register_success fire only on success path — mock fetch", async () => {
    // 2a. Success path (server response 201 OK)
    const successEvents: string[] = [];
    const mockSuccessFetch = async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });

    const successRes = await executeRegister({
      email: "trader@sukses.id",
      password: "password123",
      confirmPassword: "password123",
      ctx: "BBCA.JK",
      anonId: "anon-test-uuid",
      fetchFn: mockSuccessFetch as unknown as typeof fetch,
      trackFn: (ev) => successEvents.push(ev),
    });

    assert.equal(successRes.ok, true);
    assert.ok(successEvents.includes("register_success"), "register_success wajib terkirim saat server OK");
    assert.ok(successEvents.includes("register_success_ctx:BBCA.JK"), "register_success_ctx dengan nilai ctx wajib terkirim");

    // 2b. Failure path: duplicate email / 400 Bad Request
    const failEvents: string[] = [];
    const mockFailFetch = async () =>
      new Response(JSON.stringify({ error: "Email sudah terdaftar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });

    const failRes = await executeRegister({
      email: "trader@duplikat.id",
      password: "password123",
      confirmPassword: "password123",
      ctx: "BBCA.JK",
      anonId: "anon-test-uuid",
      fetchFn: mockFailFetch as unknown as typeof fetch,
      trackFn: (ev) => failEvents.push(ev),
    });

    assert.equal(failRes.ok, false);
    assert.equal(failRes.error, "Email sudah terdaftar");
    assert.equal(
      failEvents.length,
      0,
      "register_success TIDAK boleh terkirim saat server response error (bukan success)"
    );
    assert.ok(!failEvents.includes("register_success"));
  });

  // Kasus 3: tanpa context → href polos
  it("Kasus 3: tanpa context → href polos", () => {
    assert.equal(getGateRegisterHref(), "/auth/register");
    assert.equal(getGateRegisterHref(undefined), "/auth/register");
    assert.equal(getGateRegisterHref(""), "/auth/register");
    assert.equal(getGateRegisterHref("   "), "/auth/register");
    assert.equal(getGateRegisterHref(null), "/auth/register");

    const href = getGateRegisterHref();
    assert.ok(!href.includes("?"), "href tanpa context tidak boleh memiliki query string");
  });
});
