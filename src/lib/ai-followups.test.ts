import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitFollowUps } from "./ai-followups";

describe("splitFollowUps (RT-05)", () => {
  it("standar: 3 chip separator |", () => {
    const r = splitFollowUps("Jawaban.\n[FOLLOWUPS] Kenapa IHSG turun? | Bandingin BBRI? | Cek asing?");
    assert.deepEqual(r.followUps, ["Kenapa IHSG turun?", "Bandingin BBRI?", "Cek asing?"]);
    assert.equal(r.text, "Jawaban.");
  });
  it("bold + multiline bullet", () => {
    const r = splitFollowUps("Jwb.\n**[FOLLOWUPS]**\n- Kenapa IHSG turun?\n- Bandingin BBRI?\n- Cek asing?");
    assert.equal(r.followUps.length, 3);
  });
  it("separator / dan ;", () => {
    const r = splitFollowUps("Jwb.\n[FOLLOWUPS] Kenapa turun? / Bandingin BBRI? ; Cek asing?");
    assert.equal(r.followUps.length, 3);
  });
  it("tanpa tag → kosong", () => {
    assert.deepEqual(splitFollowUps("jawaban polos").followUps, []);
  });
  it("chip kepanjangan dibuang", () => {
    const r = splitFollowUps("J.\n[FOLLOWUPS] " + "x".repeat(70));
    assert.equal(r.followUps.length, 0);
  });
});
