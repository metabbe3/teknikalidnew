# TeknikalID Agent Org — Lessons Learned

Format: tanggal | area | pelajaran | aksi pencegahan. Append-only, tidak rewrite sejarah.
Sumber: insiden nyata selama operasi agent org (bukan teori).

---

## 2026-09-13 | infra | Cron create meninggalkan model=None

`cronjob_manage create` TIDAK menyimpan model/provider dari argumen — job jalan pakai model default global, dan saat model global berganti (mis. glm-5.2→5.3) job unpinned **di-SKIP diam-diam** ("Skipped to prevent unintended spend").
**Pencegahan:** setelah EVERY create, pin manual di `~/.hermes/cron/jobs.json` (field `model`+`provider`) lalu verify read-back. Terjadi 2× (6 job lama, lalu 5 job baru termasuk council).

## 2026-09-13 | tooling | Terminal stale cwd

Terminal session kadang mewarisi cwd `/private/tmp/claude-test` yang sudah dihapus → semua command exit 126 tanpa workdir eksplisit.
**Pencegahan:** agent selalu pass `workdir` eksplisit, atau fallback `execute_code` subprocess. Sudah tertanam di prompt CTO.

## 2026-09-13 | dispatch | CEO menulis route yang salah

CEO menulis intent "/auth/signup"; route aslinya `/auth/register`. Kalau CTO percaya begitu, deploy bakal broken link.
**Pencegahan:** CTO WAJIB verifikasi spec ke repo sebelum eksekusi (baca file asli). Layer translate CEO→CTO memang butuh verify — ketemu pas dry-run.

## 2026-09-12 | data | Query "2 tanggal terakhir" ≠ delta mingguan

Query weekly pakai 2 tanggal terakhir menghasilkan delta HARIAN (11 vs 10 Sep), bukan vs Jumat pekan lalu → caption GLM "salah" padahal setia pada payload salah.
**Pencegahan:** definisi weekly delta = vs tanggal ≥5 hari kalender ke belakang. Validasi angka caption vs payload (`_caption_numbers_ok`) wajib untuk konten finansial.

## 2026-09-12 | content | GLM caption campur angka antar dataset

Caption mingguan GLM menyisipkan angka harian (463/196) + ticker phantom (BMRS) dari konteks training, bukan payload.
**Pencegahan:** semua angka di caption = hasil programmatic check terhadap payload; mismatch → retry → fallback caption deterministik. Akun finansial: angka salah = kredibilitas mati.

## 2026-09-11 | infra | Dashboard baca file berbeda dari yang agent tulis

Agent tulis weight ke log.jsonl, tapi dashboard komposisi baca `inbody-scans.json` → UI stale padahal data "sudah masuk".
**Pencegahan:** setiap pipeline tulis ke SEMUA store yang membacanya (3 tempat), atau satukan sumber baca. Inventarisasi reader-writer tiap data type.

## 2026-09-11 | tooling | f-string Python vs CSS braces

Template HTML di dalam f-string Python = SyntaxError berulang (CSS `{}` bentrok `{{}}` escaping).
**Pencegahan:** template pakai `__TOKEN__` + `.replace()` chain, bukan f-string. Rewrite penuh lebih cepat dari patch-per-line setelah error ke-3.

## 2026-09-13 | org | Riset: aturan yang terbukti (multi-agent)

- **WRITE single-threaded** (Cognition/Devin): parallel READ aman, tapi satu artefak = satu penulis. CTO = satu-satunya penulis kode.
- **Self-referential ban** (Palisade/METR): agent dilarang edit cron/prompt/guardrail sendiri → `blocked_for_owner`.
- **Approval fatigue**: 93% permission prompt di-rubber-stamp manusia — gate manual yang terlalu sering = gak ada gate. Makanya hard rules cuma untuk yang irreversible.
- **Replit DB-wipe**: enforcement harus di luar judgment agent (owner-only list, DB read-only).
- **DORA small batches**: 1 perubahan logis per deploy; 2 deploy/hari cukup konservatif.

## 2026-09-13 | domain | Jam tutup IDX = ~16:00, bukan 15:00

Sesi II sampai 15:49:59 + prapenutupan 16:00 + pascapenutupan 16:15 (JATS terbaru). Quiet zone resmi 09:00–16:15. Data lama di kepala agent = salah — selalu verify jam bursa dari sumber fresh sebelum pasang jadwal.

## 2026-09-13 | tooling | GSC UI kebal klik programmatic

Submit sitemap via GSC web (Angular closure, tanpa <form>): 6 jurus gagal — JS .click(), CDP trusted mouse events (hover+press+release), per-char keydown, insertText, form.requestSubmit, internal fetch endpoint (404). Error "Alamat peta situs tidak valid" bahkan saat value bersih. Owner klik manual 10 detik = beres.
**Pencegahan:** navigasi & BACA data GSC via gsc_cdp.py aman; untuk SUBMIT/konfirmasi UI → minta owner klik di window Chrome visible (~/.hermes/browser-gsc, port 9222). Jangan buang >10 menit untuk UI automation Google.

### 2026-09-13 — Dashboard /site "nothing happened when clicked"
- Gejala: klik tab /site kadang diam — server render sinkron berat (brief DB 90s + IG bridge 25s + curl + docker + git) pas cache expired; di HP kelihatan mati.
- Fix 1: stale-while-revalidate semua sumber berat (_run_brief/_ig_stats/_ig_engagement/_status_cells) — cache lama disaji instan, refresh jalan di background thread.
- Fix 2: kartu paling lambat (IG Engagement, Status&Infra) jadi LAZY: server render skeleton + client fetch /api/site-card?f=ig|status.
- Pitfall: route /api/site-card HARUS di-cek sebelum branch /api generik (startswith menang salah urutan) — gejalanya response JSON /api masuk ke kartu.
- Hasil: /site first-byte 0.09s (dari 30-90s saat cache expired), 13 kartu lengkap.

## 2026-09-14 — Data-integrity: baris sesi fantasi non-trading (P0 ceo-2026-09-14-01)

- Root cause BERLAPIS: (1) Yahoo v7 quote mati ~8 Sep → provider diganti TradingView scanner (10 Sep, UNCOMMITTED) yang regularMarketTime=null + marketState di-hardcode REGULAR → guard lama (filter POSTPOST + quote-time stamping) tidak pernah memicu; scanner re-serve OHLC+volume sesi terakhir di luar jam bursa sehingga volume-filter pun lolos. (2) fix cleanup 85k-row 7 Sep + migrasi scanner hidup sebagai working-tree diff 4 hari — HEAD tanpa guard, tiap deploy dari checkout bersih kehilangan fix lagi (bukti: MAX(StockPrice)=Minggu 13 Sep lolos gate pagi). (3) CronLog.startedAt = UTC — jam 17:02 WIB terbaca 10:02, forensik harus selalu pakai AT TIME ZONE Asia/Jakarta.
- Gejala: 865 baris StockPrice+StockIndicator tertanggal Minggu 13 Sep (ditulis Senin 00:00-10:21 UTC oleh cron 5-menit tanpa guard efektif), 865 baris pre-market Senin (tertulis 00:00 WIB, harga identik Jumat). MAX(date)=Minggu lolos freshness gate pagi (hole #2). Golden-cross ter-mutasi 75→77→82.
- Fix (commit d29f24d, deploy 17:17 WIB): write-guard isWibWriteWindow() di buildPriceItems — tulis StockPrice hanya Sen-Jum 09:00-18:00 WIB (sesi 09:00-16:15 + buffer sync EOD 16:30/17:00); di luar jendela return []. Diverifikasi di bundle: konstanta 540/1080 ada di sync-intraday/route.js; run 17:17+17:26 WIB perilaku benar (865 upsert tanggal sama, bukan baris baru).
- Fix gate: teknikalid_data_freshness.py men-flag MAX(date) akhir pekan sebagai ANOMALI (ok=false) — unit-test is_weekend: Minggu/Sabtu=True; live run FRESH, MAX=Senin 14 Sep, rows 865.
- Cleanup dieksekusi (policy owner 14 Sep, backup 08:30 valid): DELETE 865 StockPrice + 865 StockIndicator tanggal 2026-09-13, transaksi tunggal, verifikasi pasca 0 baris. Log eksekusi: docs/agent-org/decisions.md.
- Sisa utang (untuk owner/CTO berikut): ~60k baris weekend historis 2025-03→2026-07 (pre-cleanup-7Sep, ~330-487 baris/Sabtu) + 865 baris pre-market Senin 14 Sep tertimpa EOD asli (aman, upsert) + kalender libur IDX belum ada (~18 hari/thn) + guard masih uncommitted-untuk-file-lain (market-quotes.ts dll) — commit sisa diff sebelum deploy berikutnya.
- Content QA 15 Sep: 40/42 artikel harian salah label unit volume — generator menulis "X juta lot" padahal StockPrice.volume dalam SAHAM (1 lot = 100 saham → klaim 100x). Pola berulang (1 artikel 26 Aug juga). Brief pasar sudah pakai unit benar. Pelajaran: fact-check unit, bukan hanya nilai — angka cocok ≠ benar; generator & brief harus satu sumber konvensi unit. Fix via cto-queue reviewer-2026-09-15-01.
- Pola minor berulang-potensial: template title memotong nama emiten "(Persero (BBRI)" — nama resmi dengan tanda kurung ("(Persero) Tbk") kepotong di batas panjang title; cek juga field lain (excerpt/CTA "Bank Rakyat Indonesia (Persero" di CTA live).

## 2026-09-16 — CTO pagi (ceo-2026-09-15-01 analisa weekend rows)
- **Lesson: selalu filter assetClass saat mengaudit "baris hari non-trading".** Premis "~60k baris weekend fantasi" ternyata 100% CRYPTO (59.134 baris) — pasar 24/7, baris weekend-nya valid (close & volume beda tiap hari, bukan salinan Jumat). Baris weekend EQUITY = 0 sejak cleanup 14 Sep. Query audit tanpa `assetClass='EQUITY'` menghasilkan diagnosa phantom + hampir memicu DELETE usulan yang tidak perlu.
- **Lesson: uncommitted-working-tree ≠ belum live.** Sitemap exclusion sudah berjalan di production (image dibangun dari worktree) padahal `git status` menyebut modified/untracked. Verifikasi KEBAIKAN harus: (a) cek perilaku live (curl), (b) cek `git blame`/`git status` utk utang commit. Sebelum menulis spec "tambahkan exclusion", curl dulu — kerjaan bisa tinggal commit.
- **Lesson: window indikator = per-BARIS (250 terakhir), bukan per-tanggal-trading** (indicator.service.ts L327). Kalau suatu saat baris fantasi equity beneran masuk DB lagi, dampaknya nyata ke SMA/EMA. Simulasi replikasi eksak (865/865 saham match DB, max err 0.005) = cara murah membuktikan no-impact tanpa mutasi.
- **Temuan terpisah (belum jadi task): injest crypto stale sejak ~24 Jul 2026** — max(date) crypto = 2026-07-24. Kalau halaman /crypto dipakai user, ini task P1 calon.
