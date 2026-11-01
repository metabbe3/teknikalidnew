# Audit Beban & ROI Agent Org teknikal.id — 2026-11-01

Sumber: `~/.hermes/data/run-ledger/runs.jsonl` (1.634 record Okt+Nov, 32 hari, 2026-10-01..11-01) + `~/.hermes/cron/jobs.json` (123 job total; 33 LLM aktif scope-teknikal, 22 script aktif, 24 frozen — mayoritas hivePOS per keputusan owner 1 Nov).
Catatan metode: ledger ditulis saat replay daemon (source=`scheduler-catchup`), jam 05:00 adalah artefak jendela replay (292 record) dan dikecualikan dari hitungan jam padat.

## 1. Distribusi beban

- Rata-rata 51 record/hari; puncak 30 Okt (78) dan 29 Okt (77).
- **Jam paling padat: 07:00 WIB** (216 run; 175 di antaranya scope-teknikal). Diikuti 08:00 (134; 90 teknikal) dan 06:00 (131).
- Window burst 07:00–10:00 + 18:00–21:00 menampung **34%** run teknikal; quiet zone 11:00–18:00 hanya 7% (pagi jauh lebih padat daripada sore).
- Estimasi fire LLM scope-teknikal ±34x/hari; total prompt aktif 245.750 karakter (Backend Builder family sendiri 125.443 ch di 7 slot).

### Jam padat (record, Okt+Nov, tanpa artefak 05:00)
| Jam | Total | Teknikal-scope |
|---|---|---|
| 07:00 | 216 | 175 |
| 08:00 | 134 | 90 |
| 06:00 | 131 | 131 |
| 23:00 | 99 | 98 |
| 03:00 | 87 | 81 |
| 21:00 | 74 | 68 |

## 2. Error & kegagalan (43 error Okt+Nov; error rate 2,6%)

Kluster penting — **31 Okt 08:22–10:31 lima job LLM beruntun gagal `HTTP 429 Usage limit reached for 5 hour`**: Daily Tech & AI Briefing (08:22), CEO Daily Strategy (08:36), Content Reviewer (08:41), Researcher (08:31), Education Editor (10:31). Burst pagi 08:xx menghabiskan kuota 5-jam dan mematikan job satu per satu. Ini bukti langsung bahwa tumpukan 08:00–09:00 berbahaya bagi keseluruhan org.

Top error per job: TeknikalID Profile-Sync LRU-150 (3/6 run = 50% gagal), Daily Tech & AI Briefing (2), Content Reviewer (2, keduanya 429), Backoffice Builder (2), Data Integrity Midday (2), Foreign Flow Sync (2/5), threads-reply-bot (2/2, kini nonaktif). Error tersebar di jam 08–10 (15 dari 43).

## 3. OVERLAP (tugas bertabrakan)

1. **Backend Builder family — 7 slot satu peran yang sama** (prompt 17–21k ch identik): pagi 07:30, siang 09:30, malam 18:30, Night Prep 23:00, weekend pagi/siang/sore. Ditambah Frontend Builder (19:15 & weekend 10:30), UX Frontend Builder (Rabu 19:00), Admin UX Builder (Selasa 20:15) = **11 slot build**. Siang 09:30 hanya terpakai 20% dan menabrak jam market + burst.
2. **Riset konten dobel di 06:30**: Growth Daily Check (Mandor, 10.266 ch) dan Idea Miner (3.445 ch) fire menit yang sama dengan tugas riset-overlap; Analis Pagi 06:45 menambah triple.
3. **Strategi 4 lapis**: CEO Daily Strategy (harian 08:35) + Sunday Strategy Council (Minggu 08:00) + Growth Weekly Retro (Senin 08:20) + North Star Weekly Review (sudah frozen) — retro & council overlap fungsi evaluasi mingguan.
4. **Sosmed 6 pintu posting**: Sosmed Content Brain (teoritis 15x/hari), IG Pagi 08:25, IG Carousel 17:30, Threads Rekap 12:10, IG+Threads Bedah 19:45, Channel Broadcaster 17:45 — dua yang terakhir terpotong quiet zone.

## 4. UNDER-USED (output jarang/konsumsi rendah, 14 hari terakhir)

| Job | Aktual/Ekspektasi | Catatan |
|---|---|---|
| Sosmed Content Brain | 7/210 (3%) | RSS gate menahan, tapi jadwal 5 7-21 = teoritis 15 LLM fire/hari **di dalam quiet zone 11–18** |
| Script Doctor Repair Agent | 15/2.016 (1%) | by design gate-suppressed; flash — biaya kecil tapi tetap slot |
| Tanya AI Enhancer | 1/10 (10%) | |
| IG+Threads Bedah Saham 19:45 | 1/8 (12%) | baru lahir 29 Okt |
| Analis Pagi/Sore | 2/10 & 3/10 (20–30%) | baru 29 Okt; overlap Mandor |
| Threads Rekap Sesi-I 12:10 | 2/10 (20%) | + pelanggar quiet zone |
| Idea Miner | 3/14 (21%) | tumpang tindih Mandor 06:30 |
| IG Carousel 17:30 | 5/10 (50%) | janji bio, tapi 1x gagal 429 |

**ROI tertinggi (jalan tiap hari, output dikonsumsi)**: Growth Daily Check (31 run, 1 err, artikel harian), CEO Daily Strategy (31), Content Reviewer (31 — QA gate, tertulis "role terbukti paling berharga"), Backend Builder pagi/malam (21/15), GSC Snapshot + Watchdog + DB Backup (script, 0 biaya LLM, 100% handal).

## 5. Jawaban: "ship features with less bugs"

### TAMBAH (1 agent baru, re-aktifkan 1)
- **QA Verifier Gate (teknikal-only)** — slot **22:00**. Job ini sudah ada (`4a5c…` QA Verifier Gate dual-org) tapi ikut ter-freeze; aktifkan ulang dilingkup teknikal.id saja. Tugas: verifikasi independen SEMUA deploy hari itu (baca `cto-queue.json` entry done/deferred → cek evidence commit hash + curl live + `npx tsc --noEmit` + smoke route), buka task rollback bila rusak. Hari ini builder memverifikasi dirinya sendiri — sumber bug lolos. 22:00 pas: semua deploy sore selesai, masih sebelum Night Prep 23:00 yang bisa memperbaiki.
- (Opsional) perkuat Content Reviewer tetap flash — sudah membuktikan ROI, tidak perlu diubah.

### KURANGI / UBAH
1. **Hapus Backend Builder siang 09:30** (20% terpakai, menabrak jam market + burst; pagi/malam/night-prep cukup).
2. **Gabungkan Idea Miner ke Growth Daily Check** (sama-sama 06:30, riset dobel) — atau pindah ke 05:30 sebagai stok-backlog terpisah.
3. **Sosmed Content Brain**: sempitkan `5 7-21` → dua window `5 7-10,18-20` (keluar dari quiet zone 11–18, turun dari 15 jadi ±7 fire teoritis/hari).
4. **Weekend builder 3 slot → 2**: pagi 08:00 (burst) → 10:00; siang 13:30 (quiet) → hapus; sore 17:00 (quiet) → 22:00.
5. **Pindah keluar quiet zone**: Threads Rekap 12:10 → 10:15; Analis Sore 16:45 → 18:35; Channel Broadcaster 17:45 → 21:10. IG Carousel 17:30 adalah janji bio — pertahankan, tapi jalankan script-first (ig_carousel.py + autopost) dengan keputusan LLM minimal (sudah flash).
6. **De-collision burst pagi 08:xx** (akar kluster 429 31 Okt): CEO 08:35 → 06:50; Researcher 08:30 → 10:05; Content Reviewer 08:40 → 07:05 (Mandor sudah publish ±07:00); IG Pagi 08:25 → 07:10 (tetap pre-market). Daily Tech & AI Briefing (non-teknikal, ikut makan kuota) 08:20 → 06:40.

### Slot kosong untuk agent baru (peta cron, hindari burst 07–10 & 18–21, quiet 11–18)
Window legal LLM: 00:00–06:59, 10:00–10:59, 21:00–23:59. Okupansi LLM teknikal sekarang: 06:00 = 3,7 fire/hari (penuh), 21:00 = 2,0, 23:00 = 1,0, 10:00 = 1,7.
- **22:00–22:59 — kosong total (0 LLM)** → slot utama QA Verifier Gate.
- **00:00–04:59 — kosong total** (hanya DB Backup 01:15 & hivePOS-frozen) → cocok agent batch berat (mis. regression test suite malam).
- **05:00–05:45 — kosong dari LLM** (hanya replay daemon/script sync) → cadangan agent riset.
- **10:00–10:15 — nyaris kosong** (Education Editor Sel/Kam 10:30) → cadangan agent analitik.

## 6. Ringkasan satu paragraf
Beban org terkonsentrasi di pagi (07:00 jam terpadat, 34% run di window burst) dan kuota 5-jam pernah habis pada 31 Okt akibat tumpukan 08:xx — de-collision adalah perbaikan termurah. Fokus owner "ship features with less bugs" paling tepat dijawab dengan mengaktifkan kembali QA Verifier Gate sebagai verifier deploy independen di slot kosong 22:00, menghapus/gabungkan 3 builder & riset yang tumpang tindih, dan memindahkan 5 job keluar dari quiet zone 11:00–18:00.
