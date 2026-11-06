import { test } from "node:test";
import assert from "node:assert/strict";
import { StrongerPeersStrip, type PeerCandidate } from "../stronger-peers-strip";

test("StrongerPeersStrip: returns null when peers array is empty or has no valid signal scores", () => {
  const res1 = StrongerPeersStrip({
    currentTicker: "FORU.JK",
    currentScore: 0.5,
    sectorLabel: "Teknologi",
    peers: [],
  });
  assert.equal(res1, null);

  const res2 = StrongerPeersStrip({
    currentTicker: "FORU.JK",
    currentScore: 0.5,
    sectorLabel: "Teknologi",
    peers: [
      { ticker: "FORU.JK", name: "Fortune Indonesia", close: 100, changePercent: 0, signalScore: 0.8 },
      { ticker: "TECH.JK", name: "Tech Indo", close: 200, changePercent: 1.5, signalScore: null },
    ],
  });
  assert.equal(res2, null);
});

test("StrongerPeersStrip: filters current ticker, sorts descending, caps at 3, and selects correct title", () => {
  const peers: PeerCandidate[] = [
    { ticker: "FORU.JK", name: "Fortune", close: 100, changePercent: 2, signalScore: 0.3 },
    { ticker: "PEER1.JK", name: "Peer Satu", close: 150, changePercent: 1, signalScore: 0.4 },
    { ticker: "PEER2.JK", name: "Peer Dua", close: 250, changePercent: -1, signalScore: 0.8 },
    { ticker: "PEER3.JK", name: "Peer Tiga", close: 350, changePercent: 3, signalScore: 0.6 },
    { ticker: "PEER4.JK", name: "Peer Empat", close: 450, changePercent: 0.5, signalScore: 0.2 },
  ];

  // Case A: current score is 0.3, top peer (0.8) is stronger
  const treeA = StrongerPeersStrip({
    currentTicker: "FORU.JK",
    currentScore: 0.3,
    sectorLabel: "Konsumer",
    peers,
  });
  assert.ok(treeA !== null);
  // Title verification
  const titleA = treeA.props.children[0].props.children[0].props.children;
  assert.equal(titleA, "🔥 3 Saham Konsumer dengan Sinyal Lebih Kuat Hari Ini");

  // Grid cards count verification
  const gridChildrenA = treeA.props.children[1].props.children;
  assert.equal(gridChildrenA.length, 3);
  // Ordered by signalScore desc: PEER2 (0.8), PEER3 (0.6), PEER1 (0.4)
  assert.equal(gridChildrenA[0].key, "PEER2.JK");
  assert.equal(gridChildrenA[1].key, "PEER3.JK");
  assert.equal(gridChildrenA[2].key, "PEER1.JK");
  assert.equal(gridChildrenA[0].props["data-engagement"], "funnel_peerStrongerCard");

  // Top CTA screener link
  const topCtaA = treeA.props.children[0].props.children[1];
  assert.equal(topCtaA.props["data-engagement"], "funnel_screenerTopCta");
  assert.equal(topCtaA.props.href, "/stocks?style=swing-trade");

  // Case B: current stock is already the strongest in sector
  const treeB = StrongerPeersStrip({
    currentTicker: "FORU.JK",
    currentScore: 0.9,
    sectorLabel: "Konsumer",
    peers,
  });
  assert.ok(treeB !== null);
  const titleB = treeB.props.children[0].props.children[0].props.children;
  assert.equal(titleB, "📊 Pembanding Terkuat Sektor Konsumer Hari Ini");
});
