// TeknikalidBot — polling handler (Mac mini). pg langsung, tanpa prisma client.
// /start BBCA → subscribe · /stop <KODE> · /list · /help
import { createRequire } from 'node:module';
const require = createRequire('/Users/nicholasandriansurjadi/.hermes/opt/tgbot/');
const pg = require('pg');
const { Client } = pg;
const TOK = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOK}`;
let offset = 0;

async function send(chatId, text) {
  await fetch(`${API}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, text, parse_mode:'HTML', link_preview_options:{ is_disabled:true } }) }).catch(()=>{});
}
// --- admin aktif (owner 29 Okt): pesan bebas dibalas GLM via Z.ai, gaya admin teknikal.id ---
const AIBASE = process.env.ANTHROPIC_BASE_URL || 'https://api.z.ai/api/anthropic';
const AIKEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '';
const AIMODEL = process.env.ANTHROPIC_MODEL || 'glm-5.2';
async function aiReply(chatText, userName) {
  if (!AIKEY) return null;
  try {
    const r = await fetch(`${AIBASE}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': AIKEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: AIMODEL,
        max_tokens: 300,
        system: 'Kamu admin komunitas teknikal.id (situs analisa saham IDX). Balas pesan user Telegram dalam Bahasa Indonesia santai-profesional, maksimal 3-4 kalimat. Aturan WAJIB: (1) JANGAN pernah memberi rekomendasi beli/jual saham atau prediksi harga — arahkan ke fitur situs (skor sinyal di teknikal.id/stocks, alert Telegram gratis via /start KODE). (2) Tidak ada jargon Inggris berlebihan. (3) Kalau ditanya harga/analisa saham spesifik, jawab ringkas fakta umum + sarankan cek halaman sahamnya. (4) Tutup ramah, contoh: "Ada lagi yang mau ditanyain?" — tanpa emoji berlebihan (maks 1). (5) Kalau pertanyaan di luar saham/teknikal.id, arahkan balik dengan sopan.',
        messages: [{ role: 'user', content: `Dari: ${userName}\nPesan: ${chatText}` }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.content?.[0]?.text?.trim()?.slice(0, 1200) || null;
  } catch { return null; }
}

function normTicker(raw) {
  if (!raw) return null;
  let t = raw.toUpperCase().trim().replace(/\.JK$/,'').replace(/^@/,'').replace(/_JK$/,'');
  return /^[A-Z0-9]{4,5}$/.test(t) ? t : null;
}
async function handle(msg, c) {
  const chatId = String(msg.chat.id);
  const text = (msg.text||'').trim();
  try {
    if (text.startsWith('/start')) {
      // ret-qw4: /start watch_BBCA_BMRI_TLKM — sync batch pantauan web ke Telegram 1 ketukan
      const rawArg0 = text.split(/\s+/)[1] || '';
      // tracking-audit G3: suffix __a_<12hex> = anonPrefix jembatan web→bot (dibuang sebelum parse ticker)
      const am = rawArg0.match(/__a_([a-f0-9]{12})$/i);
      const anonPrefix = am ? am[1].toLowerCase() : null;
      const rawArg = anonPrefix ? rawArg0.replace(/__a_[a-f0-9]{12}$/i, '') : rawArg0;
      if (rawArg.toLowerCase().startsWith('watch_')) {
        const codes = Array.from(new Set(
          rawArg.slice(6).split('_').map(t => normTicker(t)).filter(Boolean)
        )).slice(0, 10);
        if (!codes.length) return send(chatId, '❌ Format: /start watch_BBCA_TLKM (4-5 huruf per kode).');
        const q = await c.query('SELECT ticker, name FROM "Stock" WHERE ticker = ANY($1) AND "assetClass"=$2', [codes.map(x => x + '.JK'), 'EQUITY']);
        if (!q.rows.length) return send(chatId, '❌ Kode tidak ditemukan di teknikal.id. Cek lagi kodenya ya.');
        for (const st of q.rows) {
          await c.query('INSERT INTO "TelegramWatch" ("chatId",ticker,"anonPrefix") VALUES ($1,$2,$3) ON CONFLICT ("chatId",ticker) DO UPDATE SET active=true, "anonPrefix"=COALESCE(EXCLUDED."anonPrefix","TelegramWatch"."anonPrefix")', [chatId, st.ticker, anonPrefix]);
        }
        return send(chatId, `✅ <b>${q.rows.length} saham</b> masuk pantauanmu:\n${q.rows.map(r => '• <b>' + r.ticker.replace('.JK','') + '</b> ' + r.name).join('\n')}\n\nUpdate harian jam 16:50 WIB — lengkap dengan perubahan skor sinyal &amp; aliran asing.\n/list — lihat semua`);
      }
      const code = normTicker(rawArg);
      if (!code) return send(chatId, '📈 <b>TeknikalID Pantau</b>\n\nPantau saham favoritmu — update tiap hari jam 16:50 WIB setelah pasar tutup, langsung ke chat ini.\n\nCara pakai: buka halaman saham di teknikal.id, klik tombol <b>"Pantau via Telegram"</b>, atau kirim:\n<code>/start BBCA</code>\n\nPerintah lain: /list · /stop BBCA · /help');
      const q = await c.query('SELECT ticker, name FROM "Stock" WHERE ticker=$1 AND "assetClass"=$2', [code+'.JK','EQUITY']);
      if (!q.rows.length) return send(chatId, `❌ Kode <b>${code}</b> tidak ditemukan di teknikal.id. Cek lagi kodenya ya.`);
      const st = q.rows[0];
      await c.query('INSERT INTO "TelegramWatch" ("chatId",ticker,"anonPrefix") VALUES ($1,$2,$3) ON CONFLICT ("chatId",ticker) DO UPDATE SET active=true, "anonPrefix"=COALESCE(EXCLUDED."anonPrefix","TelegramWatch"."anonPrefix")', [chatId, st.ticker, anonPrefix]);
      return send(chatId, `✅ <b>${st.ticker}</b> (${st.name}) masuk pantauanmu.\n\nUpdate harian jam 16:50 WIB: harga, perubahan, sinyal, + link Analis Sore.\n\n/list — lihat semua · /stop ${code} — berhenti`);
    }
    if (text.startsWith('/list')) {
      const q = await c.query('SELECT ticker FROM "TelegramWatch" WHERE "chatId"=$1 AND active=true ORDER BY "createdAt"', [chatId]);
      if (!q.rows.length) return send(chatId, 'Belum ada saham terpantau. Kirim /start BBCA untuk menambah.');
      return send(chatId, '📡 <b>Pantauanmu</b>:\n' + q.rows.map(r=>`• ${r.ticker.replace('.JK','')}`).join('\n') + '\n\nUpdate berikutnya jam 16:50 WIB.');
    }
    if (text.startsWith('/stop')) {
      const code = normTicker(text.split(/\s+/)[1]);
      if (!code) return send(chatId, 'Format: /stop BBCA');
      await c.query('UPDATE "TelegramWatch" SET active=false WHERE "chatId"=$1 AND ticker=$2', [chatId, code+'.JK']);
      return send(chatId, `🚫 <b>${code}</b> dihapus dari pantauan. Kirim /start ${code} kalau mau lagi.`);
    }
    if (text.startsWith('/help')) return send(chatId, 'Perintah:\n/start BBCA — pantau saham\n/list — daftar pantauan\n/stop BBCA — berhenti pantau\n\nData oleh teknikal.id — bukan rekomendasi jual-beli.');

    // admin aktif (29 Okt): pesan bebas → balas GLM + log ke DB (dulu: diabaikan senyap)
    if (text && !text.startsWith('/')) {
      const uname = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || 'user';
      try {
        await c.query('INSERT INTO "BotInbox" ("chatId", "fromName", "text") VALUES ($1,$2,$3)', [chatId, uname.slice(0,80), text.slice(0,1000)]);
      } catch (e) { console.error('inbox log fail', e.message); }
      const ai = await aiReply(text, uname);
      if (ai) return send(chatId, ai);
      return send(chatId, 'Halo! 👋 Aku admin teknikal.id. Ketik /help untuk lihat perintah, atau /start KODESAHAM (mis. /start BBCA) untuk pantauan gratis tiap hari.');
    }
  } catch(e) {
    console.error('handle error', e.message);
    // fix owner 30 Okt: jangan diam — user harus tahu kalau gangguan (dulu: klik tak ada respons)
    await send(chatId, '⚠️ Sebentar — server sedang sibuk. Coba kirim ulang perintahmu ya (mis. /start BBCA).').catch(()=>{});
  }
}
async function connect() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.on('error', (e) => console.error('pg client error', e.message));
  await c.connect();
  return c;
}
async function loop() {
  let c = await connect();
  console.log('[teknikalid-bot] polling…');
  for(;;) {
    try {
      const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=25`);
      const j = await r.json();
      for (const u of j.result||[]) {
        offset = u.update_id+1;
        if (u.message) {
          try {
            await handle(u.message, c);
          } catch (e) {
            // koneksi DB drop di tengah pesan → reconnect SEKALI lalu ulangi pesan itu
            if (/ECONNREFUSED|Connection terminated|connection closed/i.test(e.message||'')) {
              console.error('reconnecting DB…');
              try { await c.end(); } catch {}
              c = await connect();
              await handle(u.message, c);
            } else {
              throw e;
            }
          }
        }
      }
    } catch(e) { console.error('poll retry', e.message); await new Promise(r=>setTimeout(r,3000)); }
  }
}

// --test '<json pesan>': jalankan satu pesan tanpa polling (verifikasi end-to-end)
if (process.argv[2] === '--test') {
  const msg = JSON.parse(process.argv[3]).message ?? JSON.parse(process.argv[3]);
  const c = await connect();
  await handle(msg, c);
  await c.end();
  process.exit(0);
}
loop();
