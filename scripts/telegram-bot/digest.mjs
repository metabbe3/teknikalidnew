// Digest harian 16:50 WIB — kirim update semua pantauan aktif per chat.
// Data: close kemarin vs hari ini (StockPrice 2 terakhir) + signalLabel terbaru. Angka dari DB saja.
import pg from 'pg';
const { Client } = pg;
const TOK = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOK}`;

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

// data per ticker (1 query)
const data = {};
for (const { ticker } of w.rows) {
  const px = await c.query(
    `SELECT sp.close FROM "StockPrice" sp JOIN "Stock" s ON s.id=sp."stockId" WHERE s.ticker=$1 ORDER BY sp.date DESC LIMIT 2`, [ticker]).catch(()=>({rows:[]}));
  const sig = await c.query(
    `SELECT si."signalLabel" FROM "StockIndicator" si JOIN "Stock" s ON s.id=si."stockId" WHERE s.ticker=$1 ORDER BY si.date DESC LIMIT 1`, [ticker]).catch(()=>({rows:[]}));
  if (px.rows.length >= 2) {
    const last = +px.rows[0].close, prev = +px.rows[1].close;
    const chg = ((last - prev) / prev) * 100;
    data[ticker] = { last, chg: chg.toFixed(2), sig: sig.rows[0]?.signalLabel || '-' };
  }
}

// kirim per chat
const chats = await c.query('SELECT DISTINCT "chatId" FROM "TelegramWatch" WHERE active=true');
let ok = 0, fail = 0;
for (const { chatId } of chats.rows) {
  const rows = await c.query('SELECT ticker FROM "TelegramWatch" WHERE "chatId"=$1 AND active=true ORDER BY "createdAt"', [chatId]);
  const lines = rows.rows.map(r => {
    const d = data[r.ticker];
    if (!d) return `• ${r.ticker.replace('.JK','')} — data belum tersedia`;
    const arrow = d.chg >= 0 ? '🟢' : '🔴';
    return `${arrow} <b>${r.ticker.replace('.JK','')}</b> ${d.last.toLocaleString('id-ID')} (${d.chg >= 0 ? '+' : ''}${d.chg}%) · ${d.sig}`;
  }).join('\n');
  const txt = `📈 <b>Pantauanmu hari ini</b>\n\n${lines}\n\n👉 Analis Sore hari ini: teknikal.id/berita\n\n— teknikal.id · data harian, bukan rekomendasi jual-beli`;
  (await send(chatId, txt)) ? ok++ : fail++;
}
console.log(JSON.stringify({ ok, fail, tickers: Object.keys(data).length }));
process.exit(0);
