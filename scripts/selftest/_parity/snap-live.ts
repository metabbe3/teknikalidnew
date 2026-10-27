import { marketSnapshotService } from "../../../src/domains/stock/market-snapshot.service";
async function main() {
const s = await marketSnapshotService.getSnapshot();
console.log("session:", s.sessionDate, "| ihsg:", s.ihsg ? `${s.ihsg.close} (${s.ihsg.changePercent.toFixed(2)}%)` : null);
console.log("breadth:", JSON.stringify(s.breadth), "| sektor:", Object.keys(s.sectors).length);
console.log("gainers:", s.gainers.map(g => `${g.ticker} ${g.changePercent.toFixed(2)}`).join(", "));
console.log("losers:", s.losers.map(g => `${g.ticker} ${g.changePercent.toFixed(2)}`).join(", "));

}
main();
