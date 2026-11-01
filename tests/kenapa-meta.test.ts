import test, { describe, it } from "node:test";
import assert from "node:assert";
import { generateKenapaMetaDescription } from "../src/lib/kenapa-meta";

describe("kenapa-meta (arah harga × arah sinyal 6 kombinasi)", () => {
  it("kombinasi 1: naik + sinyal menguat", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "BBCA",
      changePercent: 2.5,
      signalTone: "menguat",
    });
    assert.strictEqual(
      desc,
      "BBCA naik 2.5% didorong penguatan sinyal teknikal — momentum beli dominan di pasar.",
    );
  });

  it("kombinasi 2: naik + sinyal melemah (technical rebound)", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "BTPS",
      changePercent: 3.1,
      signalTone: "melemah",
    });
    assert.strictEqual(
      desc,
      "BTPS naik 3.1% meski sinyal teknikal melemah — kemungkinan technical rebound.",
    );
  });

  it("kombinasi 3: naik + sinyal netral", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "TLKM",
      changePercent: 1.2,
      signalTone: "netral",
    });
    assert.strictEqual(
      desc,
      "TLKM naik 1.2% di tengah sinyal teknikal netral — pantau volume dan konfirmasi tren.",
    );
  });

  it("kombinasi 4: turun + sinyal melemah", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "ASII",
      changePercent: -2.8,
      signalTone: "melemah",
    });
    assert.strictEqual(
      desc,
      "ASII turun 2.8% seiring pelemahan sinyal teknikal — tekanan jual mendominasi pasar.",
    );
  });

  it("kombinasi 5: turun + sinyal menguat (buy on weakness / pullback)", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "AMRT",
      changePercent: -4.2,
      signalTone: "menguat",
    });
    assert.strictEqual(
      desc,
      "AMRT turun 4.2% meski sinyal teknikal menguat — potensi buy on weakness pada support.",
    );
  });

  it("kombinasi 6: turun + sinyal netral", () => {
    const desc = generateKenapaMetaDescription({
      ticker: "ICBP",
      changePercent: -1.0,
      signalTone: "netral",
    });
    assert.strictEqual(
      desc,
      "ICBP turun 1.0% di tengah sinyal teknikal netral — konsolidasi tanpa perubahan tren mayor.",
    );
  });
});
