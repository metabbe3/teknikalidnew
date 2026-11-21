/**
 * Selftest: Verifikasi pure function pickAdaptiveChip(rsi, score) & expectation table.
 *
 * Rules:
 *  - rsi < 35  → "Kenapa RSI rendah?"
 *  - rsi > 65  → "RSI tinggi, waktunya take profit?"
 *  - score > 0.6 → "Sinyal beli kuat?"
 *  - Normal / boundary → null (hanya 3 base chips, tanpa chip adaptif)
 *  - Maksimal 4 chips total (3 base + 1 adaptif).
 *
 * Run: npx tsx src/components/stock/stock-ai-prompt-chips.selftest.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickAdaptiveChip,
  StockAiPromptChips,
} from "./stock-ai-prompt-chips";

interface TestCase {
  rsi: number | null | undefined;
  score: number | null | undefined;
  expectedText: string | null;
  expectedKey?: string;
  expectedEngagement?: string;
  desc: string;
}

const expectationTable: TestCase[] = [
  // Low RSI (< 35)
  {
    rsi: 20,
    score: 0.5,
    expectedText: "Kenapa RSI rendah?",
    expectedKey: "rsi_low",
    expectedEngagement: "chip_aiPromptRsiLow",
    desc: "RSI 20 (< 35) menghasilkan chip adaptif 'Kenapa RSI rendah?'",
  },
  {
    rsi: 34.9,
    score: null,
    expectedText: "Kenapa RSI rendah?",
    expectedKey: "rsi_low",
    expectedEngagement: "chip_aiPromptRsiLow",
    desc: "RSI 34.9 (< 35) dengan score null menghasilkan chip adaptif 'Kenapa RSI rendah?'",
  },
  {
    rsi: 0,
    score: 0.1,
    expectedText: "Kenapa RSI rendah?",
    expectedKey: "rsi_low",
    expectedEngagement: "chip_aiPromptRsiLow",
    desc: "RSI 0 menghasilkan chip adaptif 'Kenapa RSI rendah?'",
  },

  // High RSI (> 65)
  {
    rsi: 70,
    score: 0.5,
    expectedText: "RSI tinggi, waktunya take profit?",
    expectedKey: "rsi_high",
    expectedEngagement: "chip_aiPromptRsiHigh",
    desc: "RSI 70 (> 65) menghasilkan chip adaptif 'RSI tinggi, waktunya take profit?'",
  },
  {
    rsi: 65.1,
    score: null,
    expectedText: "RSI tinggi, waktunya take profit?",
    expectedKey: "rsi_high",
    expectedEngagement: "chip_aiPromptRsiHigh",
    desc: "RSI 65.1 (> 65) dengan score null menghasilkan chip adaptif 'RSI tinggi, waktunya take profit?'",
  },
  {
    rsi: 85,
    score: 0.2,
    expectedText: "RSI tinggi, waktunya take profit?",
    expectedKey: "rsi_high",
    expectedEngagement: "chip_aiPromptRsiHigh",
    desc: "RSI 85 (> 65) menghasilkan chip adaptif 'RSI tinggi, waktunya take profit?'",
  },

  // Strong signal score (> 0.6) with normal RSI
  {
    rsi: 50,
    score: 0.7,
    expectedText: "Sinyal beli kuat?",
    expectedKey: "signal_strong",
    expectedEngagement: "chip_aiPromptSignalStrong",
    desc: "score 0.7 (> 0.6) dengan RSI normal (50) menghasilkan chip adaptif 'Sinyal beli kuat?'",
  },
  {
    rsi: 45,
    score: 0.61,
    expectedText: "Sinyal beli kuat?",
    expectedKey: "signal_strong",
    expectedEngagement: "chip_aiPromptSignalStrong",
    desc: "score 0.61 (> 0.6) dengan RSI 45 menghasilkan chip adaptif 'Sinyal beli kuat?'",
  },
  {
    rsi: null,
    score: 0.85,
    expectedText: "Sinyal beli kuat?",
    expectedKey: "signal_strong",
    expectedEngagement: "chip_aiPromptSignalStrong",
    desc: "score 0.85 (> 0.6) dengan RSI null menghasilkan chip adaptif 'Sinyal beli kuat?'",
  },

  // Boundaries & neutral conditions (no adaptive chip => returns null)
  {
    rsi: 35,
    score: 0.5,
    expectedText: null,
    desc: "RSI 35 (boundary) mengembalikan null",
  },
  {
    rsi: 65,
    score: 0.5,
    expectedText: null,
    desc: "RSI 65 (boundary) mengembalikan null",
  },
  {
    rsi: 50,
    score: 0.6,
    expectedText: null,
    desc: "score 0.6 (boundary) mengembalikan null",
  },
  {
    rsi: 50,
    score: 0.4,
    expectedText: null,
    desc: "score 0.4 (netral) dan RSI 50 (netral) mengembalikan null",
  },
  {
    rsi: null,
    score: null,
    expectedText: null,
    desc: "RSI null dan score null mengembalikan null",
  },
  {
    rsi: undefined,
    score: undefined,
    expectedText: null,
    desc: "RSI undefined dan score undefined mengembalikan null",
  },

  // Priority test: RSI precedence
  {
    rsi: 20,
    score: 0.8,
    expectedText: "Kenapa RSI rendah?",
    expectedKey: "rsi_low",
    expectedEngagement: "chip_aiPromptRsiLow",
    desc: "RSI 20 (< 35) diprioritaskan di atas signalScore 0.8 (> 0.6)",
  },
  {
    rsi: 75,
    score: 0.8,
    expectedText: "RSI tinggi, waktunya take profit?",
    expectedKey: "rsi_high",
    expectedEngagement: "chip_aiPromptRsiHigh",
    desc: "RSI 75 (> 65) diprioritaskan di atas signalScore 0.8 (> 0.6)",
  },
];

describe("StockAiPromptChips: pickAdaptiveChip Expectation Table", () => {
  for (const tc of expectationTable) {
    it(tc.desc, () => {
      const result = pickAdaptiveChip(tc.rsi, tc.score);

      if (tc.expectedText === null) {
        assert.equal(
          result,
          null,
          `Ekspektasi null untuk rsi=${tc.rsi}, score=${tc.score}`,
        );
      } else {
        assert.ok(
          result !== null,
          `Ekspektasi chip adaptif untuk rsi=${tc.rsi}, score=${tc.score}`,
        );
        assert.equal(result.text, tc.expectedText);
        if (tc.expectedKey) {
          assert.equal(result.key, tc.expectedKey);
        }
        if (tc.expectedEngagement) {
          assert.equal(result.engagement, tc.expectedEngagement);
        }
      }
    });
  }

  it("komponen StockAiPromptChips menghasilkan maksimal 4 chips saat adaptif aktif dan tepat 3 chips saat netral", () => {
    // Kasus netral: 3 chips
    const neutralTree = StockAiPromptChips({
      ticker: "TLKM",
      rsi14: 50,
      signalScore: 0.5,
    });
    const neutralChips = neutralTree.props.children;
    assert.equal(neutralChips.length, 3, "Kasus netral harus menghasilkan tepat 3 chips");

    // Kasus adaptif low RSI: 4 chips (3 base + 1 adaptif)
    const lowTree = StockAiPromptChips({
      ticker: "BBRI",
      rsi14: 28,
      signalScore: null,
    });
    const lowChips = lowTree.props.children;
    assert.equal(lowChips.length, 4, "Kasus low RSI harus menghasilkan tepat 4 chips");
    assert.equal(lowChips[3].props.children, "Kenapa RSI rendah?");

    // Kasus adaptif high RSI: 4 chips (3 base + 1 adaptif)
    const highTree = StockAiPromptChips({
      ticker: "BREN",
      rsi14: 78,
      signalScore: 0.4,
    });
    const highChips = highTree.props.children;
    assert.equal(highChips.length, 4, "Kasus high RSI harus menghasilkan tepat 4 chips");
    assert.equal(highChips[3].props.children, "RSI tinggi, waktunya take profit?");

    // Kasus adaptif signal score: 4 chips (3 base + 1 adaptif)
    const signalTree = StockAiPromptChips({
      ticker: "ASII",
      rsi14: 55,
      signalScore: 0.85,
    });
    const signalChips = signalTree.props.children;
    assert.equal(signalChips.length, 4, "Kasus strong signal harus menghasilkan tepat 4 chips");
    assert.equal(signalChips[3].props.children, "Sinyal beli kuat?");
  });
});

console.log("RESULT: ALL PASS");
