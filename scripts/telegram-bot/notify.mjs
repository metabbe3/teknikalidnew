// notify.mjs — kirim artikel Analis baru ke semua yang pantau ticker-nya (match tickerTag).
// Dedupe via tabel TelegramSent {chatId, slug}; window 36 jam; jam sopan 06:00-22:00 WIB.
// Jalankan tiap 30 mnt oleh cron. Silent-healthy: tak ada artikel baru → exit 0 diam.
import { createRequire } from 'node:module';
const require = createRequire('/Users/nicholasandriansurjadi/.hermes/opt/tgbot/');
const pg = require('pg');
const { Client } = pg;
const TOK = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOK}`;
const BASE = 'https://teknikal.id/berita/';

async function send(chatId, text) {
  const r = await fetch(`${API}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, text, parse_mode:'HTML', link_preview_options:{ is_disabled:true } }) }).catch(()=>null);
  return r && r.status === 200;
}

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// jam sopan WIB (UTC+7)
const wibHour = (new Date().getUTCHours() + 7) % 24;
if (wibHour < 6 || wibHour >= 22) { console.log('quiet window — diam'); process.exit(0); }

// pastikan tabel dedupe ada
await c.query(`CREATE TABLE IF NOT EXISTS "TelegramSent" (
  "chatId" TEXT NOT NULL, slug TEXT NOT NULL, "sentAt" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("chatId", slug))`);

// artikel ber-ticker 36 jam terakhir, published/listed
const arts = await c.query(
  `SELECT slug, title, "tickerTag" FROM "Article"
   WHERE "tickerTag" IS NOT NULL AND "tickerTag" <> ''
     AND "createdAt" > now() - interval '36 hours'
     AND status = 'PUBLISHED'
   ORDER BY "createdAt" DESC LIMIT 10`);
let sent = 0, skipped = 0, noTarget = 0;
for (const a of arts.rows) {
  const watchers = await c.query(
    `SELECT DISTINCT "chatId" FROM "TelegramWatch" WHERE active=true AND ticker=$1`, [a.tickerTag]);
  if (!watchers.rows.length) { noTarget++; continue; }
  for (const { chatId } of watchers.rows) {
    const dup = await c.query('SELECT 1 FROM "TelegramSent" WHERE "chatId"=$1 AND slug=$2', [chatId, a.slug]);
    if (dup.rows.length) { skipped++; continue; }
    const code = a.tickerTag.replace('.JK','');
    const ok = await send(chatId,
      `📰 <b>Riset baru: ${code}</b>\n\n${a.title}\n\nBaca analisis lengkapnya:\n${BASE}${a.slug}\n\n— teknikal.id · bukan rekomendasi jual-beli`);
    if (ok) {
      await c.query('INSERT INTO "TelegramSent" ("chatId", slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [chatId, a.slug]);
      sent++;
    }
  }
}
console.log(JSON.stringify({ articles: arts.rows.length, sent, skipped, noTarget }));
process.exit(0);
