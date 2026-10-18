# /qa-check — verifikasi cepat pasca-perubahan teknikal.id
Jalankan sensor lengkap pada repo teknikal.id sebelum anggap selesai:

1. `npx tsc --noEmit` — typecheck
2. `npm run lint` — eslint
3. `npm run build` — production build
4. `docker ps --filter name=teknikalidnew-app-1` — container hidup?
5. Smoke: `curl -s -o /dev/null -w "%{http_code}" https://teknikal.id/` (expect 200)
6. Kalau deploy market-related: consistency-test cross-page (home + /stocks + /api/market — Top Gainer harus identik antar halaman)

Laporkan tiap langkah dengan bukti (exit code / HTTP code / diff angka). FAIL di langkah mana pun = task BELUM selesai, jangan naik kereta.
