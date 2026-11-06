// Digest harian 16:50 WIB — kirim update semua pantauan aktif per chat.
// ret-qw3 (retention-riset 2026-10-30): ber-DELTA + deep-link + konteks asing/dividen.
//   - harga pembanding pakai baris volume>0 terakhir (doktrin harga platform, hindari sesi nol)
//   - skor 2 sesi terakhir: tampilkan "0,48 → 0,66" saat |Δ|>=0.08 atau label berubah
//   - 1 ForeignFlow terbaru + StockDividend cumDate <=7 hari
//   - tiap ticker jadi tautan langsung ke halaman sahamnya (1 ketukan balik ke web)
// Angka dari DB saja — bukan rekomendasi jual-beli.
//
// prd-2026-11-06-01 (CTO NIGHT 6 Nov) — hardening AC3+AC5:
//   - retry pg connect 3x backoff 5s (pelajaran ECONNREFUSED 5 Nov: proses mati-surip tanpa retry)
//   - lockfile /tmp/tg-digest.lock anti double-run (stale-lock steal berdasar PID)
//   - INSERT TelegramSent per kirim (slug watch-digest-YYYY-MM-DD WIB) + pre-check dup —
//     kanon angka kirim ada di DB, re-run idempotent
//   - kegagalan TAK senyap: baris [tg-digest] ... bisa digrep sre_brief + exit code 1 saat ada fail
//   - --dry-run: build pesan penuh, tampilkan preview, 0 kirim, 0 insert, tanpa lockfile
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tgWebUrl } from './utm.mjs';
const require = createRequire('/Users/nicholasandriansurjadi/.hermes/opt/tgbot/');
const pg = require('pg');
const { Client } = pg;
const TOK = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOK}`;
const DRY = process.argv.includes('--dry-run');
const LOCK = '/tmp/tg-digest.lock';
const wibDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const DIGEST_SLUG = `watch-digest-${wibDate()}`;

// --- lockfile anti double-run (AC3) — hanya untuk run nyata ---
if (!DRY) {
  if (existsSync(LOCK)) {
    const held = readFileSync(LOCK, 'utf8').trim();
    let alive = false;
    try { process.kill(Number(held), 0); alive = true; } catch (e) { alive = e.code !== 'ESRCH'; }
    if (alive) { process.stdout.write(JSON.stringify({ skipped: 'lock-held', pid: held }) + '\n'); process.exit(0); }
    console.error(`[tg-digest] stale lock pid=${held} — steal`);
  }
  writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => {
    try { if (readFileSync(LOCK, 'utf8').trim() === String(process.pid)) unlinkSync(LOCK); } catch (e) { /* sudah dihapus */ }
  });
}

async function send(chatId, text) {
  const r = await fetch(`${API}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, text, parse_mode:'HTML', link_preview_options:{ is_disabled:true } }) }).catch(e => {
    console.error(`[tg-digest] telegram fetch error chat=${chatId}: ${e.message}`);
    return null;
  });
  if (r && r.status !== 200) console.error(`[tg-digest] telegram send fail chat=${chatId} http=${r.status}`);
  return r && r.status === 200;
}

// --- retry connect 3x backoff 5s (AC3) ---
const c = new Client({ connectionString: process.env.DATABASE_URL });
for (let attempt = 1; attempt <= 3; attempt++) {
  try { await c.connect(); break; }
  catch (e) {
    console.error(`[tg-digest] pg connect attempt ${attempt}/3 fail: ${e.code || e.message}`);
    if (attempt === 3) { console.error('[tg-digest] DB unreachable setelah 3 percobaan — abort'); process.exit(1); }
    await new Promise(r => setTimeout(r, 5000));
  }
}

// saham unik terpantau
const w = await c.query('SELECT DISTINCT ticker FROM "TelegramWatch" WHERE active=true');
if (!w.rows.length) { process.stdout.write('no watches\n'); process.exit(0); }
const tickers = w.rows.map(r => r.ticker);

// data semua ticker dalam 1 query LATERAL (hindari N+1 × query tunggal per ticker)
let q;
try {
  q = await c.query(`
  SELECT s.ticker,
    px.close AS last, px_prev.close AS prev,
    si."signalScore" AS score, si_prev."signalScore" AS score_prev,
    si."signalLabel" AS label, si_prev."signalLabel" AS label_prev,
    ff.net_value AS foreign_net,
    div.cum AS cum_days
  FROM "Stock" s
  LEFT JOIN LATERAL (
    SELECT sp.close FROM "StockPrice" sp WHERE sp."stockId"=s.id AND sp.volume > 0 ORDER BY sp.date DESC LIMIT 1
  ) px ON true
  LEFT JOIN LATERAL (
    SELECT sp.close FROM "StockPrice" sp WHERE sp."stockId"=s.id AND sp.volume > 0 ORDER BY sp.date DESC OFFSET 1 LIMIT 1
  ) px_prev ON true
  LEFT JOIN LATERAL (
    SELECT si."signalScore", si."signalLabel" FROM "StockIndicator" si WHERE si."stockId"=s.id ORDER BY si.date DESC LIMIT 1
  ) si ON true
  LEFT JOIN LATERAL (
    SELECT si."signalScore", si."signalLabel" FROM "StockIndicator" si WHERE si."stockId"=s.id ORDER BY si.date DESC OFFSET 1 LIMIT 1
  ) si_prev ON true
  LEFT JOIN LATERAL (
    SELECT (ff."foreignSell" - ff."foreignBuy") * -1 AS net_value
    FROM "ForeignFlow" ff WHERE ff."stockId"=s.id AND ff.date >= NOW() - INTERVAL '7 days' ORDER BY ff.date DESC LIMIT 1
  ) ff ON true
  LEFT JOIN LATERAL (
    SELECT ("cumDate" - CURRENT_DATE) AS cum FROM "StockDividend" sd
    WHERE sd."stockId"=s.id AND sd."cumDate" >= CURRENT_DATE AND sd."cumDate" <= CURRENT_DATE + 7 ORDER BY sd."cumDate" LIMIT 1
  ) div ON true
  WHERE s.ticker = ANY($1)`, [tickers]);
} catch (e) {
  console.error(`[tg-digest] data query fail: ${e.message}`);
  process.exit(1);
}

const data = {};
for (const r of q.rows) {
  const last = +r.last, prev = +r.prev;
  const chg = last && prev ? ((last - prev) / prev) * 100 : null;
  const score = r.score !== null ? +r.score : null;
  const scorePrev = r.score_prev !== null ? +r.score_prev : null;
  const labelFlip = r.label && r.label_prev && r.label !== r.label_prev;
  const scoreDelta = score !== null && scorePrev !== null ? score - scorePrev : null;
  const interesting = labelFlip || (scoreDelta !== null && Math.abs(scoreDelta) >= 0.08);
  data[r.ticker] = {
    last, chg, score, scorePrev, label: r.label || '-', labelFlip,
    foreignNet: r.foreign_net !== null && r.foreign_net !== undefined ? +r.foreign_net : null,
    cumDays: r.cum_days !== null && r.cum_days !== undefined ? +r.cum_days : null,
    interesting,
  };
}

const fmtRpM = (v) => {
  const a = Math.abs(v);
  if (a >= 1e12) return `Rp${(v/1e12).toFixed(1).replace('.',',')} T`;
  if (a >= 1e9) return `Rp${(v/1e9).toFixed(1).replace('.',',')} M`;
  return `Rp${(v/1e6).toFixed(0)} jt`;
};

function lineFor(ticker) {
  const d = data[ticker];
  const bare = ticker.replace('.JK','');
  const link = `<a href="${tgWebUrl(`/stocks/${ticker}`, 'daily_digest')}">${bare}</a>`;
  if (!d || !d.last) return `• ${bare} — data belum tersedia`;
  const arrow = d.chg === null ? '⚪' : d.chg >= 0 ? '🟢' : '🔴';
  let mid = `<b>${link}</b> ${d.last.toLocaleString('id-ID')}`;
  if (d.chg !== null) mid += ` (${d.chg >= 0 ? '+' : ''}${d.chg.toFixed(2).replace('.',',')}%)`;
  const extras = [];
  if (d.labelFlip) extras.push(`⚡ label ${d.label}`);
  if (d.score !== null && d.scorePrev !== null && (d.labelFlip || Math.abs((d.score ?? 0) - d.scorePrev) >= 0.08)) {
    extras.push(`skor ${d.scorePrev.toFixed(2).replace('.',',')} → ${d.score.toFixed(2).replace('.',',')}`);
  } else if (d.score !== null) {
    extras.push(`skor ${d.score.toFixed(2).replace('.',',')}`);
  }
  if (d.foreignNet !== null && Math.abs(d.foreignNet) > 0) {
    extras.push(`asing ${d.foreignNet > 0 ? '+' : '−'}${fmtRpM(Math.abs(d.foreignNet))}`);
  }
  if (d.cumDays !== null) extras.push(`📅 cum date ${d.cumDays === 0 ? 'HARI INI' : 'H-' + d.cumDays}`);
  return `${arrow} ${mid}${extras.length ? ' · ' + extras.join(' · ') : ''}`;
}

// kirim per chat — ticker "menarik" (berubah) diurutkan ke atas
// pre-check TelegramSent(slug=watch-digest-<tgl WIB>) + INSERT per kirim sukses = idempotent & ber-kanon DB (AC3)
const chats = await c.query('SELECT DISTINCT "chatId" FROM "TelegramWatch" WHERE active=true');
let ok = 0, fail = 0, skippedDup = 0, previewed = false;
for (const { chatId } of chats.rows) {
  if (!DRY) {
    const dup = await c.query('SELECT 1 FROM "TelegramSent" WHERE "chatId"=$1 AND slug=$2', [chatId, DIGEST_SLUG]);
    if (dup.rows.length) { skippedDup++; continue; }
  }
  const rows = await c.query('SELECT ticker FROM "TelegramWatch" WHERE "chatId"=$1 AND active=true ORDER BY "createdAt"', [chatId]);
  const sorted = rows.rows.map(r => r.ticker).sort((a, b) => (data[b]?.interesting ? 1 : 0) - (data[a]?.interesting ? 1 : 0));
  const lines = sorted.map(lineFor).join('\n');
  const txt = `📈 <b>Pantauanmu hari ini</b>\n\n${lines}\n\n👉 Analis Sore hari ini: ${tgWebUrl('/berita', 'daily_digest')} · Radar Pasar: ${tgWebUrl('/pasar', 'daily_digest')}\n\n— teknikal.id · data harian, bukan rekomendasi jual-beli`;
  if (DRY) {
    ok++;
    if (!previewed) { previewed = true; process.stdout.write(`--- preview chat=${chatId} ---\n${txt}\n`); }
    continue;
  }
  if (await send(chatId, txt)) {
    ok++;
    try {
      await c.query('INSERT INTO "TelegramSent" ("chatId", slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [chatId, DIGEST_SLUG]);
    } catch (e) { console.error(`[tg-digest] TelegramSent insert fail chat=${chatId}: ${e.message}`); }
  } else { fail++; }
}
process.stdout.write(JSON.stringify({ dry: DRY, ok, fail, skippedDup, slug: DIGEST_SLUG, tickers: Object.keys(data).length }) + '\n');
// tracking-audit G10: catat hasil digest ke CronLog — kegagalan bot tak lagi senyap
try {
  await c.query('INSERT INTO "CronLog" ("jobName", status, result, "triggeredBy") VALUES ($1,$2,$3,$4)', [
    'tg-digest', fail > 0 ? 'error' : 'success',
    JSON.stringify({ dry: DRY, ok, fail, skippedDup, tickers: tickers.length }).slice(0, 200),
    'system',
  ]);
} catch (e) { console.error('cronlog fail', e.message); }
process.exit(fail > 0 ? 1 : 0);
