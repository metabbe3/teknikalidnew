// Staging verify: per-route DOM assertions (server-rendered HTML) — adm-2026-10-28-01
import { readFileSync } from 'fs';

const COOKIE = readFileSync('/tmp/admin-session-cookie.txt', 'utf8');
const BASE = 'http://127.0.0.1:3210';

// '&' renders as &amp; in HTML
const NAV_GROUPS = ['Ringkasan', 'Pengguna &amp; Konten', 'Pasar &amp; Data', 'Sistem'];

const checks = [
  { path: '/admin', expect: ['>Overview</span>', 'aria-selected="true"'] },
  { path: '/admin/user-analytics', expect: ['>Pengguna</span>', 'Statistik pengguna', 'href="/admin/user-analytics"'] },
  { path: '/admin/community', expect: ['>Komunitas</span>', 'Aktivitas komunitas'] },
  { path: '/admin/stock-engagement', expect: ['>Saham</span>', 'paling banyak dilihat'] },
  { path: '/admin/predictions', expect: ['>Prediksi</span>', 'vs hasil harga'] },
  { path: '/admin/auth-health', expect: ['>Kesehatan Login</span>', 'provider, error'] },
];

let pass = 0, fail = 0;
for (const c of checks) {
  const html = await (await fetch(BASE + c.path, { headers: { Cookie: `authjs.session-token=${COOKIE}` } })).text();
  const okStatus = html.length > 1000;
  const missing = c.expect.filter(e => !html.includes(e));
  const missingGroups = NAV_GROUPS.filter(g => !html.includes(g));
  if (okStatus && missing.length === 0 && missingGroups.length === 0) {
    console.log(`PASS ${c.path} (${html.length}b)`);
    pass++;
  } else {
    console.log(`FAIL ${c.path} missing=${JSON.stringify(missing)} missingGroups=${JSON.stringify(missingGroups)} len=${html.length}`);
    fail++;
  }
}

// Old stub behavior gone: /admin/user-analytics must NOT be a redirect (would follow to /admin with Overview tab)
const ua = await fetch(BASE + '/admin/user-analytics', { headers: { Cookie: `authjs.session-token=${COOKIE}` }, redirect: 'manual' });
const noRedirect = ua.status === 200;
console.log(`${noRedirect ? 'PASS' : 'FAIL'} /admin/user-analytics renders directly (no redirect), status=${ua.status}`);
noRedirect ? pass++ : fail++;

console.log(`\nTOTAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
