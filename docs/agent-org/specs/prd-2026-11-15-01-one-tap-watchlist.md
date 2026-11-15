# PRD prd-2026-11-15-01 — One-Tap Watchlist (T3 unblock)

- **Tanggal**: 2026-11-15 | **Org**: teknikal.id | **Status**: spec_ready | **Prioritas**: P2
- **Sumber mandat**: idea-2026-11-11-1 (CEO mandate 11 Nov: T5 habit loop → verdict researcher MODIFIKASI: diagnosa T3 dulu)
- **Tree riset**: teknikalidnew main@4963830 (15 Nov 17:10); prod image app 2026-11-15T15:23 UTC (deploy kereta T-1115-N 22:15)
- **North Star**: STICKY+GROWTH — funnel T3 Simpan (10/192 T2 = 5,2%) + T4 returning

## User Story
Sebagai pengunjung anonim di `/` atau `/stocks` yang baru membaca movers/daftar saham, saya ingin menandai saham yang menarik dengan satu ketukan (bintang), tanpa harus cari saham sendiri atau membuka halaman lain, supaya investasi kecil pertama (watchlist) tercipta di sesi pertama dan ada alasan kembali besok.

## Problem (data, bukan opini)
1. **Exit terbesar T2 di dua halaman tanpa affordance simpan**: aktor T2-ters save 7d terakhir keluar terakhir di `/` (35 aktor) dan `/stocks` (33 aktor) — dua halaman paling padat, tapi bintang guest (GuestStar) hanya ada di 15 halaman tematik saham-* dan detail `/stocks/[ticker]` (SQL ranking exit-path, 15 Nov 22:4x).
2. **Klik-TG dihitung ganda-ralat**: `tg_pantau_klik` = 14 event/12 aktor 21d (DOMINAN vs pantau_tambah 4/3), tapi funnel-v2 hanya mensyaratkan label `pantau_*` di 2 dari 3 lokasi — klik-TG di `/` dihitung T3, di `/auth/*` tidak. Definisi T3 kacau: pengguna yang klik CTA Telegram sudah "menyimpan" (intent pantau) tapi tidak selalu dihitung.
3. **Empty-state anti-pattern**: `/watchlist` guest menyuruh "Cari saham" (link /stocks) — riset 11 Nov (productgrowth.in): empty-state search-driven = 65% skip; kurasi tematik terverifikasi lebih baik.
4. T5=0 dua minggu beruntun, T4=4 — sesuai riset 11 Nov: T5 konsekuensi, akar di T3 (10/192 = 5,2%).

## Scope
**In:**
- Bintang one-tap (komponen GuestStar existing, compact) di tabel top-30 `/stocks` + kartu movers `/` (hero signal cards + movers 2x2)
- Empty-state `/watchlist` guest: ganti CTA "Cari saham" → kurasi preset 1-klik (3 preset tematik statis server-side: Bank Bluechip [BBCA,BMRI,BBRI], Dividen [kandidat dari /kalender-dividen], Populer Minggu Ini [top ticker views 21d])
- Funnel-v2: unifikasi definisi T3 = label `pantau_tambah` ATAU `tg_pantau_klik` (kedua lokasi: CTE saved + komentar route)
- Dokumentasi: changelog + handoff (standar org)

**Out:**
- Apapun yang menyentuh auth/payments/pricing (charter §6 owner-domain)
- Membangun fitur habit-loop baru / notifikasi Telegram push (teritori riset terpisah)
- Halaman baru / redesign; kolom DB baru; endpoint baru

## Acceptance Criteria (tertestable)
- **AC1 (bintang live)**: `/stocks` guest: bintang di setiap baris top-30 → klik → GuestWatchlistPanel terisi + event `pantau_tambah` EngagementEvent (anonId, path=/stocks); klik kedua = hapus (`pantau_hapus`). Sama untuk ≥1 kartu movers di `/`.
- **AC2 (empty-state preset)**: `/watchlist` guest kosong: render 3 preset kurasi (label + jumlah saham); klik preset → localStorage guest watchlist terisi + event `pantau_tambah` batch (label `preset_<nama>`) + panel terisi tanpa reload.
- **preset data**: preset "Populer Minggu Ini" = query SQL ranking views `/stocks/%.JK` 21d (breadth-rule qa-30-01, snapshot saat build, bukan live per-request)
- **AC3 (funnel unifikasi)**: selftest funnel-t5-join/selftest funnel-qa-guard: definisi T3 konsisten `pantau_tambah|tg_pantau_klik` di semua lokasi; replay SQL baseline BEFORE (snapshot angka T1-T5 15 Nov 03:2x: 368/192/10/4/0) → AFTER tercatat; tidak ada penurunan T1/T2 (guard regresi).
- **AC4 (0 kontaminasi)**: smoke test pakai anonId prefix `qa-` (charter §7); funnel-v2 guard `qa-%` + blocklist UUID existing teruji.
- **AC5 (build gates)**: tsc EXIT-0, build EXIT-0, staging :3100 smoke 375px; 0 migrasi DB; rollback = revert commit tunggal.

## Data Evidence (SQL read-only, teknikalidnew-db-1, 15 Nov 22:4x WIB)
- Exit-path T2-tanpa-save 7d: `/`=35 aktor, `/stocks`=33, /auth/signin=7, /agent=7, /stocks/BBCA.JK=6 (ranking SQL isomorphic funnel-v2)
- Event simpan 21d: tg_pantau_klik 14/12 (aktor unik 12: / 5, /auth/complete-profile 3, kalender-dividen 2, aliran-dana-asing 2, lain ≤1); pantau_tambah 4 event/3 aktor (kalender-dividen 2, golden-cross 2); pantau_hapus 2/1
- Funnel 15 Nov 03:2x (bo-2026-11-15-01, QA-verified): T1 368 / T2 192 (52,2%) / T3 10 (5,2%) / T4 4 / T5 0
- Top ticker 21d: BBCA.JK 134v/27 aktor; AADI 17/6; TPIA 14/9; BNBR 13/4
- Filesystem (main@4963830): GuestStar ada di 15 halaman tematik + /stocks/[ticker]; /stocks top-30 table tanpa GuestStar; use-guest-watchlist.ts + guest-storage.ts (localStorage + CustomEvent) infrastruktur penuh; REGISTER_PROMPT ditunda ke simpanan ke-3 (prd-2026-10-26-01).

## Metadata deterministik v2
```json
{
  "target_files": [
    "src/app/(public)/stocks/page.tsx (kolom bintang di top-30 table, GuestStar import)",
    "src/app/(public)/page.tsx (movers cards 2x2 + hero signal cards, bintang overlay)",
    "src/components/watchlist/guest-watchlist-view.tsx (empty-state → preset kurasi 3)",
    "src/components/watchlist/watchlist-presets.tsx (BARU — preset kurasi 1-klik, data server-side)",
    "src/app/api/admin/funnel-v2/route.ts (unifikasi label T3 di CTE saved + komentar)",
    "src/hooks/use-guest-watchlist.ts (estimasi: toggle batch preset — addMany)"
  ],
  "db_migrations": false,
  "dependencies": [
    "GuestStar (src/components/stock/guest-star.tsx, existing)",
    "use-guest-watchlist + guest-storage (existing, Retention Loop v1)",
    "/api/live-quotes (existing — refresh panel pasca-preset)",
    "preset 'Populer' = snapshot SQL 21d (read-only, di-rebuild saat deploy, bukan runtime query)"
  ],
  "risk": "medium",
  "estimate_tool_calls": 35
}
```
Risk medium: menyentuh halaman traffic terbesar (/ dan /stocks); mitigasi = komponen existing (GuestStar) + guest-only + 0 migrasi; funnel definisi change = baseline BEFORE dicatat dulu (AC3).

## Gate
- AUTH/PAYMENTS/PRICING: TIDAK tersentuh (guest-only, localStorage + event).
- GateGuard blast-radius rendah (UI affordance + definisi funnel), tapi CTO wajib baca baseline funnel BEFORE sebelum eksekusi.

## QA Plan (pembangun != pemeriksa)
- QA Sentinel: replay AC1-AC2 di staging + live pasca-deploy; verifikasi event masuk EngagementEvent (prefix qa-); replay SQL funnel AFTER vs baseline 15 Nov 03:2x.
- impact_check_due: 2026-11-22 (T3 rasio 7d pasca-live; target arah ≥8% T2→T3, evaluasi CEO).
