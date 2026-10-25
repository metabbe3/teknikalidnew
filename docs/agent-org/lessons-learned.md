
## 2026-10-13 | konten | BASIS breadth: open vs prev-close + superlatif ke-9 (qa-2026-10-13-01)

Brief 13 Okt menulis breadth '674 turun/136 naik' + rata-rata sektor + BBNI -1,74%/BMRI -0,99% dgn basis close-vs-OPEN (intraday) — DB open-basis memang exact 674/136 & T&L -3,92% — padahal standar situs (snapshot + movers %) = prev-close (626 turun/115 naik; BBNI -1,46%, BMRI -0,74%). Variabel open ADA di StockPrice dan angkanya konsisten → generator memilih sumber kolom yang salah, bukan mengarang angka. Ditambah superlatif pola lama: 'turun terbanyak sejak akhir Juni' (12 Okt 626 hanya rank #7-9; open-basis pun kalah 6 hari) dan 'GOTO RSI 15 terjauh jenuh jual' (TGUK/SUPR 0,00 & BCAP 10,00 lebih rendah → rank #4). Ke-9 keluarga superlatif; VARIAN BARU = salah basis harga utk agregat.
**Pencegahan:** rule generator: breadth/sektor/%-perubahan harian WAJIB basis prev-close (lag 1 hari trading per saham); jika mau pakai basis lain, wajib ditulis eksplisit ('dari posisi pembukaan'). Superlatif tetap wajib input ranking SQL hari sama. Reviewer: tambahkan cek duplo breadth (hitung open-basis & prev-close — kalau brief match open-basis = fatal basis).

## [LESSON] Generator brief: superlatif tanpa ranking-cek + angka lintas-hari (RECURRENCE 2×)
**Kejadian**: qa-2026-09-27-01 (breadth salah) & qa-2026-09-30-01 ("582 saham turun" = angka Jumat dipakai utk kalimat Senin; SOFA "terbesar non-gorengan" padahal IFSH +24,80%; LPKR "terbesar di bursa" padahal #6, top-5 = BUMI/BTEK/KPIG/BNBR/PADI).
**Root cause**: LLM generator menghitung angka agregat dari konteks/ingatan + menulis superlatif tanpa query ranking. Angka per-ticker aman (dari market-brief-data), tapi agregat (breadth) & superlatif = dibuat sendiri.
**Rule permanen (sudah dipatch ke prompt Mandor 714dbdc87f54 + Reviewer 4ae85965a258, 30 Sep)**:
1. Superlatif ("terbesar/terkuat/terbanyak") WAJIB didahului SQL `ORDER BY ... DESC LIMIT 5` hari sama; bukan #1 → tulis peringkat exact.
2. Breadth (X naik vs Y turun) WAJIB dari query snapshot hari yang DIMAKSUD — dilarang hitung sendiri lintas-hari.
3. Membandingkan sesi → sebut hari+tanggal eksplisit dan cocokkan angka vs hari itu (Jumat≠Senin≠Selasa).
4. Reviewer: superlatif & cross-day = checklist deterministik harian (a2), bukan sampling.
**Verifikasi kejenuhan**: Evolution Coordinator 04:00 review apakah recurrence berhenti; kalau kejadian ke-3 → generator angka agregat harus dipindah ke script deterministik (bukan LLM).
**[RECURRENCE 3× — 5 Okt, qa-2026-10-05-01] Keluarga sama kambuh di brief harian**: breadth '470/556/325' TIDAK ter-replikasi 8 varian metode (kanonik kalibrasi-brief29: 471/558/416) + varian BARU: rasio lintas-ticker 'hampir 2,5x BUMI' padahal DB 54,3x (97,54M vs 1,797M) — angka absolut per-ticker benar, RASIO dihitung sendiri = fabricated. Kode 28 Sep-4 Okt off-by-1 (weekly 505 vs 504) = pola menumpuk terbukti. Rule tambahan: (5) rasio/pembagian dua angka WAJIB dihitung dari angka final yang ditulis, bukan dari ingatan; (6) breadth kanonik = SEMUA saham close terakhir vs close sebelumnya (metode yang exact vs brief29 189/550/127), bukan universe vol>0/threshold. Ambang kejadian ke-3 tercapai → generator angka agregat (breadth+rasio) kandidat dipindah ke script deterministik.
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

## 2026-10-02 — main tidak-bisa-clean-build tersembunyi oleh cache Docker + worktree drift
- Gejala: BUILD-1/2 dari main gagal typecheck, padahal tsc lokal + selftest Night PASS.
- Akar ganda: (1) untracked dead scripts (generate-wave/rank-wave.ts, eksperimen Aug-4) ikut build-context; (2) 6 file src committed di main pakai relasi reviewedBy yang tak pernah ada di schema committed — schema worktree (live di DB) lebih akurat dari main.
- Pola umum: deploy dari worktree kotor + cache layer Docker = typecheck bisa lolos bertahun-tahun; merge/commit yang mengubah COPY layer membongkar semuanya sekaligus (2 error berurutan).
- Rule: image baru WAJIB verifikasi (docker images CreatedAt + container image hash ≠ sebelumnya) —  exit 0 dengan image lama = deploy ilusi (kejadian hari ini: build pertama tidak menghasilkan image, container tetap up 24h).
- Rule: merge night_ready ≠ hanya diff review — main harus bisa build; simpan status \"main clean-buildable\" sebagai invariant, bukan asumsi.

- 4 Okt 2026 (Council): z.ai 429 rate-limit 3 Okt 06:30-08:40 menumbangkan Reviewer 2x + Growth Daily Check — job pagi bertumpuk di jam sama (06:30-08:40: Weigh-In, Growth Check, CTO, CEO, Reviewer) jadi 1 limit 5-jam z.ai memakan banyak job sekaligus. Fail = infra rate-limit, BUKAN bug kode; jangan buru-buru "fix" script. Mitigasi berikutnya bila recurrence: usul stagger.

## [REVIEWER] 2026-10-04 — Superlatif pola ke-4: lolos ke jalur artikel EDUKASI (guard jalur brief tidak menutup jalur lain)
- Temuan: cara-membaca-halaman-analisa-saham (EDUCATIONAL, growth-mandor) menulis 'Contoh paling ekstrem saat ini: GOTO RSI 10' — DB 2 Okt non-gorengan punya 5 saham lebih ekstrem (BCAP 0,17/NETV 3,57/BSBK 4,65/BBSI 7,82/BUMI). GOTO memang jadi contoh paling relevan untuk narasi (paling dikenal), tapi kata 'paling ekstrem' = klaim ranking yang salah.
- Pola berulang: qa-27-01 (2x) → qa-30-01 (2x) → qa-01-01 (1x) → hari ini (1x, jalur EDU). Guard superlatif yang dibahas di qa-01-01 terpasang di jalur brief; jalur artikel edukasi/rekap belum. Setiap jalur generator baru = permukaan serangan superlatif baru.
- Rule: SEMUA jalur generator (brief, rekap, edukasi, listicle) pakai rule sama — superlatif ('paling/terbesar/terkuat/ter-ekstrem/terbanyak/rekor/paling ekstrem') hanya boleh muncul kalau prompt-input memuat angka ranking DB; kalau contoh dipilih karena relevansi narasi (bukan ranking), tulis deskriptif ('contoh nyata', 'salah satu yang paling dikenal') — jangan klaim ranking.
- Catatan metodik reviewer: kalimat rekap mingguan '3 death cross baru' = event-count smaCrossDate (3: MEDS/IKAI/OASA) vs pair kanonik lintas-upekan (2) — dua metode sah, tapi campur metode dalam satu artikel membuat pembaca tak bisa mereplikasi; pilih SATU dan konsisten (qa-27-01 preseden). Breadth 505 vs replikasi SQL 504 (+774 vs 773): off-by-1 di bawah ambang — kemungkinan selisih definisi universe 'mencatat perdagangan penuh'; pantai kalau menumpuk.

## 2026-10-05 | agent-org/symlink | os.replace/atomic-write di path symlink data-dir MEMUTUS symlink -> file regular (drift #3, kali ini oleh CEO sendiri; drift 2x sebelumnya dari tulis manual) | Agent yang menulis cto-queue/product-backlog via data-dir HARUS tulis ke path REPO kanonik (~/Documents/teknikalidnew/docs/agent-org/) langsung, atau cek islink sebelum write + restore symlink di changeset sama; verify md5 data-dir == repo setelah write.

## [REVIEWER] 2026-10-06 — Superlatif pola ke-5: kebocoran leksikon ("terdalam") + unit-error lembar→rupiah (pola baru)
- Temuan: brief6 'Oversold terdalam: GOTO (RSI 9,5)' — DB non-gorengan 5 Okt ada 4 saham lebih rendah (BABP 0,03/BCAP 6,02/ATLA 7,03/BBSI 7,82), GOTO rank #6. Guard jalur brief (qa-01-01) memakai daftar kata tetap (paling/terbesar/terkuat/ter-ekstrem/terbanyak/rekor) — generator menemukan sinonim 'terdalam' yang tak ada di daftar. Pola: qa-27-01 (2) → qa-30-01 (2) → qa-01-01 (1) → qa-04-01 EDU (1) → hari ini (1).
- Rule update: rule superlatif harus SEMANTIK bukan leksikal — klaim ranking/comparatif superlatif apa pun (pola ter-XXX maupun paling-XXX, termasuk terdalam/termuda/tertua) = wajib angka ranking di prompt-input, ATAU kualifikasi terukur yang bisa direplikasi SQL ('di antara saham likuid', 'di daftar ini').
- Pola baru pertama: unit-error — volume LEMBAR ditulis 'Rp374 miliar' (BEKS, brief5; DB 374,4 jt lembar ≈ Rp11,2 M, meleset 33x). Rule: angka volume bursa wajib bawa satuan eksplisit di prompt-input (lembar vs rupiah); generator dilarang mengonversi satuan sendiri.
- Catatan metodik: breadth brief5 memakai metode kanonik universe-full lag-window (total 1.444) vs brief6 strict-day rows (866 'dari saham tercatat') — dua metode sah tapi beda antar-artikel berturutan; pembaca tak bisa membandingkan antar-hari. Usul: SATU metode kanonik untuk semua brief, atau sebutkan universe di teks (brief6 sudah, brief5 belum).

## [REVIEWER] 2026-10-07 — Superlatif pola ke-6: "termuda (6 Okt): DART" (event-date tak di-enumerate) + volume-superlatif scope-salah ("di antara mover" padahal GOTO ikut mover)
- Temuan: brief-7 (1) 'Golden cross termuda (6 Okt): DART' — smaCrossDate=6 Okt non-gorengan ada 5 (DART/AMOR/APII/BAIK/ERAL); DART dipilih sebagai satu-satunya 'termuda'. (2) 'IATA mencatat volume terbesar di antara mover Selasa' — GOTO juga disebut di daftar mover artikel yang sama dengan volume 18,4 M (12x IATA); IATA hanya #2 di antara mover itu (GOTO > IATA > BEKS). Pola: qa-27-01 (2) → qa-30-01 (2) → qa-01-01 (1) → qa-04-01 EDU (1) → qa-06-01 (1) → hari ini (2 klaim).
- Rule baru #1 (superlatif event-date): klaim 'termuda/terbaru (tanggal X): NAMA' wajib diikuti enumerate SEMUA entitas dengan event-date sama di prompt-input; kalau >1 dan hanya satu disebut, tulis 'salah satu dari N' atau enumerate. Generator brief TIDAK menerima daftar smaCrossDate harian lengkap di input (hanya 1-3 ticker) — itu akar masalahnya: tambahkan daftar lengkap GC-baru-hari-ini ke prompt-input brief.
- Rule baru #2 (scope-superlatif domain-closed): superlatif berkualifikasi 'di antara X' hanya sah kalau peringkat dihitung terhadap SET X yang eksplisit di artikel itu sendiri. Kalau artikel menyebut GOTO sebagai mover (vol 18,4 M), klaim 'volume terbesar di antara mover' untuk IATA (1,5 M) otomatis salah. Verifikasi reviewer: hitung ulang ranking TERHADAP entitas yang memang disebut artikel, bukan hanya vs DB global.
- Catatan positif: guard angka sudah matang — brief-7 lolos 25+ angka harga/pct/vol/RSI/breadth/sektor EXACT vs DB; sisa risiko terkonsentrasi di kalimat naratif-superlatif (2 klaim) dari 27+ klaim. Fact-Check Gate (prd-2026-10-05-01, spec_ready) menempuh jalur tepat: gate pre-publish perlu cek leksikon superlatif SEMANTIK (ter-XXX/paling-XXX/termuda/terdalam + 'di antara X ter-Y') terhadap angka ranking di input.

## 2026-10-08 | tooling | GSC 'Minta pengindeksan' BERHASIL via CDP UI-fill (koreksi lesson 13 Sep)
Lesson 13 Sep menyatakan submit GSC kebal klik programmatic — berlaku untuk form sitemap, TIDAK untuk tombol 'Minta pengindeksan': 6/6 URL sukses via UI-fill kolom inspeksi + JS .click() pada tombol request (CDP 9222, profil ~/.hermes/browser-gsc). Dua jebakan: (1) CDP Runtime.evaluate pada arrow-fn TANPA invoke ()() mengembalikan {} senyap — semua JS snippet wajib IIFE; (2) tunggu live-test Google ~30-60 dtk sebelum tombol 'Kirim permintaan' muncul; dialog sukses = 'Pengindeksan diminta'. Pencegahan: pakai ops/gsc_request_index.py (repo); re-audit crawl via gsc_diag3.py pattern; kuota ~10-12 URL/hari.


## 2026-10-10 | infra-docs | product-backlog.json datadir-repo divergen (31 vs 30 entry) karena datadir bukan symlink
- PELAJARAN: agent menulis backlog ke 2 lokasi (datadir & repo) saat file belum disymlink — cto-queue.json sudah symlink sejak 5 Okt, backlog TIDAK, sehingga tulisan itsec-blue 21:48 & Product Agent 22:15 + CTO pagi 07:39 berakhir di file berbeda dan hampir hilang 2 kandidat security.
- PENCEGAHAN: datadir product-backlog.json kini -> symlink repo kanonik (pola sama cto-queue.json). Tiap CEO run: cek `ls -la` islink untuk SEMUA file jamak-tulis (backlog, queue, decisions, handoff) sebelum menulis; temukan drift = merge union + backup + verify readback, jangan overwrite sepihak.

## 2026-10-11 (Council)
- Symlink datadir teknikal (product-backlog.json) DITIMPA jadi regular file lagi dalam <24 jam setelah fix #1 (10 Okt 08:15 → 10 Okt 18:11). Pelajaran: symlink tanpa guard di writer = fix kosong; guard harus ada di monitor (backlog_health.py alert "bukan symlink") + writer resolve path. Drift ke-2 dalam 2 pekan → task CTO ops-2026-10-11-01.
- 6 dari 6 item hivePOS yang di-alert stagnan ternyata SUDAH dikerjakan via cto-queue (backlog lupa di-flip). Pelajaran: verdict cepat = grep queue by keyword dulu sebelum anggap item mati; backlog-health alert "stagnan" sering = status-debt, bukan kerja mati.

## [REVIEWER] 2026-10-11 — Pola ke-7: agregat cross fabricated di jalur REKAP ("56 golden cross") + breadth salah-hari ke-2
- Temuan: rekap mingguan 10 Okt klaim '56 golden cross baru (non-gorengan)' + deret harian 20/16/15/4/1 — DB kanonik as-of Jumat = 16 GC/3 DC (state-change 4/4/5/2/1; window-pair qa-27-01 12/2); TIDAK ada metode yang menghasilkan 56. Deretnya self-consistent aritmetika (jumlah=56) tapi fabricated berduaan — self-consistency BUKAN bukti benar. Breadth Senin ditulis 401 (= angka Jumat; DB 540) padahal excerpt artikel sendiri benar 540 — body vs excerpt tak dicek silang generator.
- Pola: qa-27-01 → qa-30-01 → qa-01-01 → qa-05-01 → qa-11-01 (fabricated-agregat ke-5, kini jalur rekap mingguan; jalur brief sudah ter-guard sejak qa-30-01(d)). Breadth salah-hari: qa-19-01 → hari ini (ke-2).
- Rule: jalur rekap mingguan WAJIB menerima input breadth-per-hari + GC/DC-per-hari dari query DB di prompt-input (perlakuan sama dengan guard brief); LLM dilarang menghasilkan deret/total agregat sendiri. Reviewer: selain cocokkan total, cocokkan SETIAP elemen deret vs DB — deret yang konsisten internally tetap bisa salah seluruhnya.
- Catatan positif: 40+ angka satuan (harga/%/RSI/case-study SMA) exact — fabricated terkonsentrasi khusus di angka yang butuh QUERY (agregat breadth/cross), bukan angka yang dikutip dari data sumber. Guard mandor_brief.py pre-run efektif di jalur brief; replikasi pattern-nya ke generator rekap = fix satu kali untuk pola ini.
- Minor berulang: link internal ke artikel EDUCATIONAL ditulis tanpa prefix /akademi/ (root 404; kali ini di artikel EDU 'beda golden vs death cross'). Generator link internal wajib resolve articleType → prefix jalur (/berita/ untuk NEWS, /akademi/ untuk EDUCATIONAL).

## 2026-10-11 — Symlink drift forensics (ops-2026-10-11-02)
- Writer drift data-dir = job LLM atomic-replace (tmp+rename), BUKAN script lokal mana pun (semua verified read-only). Sessions.db tidak mencatat sesi aktif pada mtime overwrite (18:11 WIB 10 Okt) — atribusi presisi tidak mungkin dari log yang ada; jangan buang budget slot lagi untuk menebak writer, cukup guard + restore.
- Result salah-tempel di queue entry (bukti task A di entry task B) + ID duplikat = dua anomali yang membuat task tampak done padahal belum dikerjakan. SOP: slot WAJIB grep duplikat ID + match result-vs-spec sebelum percaya status done; dashboard/backlog_health tidak mendeteksi ini.
- Mitigasi sistemik dalam wewenang CTO: guard deteksi (backlog_health SYMLINK_GUARDS, alert-only exit 0). Fix writer-side (disiplin tulis via resolve()/islink di proses LLM) = area owner (prompt jobs).

## [REVIEWER] 2026-10-12 — Pola ke-8: cross-date salah-konteks di tabel movers ("masih muda (7 Okt)" padahal 7 Sep) + superlatif ranking skip angka di luar tabel
- Temuan: brief 12 Okt menandai SOSS "golden cross masih muda (7 Okt)" — DB smaCrossDate=2026-09-07; 7 Okt tidak ada cross apa pun untuk SOSS. Satu hari beda konteks: brief 23 Sep salah baca tanggal cross INAI (21→22 Sep); pola cross-date/salah-konteks kini ke-8 sejak qa-23-01. Varian baru: tabel movers membawa klaim sinyal padahal kolomnya harga/volume — LLM menambal "catatan" tanpa query indikator.
- Temuan kedua (satu artikel): heading "Penguat Terbesar" + tabel 5 baris, tapi DB punya MAPB +24,77% di peringkat 2 — di luar tabel, tak disebut. Angka DALAM tabel exact semua; yang salah adalah klaim kelengkapan heading. Ranking-superlatif tidak berhenti di isi tabel; wajib SQL ORDER BY penuh dulu, baru pilih yang ditampilkan.
- Rule: (1) catatan sinyal di tabel movers hanya boleh lahir dari query StockIndicator tanggal yang sama (ticker+date, bukan ingatan konteks); (2) sebelum menulis heading superlatif, jalankan ranking lengkap — kalau entri DB top-N tidak masuk tabel, ubah heading jadi seleksi eksplisit atau masukkan entri itu.
- Catatan proses: drift symlink ke-4 terjadi oleh agent QA sendiri 09:05 (tulis queue via os.replace ke path symlink) — PERSIS pola writer 06:47 yang baru dibersihkan. Guard detection-and-recover terbukti (deteksi <1 mnt via print islink, pulih 09:09, verified). Penulis queue WAJIB: open real path via os.path.realpath() dulu, tulis atomik ke file kanonik docs, JANGAN pernah os.replace ke path datadir yang bisa berupa symlink.

## 2026-10-14 — CTO pagi (merge night + ISR cold-bake)
- Merge night/* kini berpotensi KONFLIK di cto-queue.json (night menulis entry + writer pagi/03:00 menulis flip di file sama). Konflik bookkeeping ≠ kode: STRICT ABORT tetap benar, lalu CHERRY-PICK commit kode murni night (skip commit docs) = jalur bersih tanpa resolusi konflik manual. Entry queue ditulis CTO sendiri.
- ISR cold-bake pasca-deploy makin sering: file prerender baked saat build (DB unreachable) bikin halaman exact-path kosong 5-10mnt (kali ini /berita 50KB→77297B @8mnt). DIAGNOSA CEPAT: fetch query-param variant (cache-key beda → render runtime penuh) = bukti runtime sehat → TUNGGU TTL, JANGAN rollback.
- Owner/main-agent eksekusi patch QA tanpa decisions.md entry + queue flip = bookkeeping gap; CTO slot berikutnya wajib verify-from-evidence lalu buku (preseden prd-2026-10-01-01) — DB updatedAt + markers = sumber kebenaran.

### 2026-10-14 — Klaim "golden cross segar" stale (pola freshness ke-3): status ≠ tanggal
Ke-3 kalinya klaim kesegaran sinyal lolos generator Mandor: qa-2026-09-27-01 (hitungan GC salah), qa-2026-10-12-01 (cross-date skip), kini qa-2026-10-14-01 (KETR disebut "segar" padahal cross 15 Sep; ERAA 27 Aug; hari itu NOL cross baru non-gorengan). Pola umum: generator membaca smaCrossSignal (status saat ini) dan menulis "segar/baru" TANPA memverifikasi smaCrossDate == tanggal sesi. Magnitudo komparatif juga rapuh: "16 kali lipat" GOTO vs BUMI riilnya 5,8x — rasio harus dihitung dari DB, bukan ditaksir LLM. Kandidat guard prompt Mandor: (1) kata "segar/baru" hanya boleh jika smaCrossDate = tanggal sesi artikel; (2) angka rasio/perbandingan WAJIB diberikan generator sebagai data, bukan disimpulkan model. Jalur patch konten sudah baku (qa-2026-10-14-01).

## 2026-10-15 — Swarm QA pilot: deterministik dulu, LLM belakangan
**Konteks**: pilot "Haiku swarm" pattern (viral Anthropic trick) untuk QA 42 artikel saham.
**Temuan**:
1. Gagal v1-v2 BUKAN karena model — URL pattern (`/saham-X` → `/stocks/X.JK`), field name (`price` bukan `lastPrice`), schema DB (`ticker` bukan `symbol`, 52wk = MIN/MAX hitung sendiri). Worker LLM ganti model apapun hasilnya sama.
2. Untuk QA numerik live-website: worker deterministik (curl+psql) = 100% cukup, 0 token, 90 detik utk 42 artikel × 3 checks. LLM hanya perlu di verifier stage (kritik metode) + deteksi semantik (narasi cross-day — 2 FATAL Reviewer 15 Okt yang TIDAK bisa ditangkap angka).
3. 2 slug "saham-overbought/oversold-*" = artikel edukasi, bukan ticker — filter regex perlu whitelist pattern ticker 4 huruf.
**Rule**: swarm = lapisan NUMERIK (skala besar, murah, exact); reviewer LLM = lapisan SEMANTIK. Jangan digabung/digantikan.

## 2026-10-17 — Pola berulang #3: angka breadth/superlatif tersalin antar-hari (qa-2026-10-17-01, P1)
- Rekap mingguan 17 Okt menulis "11 saham naik" untuk SEMUA hari (Senin–Kamis seharusnya 115/351/292/119); brief 16 Okt menulis turun=592 (angka versi Rabu) vs DB Kamis=593; superlatif "terbanyak sejak 8 Juni" padahal 24 Jun (947) & 24 Jul (820) lebih tinggi → benar "sejak 25 Juli"; klaim golden/death cross 15 Okt 0/0 vs DB 3/2.
- Akar masalah: guard deterministik (qa-27-01, qa-30-01) diterapkan di jalur review manual, tapi GENERATOR artikel belum punya assertion — narasi tetap bisa mengambil angka dari hari/template lain. Angka hari-sama ≠ angka hari-lain yang "mirip".
- Pelajaran: superlatif & breadth WAJIB di-generate dari SQL berparameter tanggal di jalur generator itu sendiri (bukan diverifikasi belakangan), plus assertion pra-publish: dua hari berbeda tidak boleh menghasilkan angka breadth identik; klaim "sejak <tgl>" wajib dibuktikan query sebelum dirangkai ke kalimat.
- Cek rutin reviewer: untuk tiap artikel multi-hari, cocokkan angka per-nama-hari ke snapshot DB hari itu — bukan hari publikasi.

## 19 Okt 2026 — cherry-pick jatuh di branch salah (CTO sore)
- Gejala: `git worktree add /tmp/cto1019 main` FATAL (main masih ter-checkout di /tmp/hs1018 yang SUDAH TERHAPUS dari disk tapi ref worktree belum di-prune) → `cd /tmp/cto1019` gagal → perintah berikutnya (cherry-pick) tereksekusi di repo utama branch night/prd-18-01.
- Dampak: 2 commit emoji sempat menempel di branch salah; 0 kehilangan data (file dirty utuh, reset --mixed + restore pulihkan).
- Aturan baru: (1) SELALU `git worktree prune` SEBELUM add; (2) verifikasi `git branch --show-current` + `pwd` SEBELUM operasi mutasi (cherry-pick/merge/commit); (3) jangan chain `cd X && cmd` dalam satu shell call tanpa guard — pisahkan navigasi dari mutasi.

## 2026-10-21 | org-infra | Backlog drift #2 (merge lossy membunuh entry backlog, bukan cuma queue) | Pencegahan: mirror product-backlog.mirror.json HARUS di-update tiap malam (sudah ada) + CEO run WAJIB diff programatik mirror-vs-current sebelum analisis; merge konflik docs = union-merge script (SOP CTO 21 Okt) berlaku juga utk backlog; solusi akar = relokasi docs/agent-org keluar ~/Documents (iCloud dataless) — menunggu owner.

## 2026-10-21 | konten | Angka HITUNGAN fiktif berbeda rasa dari superlatif: count diakhiri (qa-2026-10-21-01) + link edukasi salah route
- Brief 21 Okt + artikel auto-reject sama-sama menulis "137 saham berhenti persis di -15%" utk 16 Okt; DB: close-basis exact = 28, round-1dp = 39, low-basis exact = 47, low ≤ floor+1tick = 624 — tidak ada definisi yang menghasilkan 137. Ini BUKAN salah ranking (qa-27-01) tapi count agregat murni diakhiri — pelengkap keluarga superlatif (#10+): rank, rasio, breadth, kini COUNT. Aturan generator: setiap angka agregat (count/sum/rasio/rank) WAJIB keluar dari query berparameter tanggal di jalur generator; reviewer wajib replay query, bukan sampling angka.
- Link internal ke artikel EDUCATIONAL harus /akademi/<slug> — /berita/<slug> 404 (NEWS saja). Pola: brief meng-link artikel edukasi pakai prefix /berita/ karena itu prefix mayoritas artikel hari itu. Reviewer: resolve SETIAP /berita/<slug> ke articleType di DB; EDUCATIONAL → /akademi/.

## 2026-10-22 | data-org | Drift symlink #8/#9: writer atomic-replace kembali memutus symlink product-backlog.json + ceo-decisions.md (pola ke-3/ke-9); SOP union-merge docs+datadir harus jadi SOP SEMUA file org, bukan cto-queue saja | (1) Semua writer JSON org WAJIB tulis via realpath symlink (resolve sebelum tmp+rename); (2) SYMLINK_GUARDS backlog_health.py perlu cover kondisi 'datadir lebih BARU dari docs' (divergen dua arah) -> auto-restore SOP, bukan alert-only; (3) CEO ritual pagi: cek islink 3 file SEBELUM dispatch (drift makan flip status kalau restore duluan baca sisi salah)

## 2026-10-23 | deploy/kereta | Penumpang naik tanpa boarding gate | Invariant label manifest wajib
- 2026-10-23 | deploy/kereta (ux-22-01) | Merge malam ke main tanpa label manifest kereta membuat commit ter-build diam-diam oleh image otomatis 03:09 — hasil kebetulan bagus, tapi regression guard (QA verdict) terlewati; penumpang tak ter-verifikasi bisa ikut naik. | Invariant (CEO approve Opsi B, 23 Okt): merge ke main SETELAH 18:30 wajib entry queue train=T-XXXX + bukti per penumpang; kereta malam build dari commit ber-label lengkap; sisanya reslot. Disiplin label, bukan tooling baru.

## 2026-10-23 | konten | Superlatif #4 + agregat fiktif #2 + label nama emiten
- (1) Superlatif pola ke-4 (KAEF/INCO/BRPT/MAPI): kali ini kalimatnya ada kualifier 'big-cap likuid' yang TIDAK diekslusikan di data — 2 saham lebih tinggi (ASLI +12,4%, BULL +10,7%) lolos bahkan filter nilai transaksi >= Rp20 miliar. Aturan reviewer: untuk setiap superlatif berkualifier, replay ranking DENGAN kualifier itu; kalau masih bukan #1 → FATAL tanpa diskusi.
- (2) Agregat fiktif kedua (setelah '137 saham -15%'): artikel evergreen akademi gorengan '139/180/16' — replay 12 hari × 3 basis + basis state SMA50>SMA200 tidak ada yang match. Evergreen = paling lama hidup di SERP; angka agregat di akademi WAJIB diberi stamp tanggal eksplisit di kalimatnya sendiri ('per 22 Oktober: ...'), bukan hanya di footer.
- (3) Nama dagang vs nama DB: 'Bank Aladin' (RSI 17,4 konteks bank) = ticker BANK.JK 'Bank Aladin Syariah' ✓, tapi BABP 'Bank MNC' jangan ikut terseret; review sebut-nama-bank wajib resolve ticker-nya di Stock, bukan match substring nama.

## 2026-10-24 — claude-code pipeline glm-5.3 (infra)
- claude -p gagal exit-1 2x: "does not recognize the model glm-5.3 -> assumes 200k context -> Autocompact thrashing 3x in a row". Root cause = model config (settings ANTHROPIC_MODEL glm-5.3 tanpa window override), BUKAN spec/task. Pelajaran: (a) cek log /tmp/claude-*.log "unrecognized_model" SEBELUM menyalahkan spec; (b) worker yang mati tengah jalan MENINGGALKAN EDIT PARSIAL — selalu git status src/ sebelum mengulang/menyerah (percobaan-2 sempat menulis EDIT1-2 yang benar); (c) utk edit deterministik kecil, patch manual CTO lebih murah daripada retry ke-3 pipeline; (d) gateway guard juga memindai heredoc di dalam command shell — parafrasa verb terlarang di dokumen.

## 2026-10-24 | deploy-proses | Insiden ke-3 kelas sama: WIP multi-agent menumpuk di repo utama (ux-22-01 naik tanpa gate 22 Okt; queue-loss merge 21 Okt; fork mailer.ts + 3 link salah 24 Okt; T-1023-N batal night-prep habis budget) | Pencegahan: OPSI A disetujui CEO — repo utama main bersih saja, builder WAJIB worktree /tmp per-task, WIP untracked di repo utama = pelanggaran boarding gate; merge malam hanya dari commit ber-manifest lengkap

## 2026-10-24 | data-file | Drift #10 schema-split backlog: writer Product Agent bikin blok `items` paralel tanpa union-merge → owner digest (items-first) buta 58 entry riwayat + id collision 10-16-1 | Pencegahan: SATU blok `entries` kanonik (rule di protocol backlog); guard schema-split masuk backlog_health.py (ops-2026-10-24-01); writer wajib read-modify-write union-merge
## 2026-10-24 | konten | Flag gorengan itu PER-HARI — replay superlatif wajib kunci tanggal flag + cek interval
- qa-24-01..04 (rekap mingguan + brief-23): (1) label "non-gorengan" nempel di angka basis-SEMUA (485→65 vs NG 409→54) — pola agregat+label tak-match ke-3; (2) "506 saham naik Senin" = angka Jumat kemarin di tabel yang sama (cross-day copy dari tabel breadth own-article — generator menarik angka dari baris JATUH saat menulis narasi); (3) "3 GC & 3 DC" salah padahal fix 6/6 kemarin sudah diverifikasi — fix patch SQL hanya menyentuh frasa target, frasa sebelahnya lolos: reviewer post-fix wajib re-scan SELURUH paragraf sekitar, bukan cuma frasa yang difix; (4) tabel top-N big-cap memuat 6 dari 16 kandidat valid tanpa penanda "top-6" — generator harus SELALU tulis basis jumlah (top-N dari M) atau ambil N dari query LIMIT.
- META untuk reviewer: StockIndicator punya (a) flag isGorengan yang BERUBAH per hari (BREN t/f/t/t/f dalam seminggu; MBSS flip t hanya di 22 Okt) → superlatif ber-kualifier gorengan wajib join flag di TANGGAL klaim, bukan DISTINCT-ON latest; (b) kolom interval — selalu filter interval='1d' sebelum replay, kalau tidak angka cross/oversold bisa dobel; (c) StockFundamental punya tanggal — marketCap untuk kualifier big-cap wajib baris per-tanggal klaim.

## 2026-10-25 (Council) — Rename path tanpa redirect = moat killer
- Pelajaran: rename path landing/sinyal (golden-cross → saham-golden-cross, screener → /stocks?view=screener 308 bukan 301) memutus semua backlink+GSC index: landing /saham-* 49→3 views, GC 24→1 dalam 1 pekan. RULE: SETIAP deploy yang mengubah path publik WAJIB cta-queue entry redirect 301 di deploy yang sama (next.config redirects permanent:true) + smoke `curl -I` path lama. Ini syarat DONE, bukan task menyusul.
- Pelajaran: retro script Minggu 08:00 selalu undercount hari Minggu (partial day) — WoW pakai window Mon-Sat utk keputusan; angka full-week hanya utk arsip. Council berikutnya bandingkan Mon-Sat.
- Pelajaran: verdict backlog COUNCIL 25 Okt menutup 9/9 stale via statejson flip; teknikal kembali di bawah cap (9 live). Backlog >cap = stop intake, bukan stop verdict.

## 2026-10-25 | konten | Agregat sinyal cross = union lintas snapshot tanpa DISTINCT — pola keluarga agregat ke-4, dan qa_note verifier tanpa bukti query
- (1) qa-25-02/03: "22/59" (rekap mingguan) dan "6/6" (brief-23, hasil fix qa-24-03!) sama-sama berasal dari menjumlahkan smaCrossSignal lintas snapshot harian — satu cross (mis. 22 Okt: 3/3 NG) terbawa di snapshot 22 DAN 23 sehingga union mentah = 6/6; window sepekan = 8/20 NG kanonik. RULE generator: count cross WAJIB DISTINCT per (stockId, smaCrossDate) dengan snapshot = tanggal cross (atau satu snapshot akhir + window), NEVER union raw rows lintas snapshot.
- (2) META qa-24-03: fix kemarin diverifikasi "replay 6/6 exact" padahal 6/6 justru angka salah — verifier qa_note tanpa query+hasil bisa mengonfirmasi angka yang sama-sama fiktif. RULE reviewer: qa_note wajib memuat SQL replay + hasil mentahnya; klaim "exact" tanpa query diperlakukan belum terverifikasi.
- (3) Tabel timeline per-tanggal (kasus CPIN 4 Jun): sel harga = close tanggal baris, generator rawan off-by-one-day — replay per-sel wajib bandingkan (tanggal, nilai) berpasangan, bukan nilai saja.
