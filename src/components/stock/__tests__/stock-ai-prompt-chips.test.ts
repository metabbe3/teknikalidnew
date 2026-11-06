import { test } from "node:test";
import assert from "node:assert/strict";
import { StockAiPromptChips } from "../stock-ai-prompt-chips";

test("StockAiPromptChips: renders 3 chips with correct engagement attributes and deeplinks", () => {
  // Case A: normal RSI (between 35 and 65)
  const tree = StockAiPromptChips({
    ticker: "FORU.JK",
    rsi14: 50,
    signalScore: 0.6,
  });

  assert.ok(tree !== null);
  const chips = tree.props.children;
  assert.equal(chips.length, 3);

  // Chip 1: entry
  assert.equal(chips[0].props["data-engagement"], "chip_aiPromptEntry");
  assert.equal(chips[0].props.href, "https://t.me/TeknikalidAgentBot?start=FORU_JK_entry");
  assert.equal(chips[0].props.children, "🎯 Analisa FORU buat entry hari ini?");

  // Chip 2: level
  assert.equal(chips[1].props["data-engagement"], "chip_aiPromptLevel");
  assert.equal(chips[1].props.href, "https://t.me/TeknikalidAgentBot?start=FORU_JK_level");
  assert.equal(chips[1].props.children, "📐 Berapa support & target FORU?");

  // Chip 3: risk (default/normal RSI)
  assert.equal(chips[2].props["data-engagement"], "chip_aiPromptRisk");
  assert.equal(chips[2].props.href, "https://t.me/TeknikalidAgentBot?start=FORU_JK_risiko");
  assert.equal(chips[2].props.children, "🛡️ Cek risiko & aliran asing FORU");
});

test("StockAiPromptChips: dynamic risk text for high RSI (>= 65) and low RSI (<= 35)", () => {
  // Overbought RSI >= 65
  const treeHigh = StockAiPromptChips({
    ticker: "FORU",
    rsi14: 75,
    signalScore: 0.8,
  });
  const chip3High = treeHigh.props.children[2];
  assert.equal(chip3High.props.children, "⚠️ FORU rawan koreksi atau lanjut?");

  // Oversold RSI <= 35
  const treeLow = StockAiPromptChips({
    ticker: "FORU",
    rsi14: 25,
    signalScore: -0.4,
  });
  const chip3Low = treeLow.props.children[2];
  assert.equal(chip3Low.props.children, "🔄 FORU sudah siap pantul belum?");
});
