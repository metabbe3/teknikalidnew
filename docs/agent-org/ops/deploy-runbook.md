# Deploy Runbook — teknikal.id app

> Update ux-2026-10-14-01 (15 Okt 2026): langkah warm-up ISR WAJIB setiap deploy app.

## Urutan standar (slot 07:30-08:45 / pasca-16:15, max 1 deploy/slot)

1. **Anchor** (catat ke decisions.md): `git rev-parse HEAD` + `docker images teknikalidnew-app --format '{{.ID}} {{.CreatedAt}}' | head -1`
2. **Build**: `docker compose build app`
3. **Up**: `docker compose up -d app`
4. **Warm-up ISR** (BARU — jangan lewati):
   ```bash
   docker cp ops/isr-warmup.js teknikalidnew-app-1:/tmp/isr-warmup.js
   docker exec teknikalidnew-app-1 node /tmp/isr-warmup.js http://localhost:3000
   ```
   - Output `WARM /berita ... links=>0` = cache ISR terisi dari DB SEBELUM user nyata melihat edge.
   - Tanpa langkah ini, /berita menampilkan "0 tulisan / Belum ada brief" 5-15 menit pasca-deploy (cold-bake dari image tanpa DB + edge s-maxage 300 + SWR 600).
   - Exit 1 (INCOMPLETE) setelah retry 20s = jangan declared done; cek `docker logs` app + DB reachable, lalu ulang sekali.
5. **Live-check**: `curl -A Mozilla -L https://teknikal.id/` 200 + spot halaman terkait task.
6. **Rollback** (kalau rusak): `git revert <commit> && docker compose build app && docker compose up -d app` + ulang warm-up.

## Catatan
- Halaman yang di-warm: /berita, /saham-golden-cross, /saham-death-cross, /harga-saham-hari-ini (semua ber-DB, revalidate 300). Tambah path di `ops/isr-warmup.js` jika ada halaman ISR ber-DB baru.
- Script menghitung link `/berita/<slug>` pada /berita — angka 0 = bake masih kosong.
- Warm-up ≠ healthcheck: healthcheck container hanya probe proses, bukan cache konten.
