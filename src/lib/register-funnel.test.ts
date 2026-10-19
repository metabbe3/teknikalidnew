import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEmailLoose, passwordChecks, step2Ready } from "./register-funnel";

/**
 * PRD prd-2026-10-18-01 (idea-2026-10-18-1) — Register funnel 2-step progressive disclosure.
 * AC1: step-1 = SATU field email + tombol lanjut (gate isEmailLoose sebelum step-2).
 * AC3: logika password (panjang >=8 + cocok) DIEKSTRAK utuh dari page.tsx lama —
 *      perilaku identik, hanya pindah rumah (refactor no-behavior-change).
 * AC4: register_step1_submit / register_completed (label enum di validation.ts,
 *      diuji terpisah via grep fisik di suite docs — lihat result entry).
 */
describe("isEmailLoose — gate step-1 (AC1)", () => {
  it("email normal lolos", () => {
    for (const v of ["nama@email.com", "a.b+c@domain.co.id", "user123@sub.domain.org"]) {
      assert.equal(isEmailLoose(v), true, v);
    }
  });

  it("kosong / tanpa @ / tanpa dot di domain → ditolak", () => {
    for (const v of ["", "   ", "namaemail.com", "nama@", "@domain.com", "a@b"]) {
      assert.equal(isEmailLoose(v), false, v);
    }
  });

  it("spasi + multi-@ → ditolak", () => {
    assert.equal(isEmailLoose("nama email@a.com"), false);
    assert.equal(isEmailLoose("a@b@c.com"), false);
  });

  it("lebih dari 255 char → ditolak (paritas zod max(255))", () => {
    assert.equal(isEmailLoose(`${"a".repeat(250)}@x.co`), false);
  });

  it("uppercase tetap lolos (dinormalisasi nanti, bukan ditolak)", () => {
    assert.equal(isEmailLoose("Nama@Email.com"), true);
  });
});

describe("passwordChecks — ekstraksi perilaku lama (AC3 no-regresi)", () => {
  it("longEnough = >=8 (boundary 7/8)", () => {
    assert.equal(passwordChecks("1234567", "").longEnough, false);
    assert.equal(passwordChecks("12345678", "").longEnough, true);
  });

  it("matches hanya true kalau confirm terisi DAN sama", () => {
    assert.equal(passwordChecks("abcdefgh", "").matches, false); // confirm kosong = belum cocok (perilaku lama)
    assert.equal(passwordChecks("abcdefgh", "abcdefgh").matches, true);
    assert.equal(passwordChecks("abcdefgh", "abcdefgX").matches, false);
  });
});

describe("step2Ready — tombol submit step-2 aktif (AC1)", () => {
  it("aktif hanya saat password valid + cocok", () => {
    assert.equal(step2Ready("abcdefgh", "abcdefgh"), true);
    assert.equal(step2Ready("abcdefgh", "xxxxx"), false);
    assert.equal(step2Ready("abc", "abc"), false);
  });
});
