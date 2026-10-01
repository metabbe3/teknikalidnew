
## [LESSON] Generator brief: superlatif tanpa ranking-cek + angka lintas-hari (RECURRENCE 2×)
**Kejadian**: qa-2026-09-27-01 (breadth salah) & qa-2026-09-30-01 ("582 saham turun" = angka Jumat dipakai utk kalimat Senin; SOFA "terbesar non-gorengan" padahal IFSH +24,80%; LPKR "terbesar di bursa" padahal #6, top-5 = BUMI/BTEK/KPIG/BNBR/PADI).
**Root cause**: LLM generator menghitung angka agregat dari konteks/ingatan + menulis superlatif tanpa query ranking. Angka per-ticker aman (dari market-brief-data), tapi agregat (breadth) & superlatif = dibuat sendiri.
**Rule permanen (sudah dipatch ke prompt Mandor 714dbdc87f54 + Reviewer 4ae85965a258, 30 Sep)**:
1. Superlatif ("terbesar/terkuat/terbanyak") WAJIB didahului SQL `ORDER BY ... DESC LIMIT 5` hari sama; bukan #1 → tulis peringkat exact.
2. Breadth (X naik vs Y turun) WAJIB dari query snapshot hari yang DIMAKSUD — dilarang hitung sendiri lintas-hari.
3. Membandingkan sesi → sebut hari+tanggal eksplisit dan cocokkan angka vs hari itu (Jumat≠Senin≠Selasa).
4. Reviewer: superlatif & cross-day = checklist deterministik harian (a2), bukan sampling.
**Verifikasi kejenuhan**: Evolution Coordinator 04:00 review apakah recurrence berhenti; kalau kejadian ke-3 → generator angka agregat harus dipindah ke script deterministik (bukan LLM).
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

## 2026-09-17 — botgate (CTO pagi)
- **Lesson: UA reduced `Linux; Android 10; K` ≠ bot.** Mayoritas IP pemakai UA itu = Telkomsel AS7713 asli (ribuan views). Spec "flag UA pattern" akan memusnahkan user mobile Indonesia — pembeda insiden 15 Sep adalah datacenter ASN, bukan UA. Spec yang menyebut pola UA wajib diuji dulu ke kolom `ip` DB sebelum dieksekusi.
- **Lesson: XFF spoof dari luar TIDAK sampai ke app** (edge menimpa jadi IP socket) → beacon test bot-gate harus dari DALAM container app (`docker exec ... node fetch` dgn X-Forwarded-For). DB timestamp = UTC (WIB-7), sesuaikan window query.
- **Lesson: ASN insiden lolos karena org mismatch** — ip-api `org` tak selalu mengandung nama vendor (AS36352 tampil "CloudIT Assets", bukan ColoCrossing) → org-RE saja tak cukup; rawat daftar AS number + org-RE bersamaan.

## 2026-09-18 — ISR empty-state bake pasca deploy (CTO malam, jkse-02)
- Gejala: /saham-golden-cross empty ~10 mnt pasca `up -d` padahal DB 100 sinyal & API fresh 100 rows.
- Root: page.tsx `catch {}` (non-critical swallow) + ISR — kalau query DB transient-gagal saat regen pertama pasca-restart, EMPTY-state jadi HTML yang ter-cache (s-maxage=300 + stale-while-revalidate 600).
- Anti-panic: JANGAN kesimpulan "deploy merusak page" dari satu curl — verifikasi rantai: (1) API fresh cache-buster, (2) ISR file di dalam container (`docker exec ... grep .next/server/app/<route>.html`), (3) baru bandingkan vs CDN/edge. Self-heal dalam 1 cycle revalidate.
- Kandidat fix P3 (belum dikerjakan, no-sweep rule): empty-state hanya boleh di-cache kalau query sukses; error render → rethrow/no-store.

## TCC-block pasca hermes upgrade + SIGALRM-dari-thread (2026-09-19)
- Upgrade hermes (restart gateway) bisa MENGHILANGKAN izin TCC ~/Documents utk proses baru → open() Documents = block UNINTERRUPTIBLE (kill -9 & SIGALRM tak mempan) → /agents hang total, kernel agent mati 3x.
- MITIGASI PERMANEN: (1) daemon/dashboard JANGAN refer path ~/Documents langsung — simpan data di ~/.hermes/data/ (queue/backlog lokal) atau mirror ~/.hermes/data/org-mirror/; (2) guard `_tcc_safe(path)`: path Documents → mirror, mirror tak ada → skip graceful; (3) JANGAN pakai signal.alarm di HTTP handler thread — ValueError di non-main thread bikin fungsi return kosong diam-diam (= SDLC board kosong 35→0 tanpa error log!).
- Restore owner: System Settings → Privacy & Security → Full Disk Access (proses baru pasca-upgrade = perlu re-grant).
- Verifikasi kesembuhan: curl /agents <5s + SDLC header >0 task + test read file repo via subprocess timeout.


## 2026-09-20 — Rekap mingguan mixed-freshness (pola hari ke-2)
- Gejala: rekap-pasar-mingguan-2026-09-19 — breadth/movers pakai StockPrice 18 Sep fresh, tapi '20 golden cross' cocok EKSAK dengan snapshot indikator s.d. 17 Sep (20 = replikasi thru-17; 21 = full-week non-gorengan). Kemarin (qa-19-01) lead/kronologi mundur 1 hari. Akar keluarga sama: generator mencampur sumber data yang EOD-nya selesai beda waktu (harga ~16:30 vs indikator belakangan), atau generate sebelum seluruh EOD selesai (lastGeneratedAt 23:33, indikator 18 Sep belum ada).
- Aturan: angka turunan indikator (cross/sinyal) di rekap harian/mingguan wajib disangkan dari StockIndicator yang SUDAH memuat sesi terakhir window artikel. Kalau generate sebelum EOD lengkap -> jangan pakai angka window penuh, atau tunda generate. Rekomendasi struktural: weekly-report.service.ts sudah hitung cross dari pasangan snapshot (prev vs in-window) — generator rekap sebaiknya pakai jalur yang sama, satu sumber kebenaran.
- QA guard reviewer: replikasi query setiap angka agregat DENGAN window yang dinyatakan artikel; kalau angka hanya cocok dengan window lebih pendek -> mixed-freshness, flag P1. (Beruntun: 19 & 20 Sep.)

### 2026-09-20 — docker exec tanpa -i menelan heredoc SQL (qa-2026-09-20-01)
- Gejala: docker exec container psql <<SQL -> TIDAK error, TIDAK ada BEGIN/UPDATE/COMMIT; POST-check row tak berubah. Stdin heredoc tidak diteruskan tanpa flag -i.
- Aturan: SQL patch via heredoc SELALU docker exec -i; WAJIB lihat output BEGIN/UPDATE n/COMMIT + POST-count — "senyap" = tidak dieksekusi, bukan sukses.

## Council 20 Sep 2026

- Verifikasi angka klaim besar langsung di DB sebelum jadikan blocker/prioritas (20 Sep: klaim 'sitemap 1355 artikel' vs DB Article=99 — task ditahan; semua angka usulan WAJIB sitasi query).
- Metrik retro pakai isBot=false: 1 IP bisa menggeser ±100 views/hari — cek top-IP per hari sebelum baca tren traffic (20 Sep: Selasa raw 168 vs bersih 4; 105 dari 1 IPv6).


### 2026-09-20 — Council skip agenda item sendiri (prod-01 PRD review)
- Gejala: handoff Minggu eksplisit 'Council 20 Sep review prod-01'; blok council 08:05 tidak menyentuh prod-01 sama sekali — spec_ready menginjak 3 hari tanpa review.
- Aturan: council wajib checklist agenda dari handoff dan menandai item yang dilewati + alasannya; CEO pagi cross-check agenda council vs handoff dan meng-cover review yang terlewat DI RUN YANG SAMA (jangan dibiarkan menggantung seminggu).

### 2026-09-21 — Klaim superlatif & anchor hari di brief (fatal baru, beda rasa dari mixed-freshness)
- Gejala: brief-pasar-idx-2026-09-21 — angka agregat & harga 100% EXACT vs DB, tapi 2 klaim naratif salah: (1) "7 GC pada Rabu 16/9" padahal 7 = Selasa 15/9 (brief harian melaporkan sesi H-1, jadi generator brief Senin salah menyebut hari untuk angka yang diambil dari brief Rabu lama); (2) "LPKR volume terbesar di seluruh papan" padahal ke-4 (BUMI 3,4M, BRMS 872jt di atasnya).
- Aturan: generator brief dilarang memakai klaim superlatif ("terbesar/tertinggi/paling") & anchor hari tanpa query langsung. Superlatif wajib dievaluasi dari full ranking DB hari yang sama (bukan dari brief sebelumnya); anchor hari wajib dicek kalender bursa. Brief H-1 adalah NARASI, bukan SUMBER DATA.
- QA guard reviewer: setiap superlatif di brief → replikasi ranking penuh dari DB sesi yang diklaim; setiap "X saham pada <hari>" → cocokkan tanggal kalender, bukan asal angka cocok.

### 2026-09-21 — Soft-duplicate /berita/<slug-edu> (pola hari ke-2, masih belum difix)
- Gejala: /berita/<slug-artikel-EDUCATIONAL> merender konten HOMEPAGE (title+canonical homepage) dengan HTTP 200 — hari kedua berturut (20 & 21 Sep). Halaman edu kanoniknya di /akademi/<slug>.
- Risiko: duplicate content tanpa redirect + sinyal kanonik homepage bisa membingungkan crawler; QA pass per artikel tetap dicatat karena /akademi/ benar.
- Status: qa-2026-09-21-03 (P2) — fix = 404 atau 301 ke /akademi/ bila articleType=EDUCATIONAL. Kalau hari ke-3 masih ada setelah qa-21-03 dieksekusi, eskalasi prioritas.

### 2026-09-22 — Typo 'saam' pola berulang ke-3 (generator output, bukan kebetulan)
- Gejala: kata 'saham' salah ketik jadi 'saam' di 3 artikel PUBLISHED berbeda tanggal & tipe (brief-pasar-idx-2026-09-22, analisa-teknikal-arto, analisa-teknikal-amrt) — semua angka lain exact vs DB.
- Aturan: 3 kemunculan di artikel berbeda = pola keluaran LLM generator, bukan typo manual. Fix artikel via SQL patch (reviewer-qa-2026-09-22-01); CTO cek root cause ringan (grep 'saam' di template/prompt) — kalau generator memang bisa menghasilkannya, tambahkan post-process guard sederhana (regex \bsaam\b → saham) di pipeline sebelum publish.
- QA guard reviewer: sweep LIKE '%saam%' (dan typo satu-huruf serupa 'sham/saahm') jadi bagian checklist harian.

## 2026-09-22 — Root loading.tsx itu bukan cuma spinner (soft404-01)
- Root/segment loading.tsx = implicit Suspense boundary: Next flush shell HTTP 200 SEBELUM page resolve → notFound() terlambat → SEMUA slug ngaco balas 200 (soft-404 sitewide). Hapus boundary = 404 benar.
- Dependency TERSEMBUNYI boundary root: halaman client pakai useSearchParams() butuh boundary apa pun saat prerender — /admin/login build gagal setelah root loading.tsx dihapus. SEBELUM hapus boundary: grep `useSearchParams` + pastikan tiap pemakai punya Suspense inline.
- curl -L menyesatkan untuk cek status route auth-gated: /profile/x 307 → /auth/signin 200; direct-container curl tanpa -L = sumber kebenaran.

## 2026-09-22 CTO sore — 3 lesson (ops-01 worker healthcheck + paralel)
1. **SIGKILL ke PID1 diabaikan kernel bila datang dari dalam PID namespace** — probe healthcheck yang `process.kill(1,'SIGKILL')` exit=1 tapi container TIDAK mati (bukti: health log exit 1 dua siklus, RestartCount=0). `restart: unless-stopped` hanya bereaksi container EXIT, bukan label unhealthy. Self-heal dalam-container yang benar: **bunuh proses aplikasi asli** (pkill pattern dgn bracket self-exclusion, mis. `agent-worke[r]`) → wrapper/npm exit → container exit → restart policy revive. (HivePOS pattern 82e9952 perlu diaudit utk hal sama — wget/node fetch probe di sana bunuh diri via exit 1 saja… api svc-nya exit on probe fail? Bukan — docker TIDAK kill; hivePOS juga hanya label. Kartu follow-up.)
2. **Spec worker claude HARUS eksplisit melarang `docker compose build/up`** — "jangan git commit" tidak cukup; worker A & B sama-sama melakukan build+up sendiri (18:45-18:46) = 2 deploy dari 2 worker di 1 slot, menghabiskan budget tanpa kontrol CTO. Untung konten = commit CTO. Template spec tambah baris: "LARANGAN: jangan git commit, JANGAN docker build/up/restart — verifikasi lewat baca file/grep saja".
3. **SIGSTOP di npm wrapper (PID1) tidak membekukan node asli** — entrypoint `npx tsx` berantai npm→node→tsx; membekukan PID1 hanya membekukan wrapper. Uji liveness worker harus SIGSTOP **proses node paling bawah** (identifikasi via /proc/*/cmdline match `tsx*agent-worker`). Kebalikan umum: heartbeat setInterval membuktikan event-loop liveness, bukan proses-hidup (child yatim tetap menulis heartbeat? tidak — child mati = tidak ada penulis; stale terdeteksi. OK).

### 2026-09-23 — Klaim "sudah ke queue" tanpa bukti persist = task hilang (pola ke-2)
- Gejala: entri QA 22 Sep melaporkan task P2 reviewer-qa-2026-09-22-01 (fix 'saam') "ke queue", tapi id tsb TIDAK ADA di kedua salinan cto-queue.json (data-dir & repo identik, 23→25 entries) → fix tak pernah dieksekusi, typo live hari ke-3 di 3 artikel PUBLISHED.
- Aturan: writer queue WAJIB read-back setelah write (json parse + grep id baru) sebelum melaporkan "task dibuat"; klaim tanpa bukti read-back tidak sah. Reviewer: sweep ulang id yang diklaim dibuat H-1 sebelum menandai regresi.
- Unit & hitung (bonus hari ini): 1 lot = 100 saham, StockPrice.volume = SAHAM — brief 23 Sep regresi unit 'lot' pertama dalam 30 hari (brief lama bersih); hitungan "golden cross baru" wajib vs smaCrossDate hari sesi + filter non-gorengan, bukan ingatan LLM. Guard reviewer harian: sweep ' juta lot'/' ribu lot' + recount GC baru + LIKE '%saam%'.

## 2026-09-24 — Deploy hanya app ≠ deploy penuh: worker jalan image basi (regresi guard harian)
- Pola: qa-23-01 (brief 23) fix 'lot'→'saham' + sanitizer + prompt guard; brief 24 REGRESI 'lot' x3 padahal angka benar. Bukan LLM nakal — guard tidak pernah jalan: deploy 080daf4 (23 Sep 07:57) hanya `docker compose build app && up -d app`; image worker terakhir dibangun 22 Sep 11:45 (ops-22-01) dan container worker Up 36 jam. generateDailyBrief dieksekusi worker → sanitizer/prompt baru tidak pernah dipakai utk brief.
- Aturan: perubahan kode yang dipakai worker (article.service, prompt builder, sanitizer, dsb.) WAJIB rebuild KEDUA image: `docker compose build app worker && docker compose up -d app worker`. Cek cepat pra-selesai deploy: `docker images --format '{{.Repository}} {{.CreatedAt}}' | grep teknikalid` — kedua image harus sama umurnya dgn commit head.
- Deteksi dini (QA): brief regresi typo/satuan yg sudah 'difix' = cek dulu IMAGE umur berapa, bukan langsung salahkan prompt/LLM. Buktikan dgn `docker exec teknikalidnew-worker-1 sh -c 'grep -rl <marker> /app/.next/server/chunks/ | head -3'`.
- Terkait: guard SSR-only tidak terlihat curl (SaveScreenPrompt client component) — verifikasi fitur FE interaktif pakai browser sungguhan, curl hanya utk SSR/SEO.


## 2026-09-27 — Sunday Strategy Council
- **Heartbeat ledger same-day-only = undercount sistematis**: run_ledger.py hanya menulis job dengan last_run_at == hari-ini SAAT script jalan (05:45) → semua job siang/malam (CEO Evening, CTO malam, pagi >05:45) jarang tercatat. Undercount ≠ silent-skip — selalu cross-check bukti kerja nyata (entry decisions.md, git, queue) sebelum menyatakan job mati. Fix: catch-up per (job_id,date) → council-2026-09-27-02.
- **Produksi konten ≠ konsumsi**: 47 artikel/pekan (40 snapshot + 7 NEWS) mayoritas 0-3 views; satu-satunya saluran discovery internal yang terbukti = widget /stocks (87% views halaman GC darinya). Halaman tanpa link internal = halaman mati, berapa pun kontennya bagus.

## [2026-09-28] Verifier Gate masuk SDLC (owner directive)
**Konteks:** Decision Engine ala JEV live (~/.hermes/scripts/verifier/verify.py, GLM z.ai flash/5.3). Owner: pakai untuk high-stakes + task coding 3 org.
**Aturan:** CTO WAJIB verifier-gate klaim DONE-WHEN sebelum tulis changelog (klaim verify dinilai konsistensinya); QA boleh bungkus verdict naratif; ANGKA tetap SQL/curl/tsc — verifier BUKAN pengganti bukti fisik, ia pemeriksa klaim kedua. Fail-open. Log: ~/.hermes/data/verifier-log.jsonl. Skill: verifier-gate. Rollout: teknikal dulu, hivePOS+AegisGo menyusul setelah ≥3 koreksi nyata.
**Pencegahan:** klaim "semua 200 / 44 file / tsc=0" yang TIDAK didukung output fisik akan ditangkap gate — tulis klaim hanya sebesar bukti.

## [REVIEWER] 2026-09-28 — Lot regression hari ke-4: sanitizer gap (bare pattern) + jalur growth-mandor unwired
- Pola: brief23/24 (lot x3, x3) → fix sanitizer regex (juta|ribu|miliar) lot + prompt guard → brief25 'saam' excerpt (fix varian excerpt/title) → brief28 'lot' KEMBALI x3 dgn pola BARU: BARE '796 ribu lot' tertangkap, tapi '2.600 lot' (tanpa juta/ribu/miliar) TIDAK — regex butuh pola multiplier.
- Lebih fatal: brief28 ditulis jalur growth-mandor (aiProvider=growth-mandor, createdAt→updatedAt +2m50s pasca-edit), BUKAN worker pipeline — sanitizeGeneratedContent tidak pernah dieksekusi. Guard eksisting melindungi 1 dari ≥2 jalur publish.
- Pelajaran: (1) guard harus dipasang di SEMUA call-site publish (worker + admin API + script eksternal), bukan hanya jalur utama; (2) regex whitelist pola (juta|ribu|miliar) rapuh — pakai pola umum \d[\d.,]*\s+lot → saham dgn whitelist pengecualian edukasi '1 lot = 100 saham'; (3) QA patch DB tiap kejadian = whitelist obat, bukan obat generik — fix jalur adalah obatnya (qa-2026-09-28-01).
- Klaim angka vs widget situs sendiri: brief tulis 'golden cross 0' saat widget /stocks bilang '12 golden cross' pekan sama = kontradiksi on-site yang paling merusak trust; generator konten wajib pakai SATU sumber komputasi (weekly-report.service) bukan LLM menghitung sendiri (pola qa-27-01 berulang).


### 2026-09-28 | infra-dokumen | Symlink kanonik datadir↔repo diam-diam diganti file biasa oleh tulis atomic-replace (temp+rename); backlog datadir kehilangan mandat PRD — dual-file divergen 1 hari sebelum agent lain baca file salah | Semua script/agent yang menulis queue/backlog WAJIB resolve realpath dulu (os.path.realpath) sebelum menulis; watchdog harian cek is-symlink utk cto-queue.json + product-backlog.json

## 2026-09-29 — Backlog dual-file recurrence #2 + mandat PRD hilang diam-diam
- **Atomic-replace memutus symlink LAGI** (27-28 Sep lalu, terdeteksi 29 Sep): pola tulis `tmp+os.replace()` pada path symlink menjadikannya FILE BIASA (rename menimpa link, bukan target). Writer Product Agent (datadir) + CEO evening (repo) sama-sama tulis langsung → dua file hidup terpisah. Konten untung identik kali ini, tapi **wid-2026-09-27-1 (mandat PRD approved) hilang dari keduanya** — kemungkinan besar masuk ke file yang tertimpa atomic-replace 27 Sep 22:01.
- RULE: (1) writer backlog/queue WAJIB resolve symlink dulu (`os.path.realpath(path)`) sebelum atomic-replace, ATAU tulis langsung ke path repo kanonik; (2) setelah insiden dual-file, entry-set + `grep -c` wajib diverifikasi via KEDUA path; (3) verdict approve CEO di ceo-decisions TANPA entry backlog = red flag hilangnya mandat — backlog_hygiene / CEO ritual harus cross-check verdict backlog vs entry fisik; (4) struktur backlog pakai key `entries` (BUKAN `items`) — script merge salah kunci nyaris menimpa 19 entry (tertangung karena inspect top-level keys dulu sebelum replace).

## [REVIEWER] 2026-10-01 — Superlatif tanpa ranking DB: pola ke-3, kali ini lolos QA D-1
- Pola: qa-27-01 ('terbesar bursa' LPKR, 'penguat terbesar' SOFA — 2 klaim) → qa-30-01 (superlatif sama di brief berikutnya, 2 klaim, terlambat 1 hari) → 1 Okt (sisa 'BBSI RSI 11,7 (paling ekstrem)' di brief yang SAMA, lolos review 30 Sep karena QA fokus 3 temuan pertama).
- Bukti selalu sama: superlatif ditulis LLM tanpa query ranking; DB selalu punya kandidat lebih ekstrem yang tak disebut (RSI GOTO 0,04 vs BBSI 11,7).
- Pelajaran: (1) generator brief: superlatif apa pun ('paling/terbesar/terkuat/ter-ekstrem/terbanyak') = WAJIB ada angka ranking di prompt-input, kalau tidak ada → tulis deskriptif saja; (2) QA checklist artikel long-form: SATU pass khusus hunt-superlatif (grep 'paling|terbesar|terkuat|ter-ekstrem|terbanyak|rekor') lalu verifikasi ranking SQL per klaim — jangan berhenti di temuan pertama; (3) disclaimer inline = kontrak format NEWS (brief punya, rekap bulanan tidak → minor yang mudah lolos).
