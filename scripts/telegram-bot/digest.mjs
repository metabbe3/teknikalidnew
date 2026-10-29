// Digest harian 16:50 WIB — kirim update semua pantauan aktif per chat.
// ret-qw3 (retention-riset 2026-10-30): ber-DELTA + deep-link + konteks asing/dividen.
//   - harga pembanding pakai baris volume>0 terakhir (doktrin harga platform, hindari sesi nol)
//   - skor 2 sesi terakhir: tampilkan "0,48 → 0,66" saat |Δ|>=0.08 atau label berubah
//   - 1 ForeignFlow terbaru + StockDividend cumDate <=7 hari
//   - tiap ticker jadi tautan langsung ke halaman sahamnya (1 ketukan balik ke web)
// Angka dari DB saja — bukan rekomendasi.
import { createRequire } from 'node:module';
const require = createRequire('/Users/nicholasandriansurjadi/.hermes/opt/tgbot/');
const pg = require('pg');
const { Client } = pg;
const TOK = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOK}`;
const SITE = 'https://teknikal.id';

async function send(chatId, text) {
  const r = await fetch(`${API}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, text, parse_mode:'HTML', link_preview_options:{ is_disabled:true } }) }).catch(()=>null);
  return r && r.status === 200;
}

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// saham unik terpantau
const w = await c.query('SELECT DISTINCT ticker FROM "TelegramWatch" WHERE active=true');
if (!w.rows.length) { console.log('no watches'); process.exit(0); }
const tickers = w.rows.map(r => r.ticker);

// data semua ticker dalam 1 query LATERAL (hindari N+1 × query tunggal per ticker)
const q = await c.query(`
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
  WHERE s.ticker = ANY($1)`, [tickers]).catch(e => { console.error('query fail', e.message); return { rows: [] }; });

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
  const link = `<a href="${SITE}/stocks/${ticker}?utm_source=tg_digest">${bare}</a>`;
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
const chats = await c.query('SELECT DISTINCT "chatId" FROM "TelegramWatch" WHERE active=true');
let ok = 0, fail = 0;
for (const { chatId } of chats.rows) {
  const rows = await c.query('SELECT ticker FROM "TelegramWatch" WHERE "chatId"=$1 AND active=true ORDER BY "createdAt"', [chatId]);
  const sorted = rows.rows.map(r => r.ticker).sort((a, b) => (data[b]?.interesting ? 1 : 0) - (data[a]?.interesting ? 1 : 0));
  const lines = sorted.map(lineFor).join('\n');
  const txt = `📈 <b>Pantauanmu hari ini</b>\n\n${lines}\n\n👉 Analis Sore hari ini: ${SITE}/berita\n\n— teknikal.id · data harian, bukan rekomendasi jual-beli`;
  (await send(chatId, txt)) ? ok++ : fail++;
}
console.log(JSON.stringify({ ok, fail, tickers: Object.keys(data).length }));
process.exit(0);
