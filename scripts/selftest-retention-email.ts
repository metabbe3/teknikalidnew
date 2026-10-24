/**
 * Self-test untuk src/lib/mailer.ts + src/lib/retention-email.service.ts
 * (PRD idea-2026-10-19-1 / queue prd-2026-10-22-01 — FAILING-TEST-FIRST:
 * file ini ditulis & dijalankan SEBELUM implementasi; harus GAGAL dengan
 * module-not-found, lalu hijau setelah implementasi).
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/selftest-retention-email.ts
 *
 * Pure-function contract — assert-based, exit non-zero saat gagal.
 * Query parity vs SQL live diverifikasi via dry-run job (CronLog).
 */
import {
  DRY_RUN_DEFAULT,
  isMailerConfigured,
  sendEmail,
  renderRetentionEmail,
  type RetentionEmailData,
} from "../src/lib/mailer";
import {
  DAY2_MIN_OFFSET_DAYS,
  DAY2_MAX_OFFSET_DAYS,
  selectDay2Recipients,
  buildRetentionEmailData,
  recipientKey,
} from "../src/lib/retention-email.service";

async function main() {
let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log("  ✓ " + msg);
  else { failures++; console.error("  ✗ " + msg); }
}

console.log("\n[1] mailer.ts — kontrak env & DRY-RUN");
assert(DRY_RUN_DEFAULT === true, "DRY_RUN_DEFAULT = true (kirim nyata butuh env eksplisit)");
assert(isMailerConfigured() === false, "tanpa RETENTION_EMAIL_API_KEY env → not configured (dry-run)");
assert(isMailerConfigured({ apiKey: "re_x" } as never) === true, "apiKey terisi → configured");

console.log("\n[2] sendEmail DRY-RUN — log tanpa kirim");
async function testSendDryRun() {
  const res = await sendEmail({
    to: "budi@example.com",
    subject: "Uji",
    html: "<p>halo</p>",
    meta: { job: "selftest" },
  });
  assert(res.mode === "dry_run", "tanpa env → mode dry_run");
  assert(res.delivered === false, "dry_run tidak mengklaim delivered");
  assert(res.id === null, "dry_run tidak punya provider id");
}

await testSendDryRun();

console.log("\n[3] renderRetentionEmail — template AC3");
{
  const data: RetentionEmailData = {
    displayName: "Tri",
    watchlistRows: [
      { ticker: "BBRI.JK", close: 4200, prevClose: 4100 },
      { ticker: "MDKA.JK", close: 2400, prevClose: 2500 },
      { ticker: "ANTM.JK", close: 1985, prevClose: 1985 },
      { ticker: "UNTR.JK", close: 25000, prevClose: 24900 },
    ],
    siteUrl: "https://teknikal.id",
  };
  const html = renderRetentionEmail(data);
  assert(html.includes("Tri"), "sapaan nama render");
  assert(html.includes("BBRI"), "ticker watchlist render");
  assert(html.includes("+2,4%"), "chg% naik 1 desimal koma-ID (4200 vs 4100 = +2,4%)");
  assert(html.includes("-4,0%"), "chg% turun (2400 vs 2500 = -4,0%)");
  assert(html.includes("0,0%"), "chg% flat render");
  assert(
    html.includes("/stocks/BBRI.JK?utm_source=retention&amp;utm_medium=email"),
    "deep-link utm AC3 (HTML-escaped &amp; — client render = &)",
  );
  assert(html.includes("/saham-golden-cross"), "link sinyal 1 (daftar sama for-you-signals.tsx)");
  assert(html.includes("/saham-oversold"), "link sinyal 2");
  assert(html.includes("/saham-volume-spike"), "link sinyal 3");
  assert(html.includes("berhenti"), "unsubscribe statis ada");
  assert(!html.includes("undefined") && !html.includes("NaN"), "tanpa undefined/NaN bocor");
}

console.log("\n[4] window D+1/D+2 — konstanta");
assert(DAY2_MIN_OFFSET_DAYS === 1 && DAY2_MAX_OFFSET_DAYS === 2, "offset createdAt = 1..2 hari (AC2)");

console.log("\n[5] selectDay2Recipients — pure selector + alasan seleksi");
{
  const now = new Date("2026-10-22T02:00:00Z"); // 09:00 WIB
  const users = [
    { id: "u1", name: "Baru Kemarin", email: "u1@x.c", username: "u1x", createdAt: new Date("2026-10-21T03:00:00Z") }, // offset 1d — in
    { id: "u2", name: "Baru 2 Hari", email: "u2@x.c", username: "u2x", createdAt: new Date("2026-10-20T03:00:00Z") }, // offset 2d — in
    { id: "u3", name: "Baru 3 Hari", email: "u3@x.c", username: "u3x", createdAt: new Date("2026-10-19T03:00:00Z") }, // offset 3d — out
    { id: "u4", name: "Hari Ini", email: "u4@x.c", username: "u4x", createdAt: new Date("2026-10-22T01:00:00Z") }, // offset 0d — out
  ];
  const watchCounts: Record<string, number> = { u1: 2 };
  const day0Views: Record<string, number> = { u2: 3, u3: 5 };
  const starAdds: Record<string, number> = {};
  const sel = selectDay2Recipients({ users, watchCounts, day0Views, starAdds, now });
  assert(sel.length === 2, `tepat u1+u2 terpilih (got ${sel.length}: ${sel.map(s => s.user.id).join(",")})`);
  const u1 = sel.find(s => s.user.id === "u1");
  const u2 = sel.find(s => s.user.id === "u2");
  assert(!!u1 && u1.reasons.includes("watchlist:2"), "u1 alasan watchlist");
  assert(!!u2 && u2.reasons.includes("day0_views:3"), "u2 alasan day0_views");
  assert(sel.every(s => s.user.id !== "u3"), "u3 di luar window (offset 3d) walau views tinggi");
}

console.log("\n[6] buildRetentionEmailData — harga & fallback");
async function testBuildData() {
  const rows = await buildRetentionEmailData({
    user: { id: "u1", name: null, username: "trisul", email: "a@b.c" } as never,
    watchTickers: ["BBRI.JK", "NOPEC.JK"],
    priceByTicker: new Map([
      ["BBRI.JK", { close: 4200, prevClose: 4100 }],
      // NOPEC.JK sengaja tanpa harga → fallback line
    ]),
    siteUrl: "https://teknikal.id",
  });
  assert(rows.displayName === "trisul", "name null → fallback username");
  assert(rows.watchlistRows.length === 2, "semua ticker render walau tanpa harga");
  const nopec = rows.watchlistRows.find(r => r.ticker === "NOPEC.JK");
  assert(!!nopec && nopec.close === null && nopec.prevClose === null, "ticker tanpa harga → close null (line 'harga belum tersedia')");
}

await testBuildData();

console.log("\n[7] recipientKey — dedupe AC5");
assert(recipientKey("u1", "2026-10-22") === "u1:2026-10-22", "key = userId:date");
assert(recipientKey("u1", "2026-10-23") !== recipientKey("u1", "2026-10-22"), "hari beda = key beda (kirim ulang besok tak diblok)");

console.log(`\n${failures === 0 ? "SELFTEST OK" : "SELFTEST FAIL: " + failures}`);
  if (failures) process.exit(1);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
