#!/usr/bin/env node
// ISR warm-up: hit origin untuk halaman ber-DB pasca-deploy (ux-2026-10-14-01)
// Usage: node isr-warmup.js [base]  (default http://localhost:3000)
const BASE = process.argv[2] || 'http://localhost:3000';
const PATHS = [
  '/berita',
  '/saham-golden-cross',
  '/saham-death-cross',
  '/harga-saham-hari-ini',
];
const LINK_RE = /href="\/berita\/[a-z0-9-]+"/g;

async function warm(path) {
  const started = Date.now();
  try {
    const res = await fetch(BASE + path, { headers: { 'user-agent': 'Mozilla/5.0 isr-warmup' } });
    const body = await res.text();
    const ms = Date.now() - started;
    const links = path === '/berita' ? (body.match(LINK_RE) || []).length : null;
    const ok = res.status === 200 && (links === null || links > 0);
    console.log(`${ok ? 'WARM' : 'COLD'} ${path} status=${res.status} ${ms}ms${links !== null ? ' links=' + links : ''} bytes=${body.length}`);
    return ok;
  } catch (e) {
    console.log(`FAIL ${path} ${e.message}`);
    return false;
  }
}

(async () => {
  let allOk = true;
  for (const p of PATHS) {
    const ok = await warm(p);
    if (!ok && p === '/berita') {
      // satu retry setelah 20s (bake ulang ISR)
      await new Promise((r) => setTimeout(r, 20000));
      allOk = (await warm(p)) && allOk;
    } else {
      allOk = ok && allOk;
    }
  }
  console.log(allOk ? 'ISR-WARMUP: OK' : 'ISR-WARMUP: INCOMPLETE');
  process.exit(allOk ? 0 : 1);
})();
