import { test } from "node:test";
import assert from "node:assert/strict";
import { StockAiPromptChips } from "../stock-ai-prompt-chips";

test("StockAiPromptChips: renders 3 base chips when RSI is normal and score is <= 0.6", () => {
  // Case A: normal RSI (between 35 and 65) and signalScore = 0.6 (boundary, <= 0.6)
  const tree = StockAiPromptChips({
    ticker: "FORU.JK",
    rsi14: 50,
    signalScore: 0.6,
  });

  assert.ok(tree !== null);
  const chips = tree.props.children;
  assert.equal(chips.length, 3, "Harus tepat 3 chips jika tidak ada kondisi adaptif terpenuhi");

  // Helper untuk membaca engagement & deeplink pada StockAiChip props
  const getEngagement = (chip: any) => chip.props.engagement ?? chip.props["data-engagement"];
  const getHref = (chip: any) => chip.props.baseHref ?? chip.props.href;

  // Chip 1: entry
  assert.equal(getEngagement(chips[0]), "chip_aiPromptEntry");
  assert.equal(getHref(chips[0]), "https://t.me/TeknikalidAgentBot?start=FORU_JK_entry");
  assert.equal(chips[0].props.children, "🎯 Analisa FORU buat entry hari ini?");

  // Chip 2: level
  assert.equal(getEngagement(chips[1]), "chip_aiPromptLevel");
  assert.equal(getHref(chips[1]), "https://t.me/TeknikalidAgentBot?start=FORU_JK_level");
  assert.equal(chips[1].props.children, "📐 Berapa support & target FORU?");

  // Chip 3: risk (default/normal RSI)
  assert.equal(getEngagement(chips[2]), "chip_aiPromptRisk");
  assert.equal(getHref(chips[2]), "https://t.me/TeknikalidAgentBot?start=FORU_JK_risiko");
  assert.equal(chips[2].props.children, "🛡️ Cek risiko & aliran asing FORU");
});

test("StockAiPromptChips: dynamic risk text and adaptive chip for high RSI and low RSI", () => {
  // Overbought RSI >= 65 (rsi14: 75)
  const treeHigh = StockAiPromptChips({
    ticker: "FORU",
    rsi14: 75,
    signalScore: 0.8,
  });
  const chipsHigh = treeHigh.props.children;
  assert.equal(chipsHigh.length, 4, "RSI tinggi harus memicu chip adaptif ke-4");
  assert.equal(chipsHigh[2].props.children, "⚠️ FORU rawan koreksi atau lanjut?");
  assert.equal(chipsHigh[3].props.children, "RSI tinggi, waktunya take profit?");

  // Oversold RSI <= 35 (rsi14: 25)
  const treeLow = StockAiPromptChips({
    ticker: "FORU",
    rsi14: 25,
    signalScore: -0.4,
  });
  const chipsLow = treeLow.props.children;
  assert.equal(chipsLow.length, 4, "RSI rendah harus memicu chip adaptif ke-4");
  assert.equal(chipsLow[2].props.children, "🔄 FORU sudah siap pantul belum?");
  assert.equal(chipsLow[3].props.children, "Kenapa RSI rendah?");

  // Strong signal score > 0.6 with normal RSI
  const treeSignal = StockAiPromptChips({
    ticker: "BBCA",
    rsi14: 50,
    signalScore: 0.75,
  });
  const chipsSignal = treeSignal.props.children;
  assert.equal(chipsSignal.length, 4, "signalScore > 0.6 harus memicu chip adaptif 'Sinyal beli kuat?'");
  assert.equal(chipsSignal[3].props.children, "Sinyal beli kuat?");
});
