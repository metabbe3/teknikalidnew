/**
 * Selftest BRIEF H13: Endpoint web /api/market/fundamental + /api/market/fundflow.
 *
 * Verifikasi kontrak respons:
 * 1. /api/market/fundamental?ticker=BBCA & BBCA.JK:
 *    - ok: true, ticker: "BBCA"
 *    - asOf string YYYY-MM-DD
 *    - fundamental: pe > 0, dividendYield cocok DB (~6.6126% utk BBCA)
 *    - history: tren kwartal (<=4)
 *    - Cache-Control header: s-maxage=300, stale-while-revalidate=600
 *    - 404 bila ticker tak dikenal, 400 bila ticker kosong
 *
 * 2. /api/market/fundflow?ticker=BBCA & BBCA.JK:
 *    - ok: true, ticker: "BBCA"
 *    - sessions: 5 sesi terakhir {date, netShares, netValue}
 *    - cumulative5d: {shares, value} konsisten dengan sum(sessions)
 *    - Cache-Control header: s-maxage=300, stale-while-revalidate=600
 *    - 404 bila ticker tak dikenal, 400 bila ticker kosong
 *
 * Run: DATABASE_URL=... npx tsx scripts/selftest/market-fundamental-fundflow.selftest.ts
 */

import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getFundamental } from "../../src/app/api/market/fundamental/route";
import { GET as getFundflow } from "../../src/app/api/market/fundflow/route";
import { prisma } from "../../src/lib/prisma";

async function main() {
  console.log("=== Running market-fundamental-fundflow selftest ===");

  // ── 1. Fundamental BBCA (bare) ──
  const reqBare = new NextRequest("http://localhost:3000/api/market/fundamental?ticker=BBCA");
  const resBare = await getFundamental(reqBare);
  assert.equal(resBare.status, 200, "status must be 200");
  const dataBare = await resBare.json();
  assert.equal(dataBare.ok, true);
  assert.equal(dataBare.ticker, "BBCA");
  assert.ok(dataBare.asOf, "asOf must be populated");
  assert.ok(dataBare.fundamental, "fundamental must be populated");
  assert.ok(dataBare.fundamental.pe > 0, `pe must be > 0, got ${dataBare.fundamental.pe}`);
  assert.ok(dataBare.fundamental.dividendYield != null, "dividendYield must be populated");
  assert.ok(Array.isArray(dataBare.history), "history must be an array");
  assert.ok(dataBare.history.length > 0 && dataBare.history.length <= 4, "history length 1-4");

  // Verify Cache-Control header
  const cacheHeaderFund = resBare.headers.get("Cache-Control");
  assert.ok(cacheHeaderFund?.includes("s-maxage=300"), `Cache-Control must have s-maxage=300, got: ${cacheHeaderFund}`);
  assert.ok(cacheHeaderFund?.includes("stale-while-revalidate=600"), `Cache-Control must have stale-while-revalidate=600, got: ${cacheHeaderFund}`);
  console.log("✔ fundamental BBCA: pe=" + dataBare.fundamental.pe + ", divYield=" + dataBare.fundamental.dividendYield + "%, asOf=" + dataBare.asOf);

  // ── 2. Fundamental BBCA.JK suffix ──
  const reqJk = new NextRequest("http://localhost:3000/api/market/fundamental?ticker=BBCA.JK");
  const resJk = await getFundamental(reqJk);
  assert.equal(resJk.status, 200);
  const dataJk = await resJk.json();
  assert.equal(dataJk.ok, true);
  assert.equal(dataJk.ticker, "BBCA");
  assert.equal(dataJk.asOf, dataBare.asOf);
  console.log("✔ fundamental BBCA.JK matches bare BBCA");

  // ── 3. DB Parity Check for dividendYield ──
  const dbStock = await prisma.stock.findUnique({ where: { ticker: "BBCA.JK" } });
  assert.ok(dbStock, "BBCA.JK stock must exist");
  const dbLatest = await prisma.stockFundamental.findFirst({
    where: { stockId: dbStock.id },
    orderBy: { date: "desc" },
  });
  assert.ok(dbLatest, "BBCA latest fundamental in DB must exist");
  const expectedDivYield = dbLatest.dividendYield != null ? Number(dbLatest.dividendYield) : null;
  assert.equal(dataBare.fundamental.dividendYield, expectedDivYield, "dividendYield must match DB directly");
  console.log("✔ fundamental dividendYield matched DB directly: " + expectedDivYield);

  // ── 4. Fundamental 404 & 400 ──
  const reqFund404 = new NextRequest("http://localhost:3000/api/market/fundamental?ticker=UNKNOWNXYZ123");
  const resFund404 = await getFundamental(reqFund404);
  assert.equal(resFund404.status, 404);
  const dataFund404 = await resFund404.json();
  assert.equal(dataFund404.ok, false);
  assert.equal(dataFund404.error, "ticker tidak ditemukan");

  const reqFund400 = new NextRequest("http://localhost:3000/api/market/fundamental");
  const resFund400 = await getFundamental(reqFund400);
  assert.equal(resFund400.status, 400);
  console.log("✔ fundamental 404 & 400 guards verified");

  // ── 5. Fundflow BBCA ──
  const reqFF = new NextRequest("http://localhost:3000/api/market/fundflow?ticker=BBCA");
  const resFF = await getFundflow(reqFF);
  assert.equal(resFF.status, 200);
  const dataFF = await resFF.json();
  assert.equal(dataFF.ok, true);
  assert.equal(dataFF.ticker, "BBCA");
  assert.ok(Array.isArray(dataFF.sessions), "sessions must be array");
  assert.equal(dataFF.sessions.length, 5, "sessions must have 5 entries");
  assert.ok(dataFF.cumulative5d, "cumulative5d must exist");

  let sumShares = 0;
  let sumValue = 0;
  for (const s of dataFF.sessions) {
    assert.ok(s.date, "session must have date");
    assert.ok(typeof s.netShares === "number", "netShares must be number");
    assert.ok(typeof s.netValue === "number", "netValue must be number");
    sumShares += s.netShares;
    sumValue += s.netValue;
  }
  assert.equal(dataFF.cumulative5d.shares, sumShares, "cumulative shares must equal sum of sessions");
  assert.equal(dataFF.cumulative5d.value, sumValue, "cumulative value must equal sum of sessions");

  const cacheHeaderFF = resFF.headers.get("Cache-Control");
  assert.ok(cacheHeaderFF?.includes("s-maxage=300"), "Cache-Control must have s-maxage=300");
  assert.ok(cacheHeaderFF?.includes("stale-while-revalidate=600"), "Cache-Control must have stale-while-revalidate=600");
  console.log("✔ fundflow BBCA: 5 sessions, cumShares=" + dataFF.cumulative5d.shares + ", cumValue=" + dataFF.cumulative5d.value);

  // ── 6. Fundflow BBCA.JK suffix ──
  const reqFFJk = new NextRequest("http://localhost:3000/api/market/fundflow?ticker=BBCA.JK");
  const resFFJk = await getFundflow(reqFFJk);
  assert.equal(resFFJk.status, 200);
  const dataFFJk = await resFFJk.json();
  assert.equal(dataFFJk.ticker, "BBCA");
  console.log("✔ fundflow BBCA.JK matches bare BBCA");

  // ── 7. Fundflow 404 & 400 ──
  const reqFF404 = new NextRequest("http://localhost:3000/api/market/fundflow?ticker=UNKNOWNXYZ123");
  const resFF404 = await getFundflow(reqFF404);
  assert.equal(resFF404.status, 404);
  const dataFF404 = await resFF404.json();
  assert.equal(dataFF404.ok, false);
  assert.equal(dataFF404.error, "ticker tidak ditemukan");

  const reqFF400 = new NextRequest("http://localhost:3000/api/market/fundflow");
  const resFF400 = await getFundflow(reqFF400);
  assert.equal(resFF400.status, 400);
  console.log("✔ fundflow 404 & 400 guards verified");

  console.log("ALL TESTS PASSED!");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
