# Audit: Bug vs Feature — Antrean Agent Org teknikal.id (W39–W44 2026)

**Tanggal audit:** 1 Nov 2026 · **Metode:** klasifikasi manual per-entry (bukan regex) judul+spec/deskripsi terhadap 268 entry dalam window 21 Sep–1 Nov 2026 (189/217 cto-queue.json terdatasi + 79/81 product-backlog.json; 4 PB tanpa tanggal & 28 CTO pre-W39 di luar window). Baseline regex kasar (W39 8% → W43-44 50-55% bug, volume 12→54 task/minggu) **divalidasi dengan koreksi**: regex overcount karena menyamakan task QA-fix konten (label `qa-`) dengan bugfix kode.

**Label klasifikasi:** bug-fix / feature / data-quality / ops-infra / refactor. Bug-fix = perilaku sistem salah yang harus dilakukan X tapi melakukan Y (regresi, logika terbalik, dead handler, crash). Task `qa-*` diklasifikasi **bug-fix hanya bila akarnya bug generator/sistem** (mis. worker image basi, double-count union, excerpt tak tersanitize); bila murni koreksi klaim konten LLM pasca-publish (angka/superlatif salah) → **data-quality**. Entry duplikat lintas-file (dispatch CTO vs mirror backlog atas task sama) dihitung **sekali** pada entry yang mengeksekusi.

---

## Tabel Mingguan

| Minggu | Total* | Bug-fix | Self-inflicted | Eksternal | Feature | Data-quality | Ops-infra | Refactor | Bug % (dari total) |
|---|---|---|---|---|---|---|---|---|---|
| W39 | 19 | 2 | 2 | 0 | 3 | 7 | 6 | 1 | 11% |
| W40 | 26 | 1 | 1 | 0 | 8 | 4 | 12 | 1 | 4% |
| W41 | 25 | 3 | 2 | 1 | 11 | 5 | 5 | 0 | 12% |
| W42 | 55 | 5 | 5 | 0 | 24 | 11 | 12 | 3 | 9% |
| W43 | 58 | 11 | 9 | 2 | 17 | 18 | 9 | 3 | 19% |
| W44 | 85 | 17 | 14 | 3 | 41 | 11 | 12 | 4 | 20% |
| **Σ** | **268** | **39** | **33** | **6** | **104** | **56** | **56** | **12** | **15% total; W44 20%** |

*Total = baris queue + backlog dalam window (dedup lintas-file; sebagian entry backlog adalah verdict/council atas task CTO yang sama).

**Koreksi vs baseline regex:** W39 sebenarnya 11% bug (bukan 8%), W44 sebenarnya ~20% (bukan 50-55%). Angka regex 50-55% lahir karena (1) menyandingkan numerator `qa-*`+`fix-*` dengan denominator task CTO saja, dan (2) menghitung task QA konten — yang secara teknis adalah pekerjaan koreksi data LLM (data-quality), bukan bug kode — sebagai "bug". Bila QA konten ikut dihitung kelompok "pemadam", W43+W44 memang didominasi api sendiri (lihat bawah), tapi sebagai % total tetap ~20-35%, bukan >50%.

### Bug self-inflicted vs eksternal (pertanyaan owner: "apakah kita hanya memadamkan api sendiri?")

| Kategori | n | Contoh |
|---|---|---|
| **SELF-INFLICTED** | **33/39 (85%)** | regresi/overwrite sesama agen (main divergen W43, symlink-drift kambuh #2/#7/#10, writer menimpa queue dari copy basi), deploy/build setengah jalan (worker image basi → marketCap stale, app OOM crash-loop, ISR cold-bake 50 mnt, EOD jam salah), logika salah kode baru (TICKER_RE tolak .JK, Simpan route ke register utk user login, tombol Hapus tanpa handler, ai-gate waiter leak, audit swallow error) |
| **EKSTERNAL** | **6/39 (15%)** | IDX block/EPERM TCC (idx-sync), Cloudflare block Foreign Flow (exit 2), sinkronisasi pihak-3 gagal (Yahoo v7 quote null 46x/24h, rclone gdrive token mati, z.ai kuota 429) |

**Jawaban: ya, 85% bug adalah api sendiri** — tapi bukan "hanya". 6 bug eksternal (IDX/CF/Yahoo/rclone/z.ai) dan mayoritas self-inflicted bukan regresi fitur lama, melainkan **bug lahir di jalur build/deploy/koordinasi org itu sendiri** (image tidak direbuild bareng, dua penulis menimpa satu file state, slot cron hantu). Pola "api sendiri" terbesar justru menunjukkan bahwa proses — bukan kualitas kode fitur — yang bocor.

---

## 10 Bug Terbesar Dampaknya (6 minggu terakhir)

1. **`cto-2026-10-19-01` — main divergen, deploy menimpa pekerjaan (W43, P1)**: deploy funnel 05:59 memakai origin yang tak memuat ticker-manager 03:08 → fitur hilang dari prod. Kerusakan koordinasi lintas-agen paling mahal; memicu doctrine single-writer.
2. **`sec-2026-10-19-01` / `sre-2026-10-21-01` — Docker daemon mati jam buka pasar (W43, P1)**: teknikal.id + hivepos.id 502 di Senin market-open; SPOF Docker Desktop. Insiden prod paling terlihat user; lahir watchdog + runbook.
3. **`sec-purge-2026-10-15` — session cookies IG/TikTok ter-commit publik di GitHub (W42, P0)**: kredensial nyata terekspos raw.githubusercontent; purge git history + rm-cached 220 file. Risiko keamanan tertinggi periode ini.
4. **`qa-2026-10-20-03` — worker fundamental marketCap stale 1 hari (W43, P1)**: marketCap 19 Okt dihitung dari close 16 Okt, **40 artikel template ikut salah** — bug data dengan blast radius konten terbesar; akar = campur sumber close.
5. **`bug-2026-10-30-01` — app OOM crash-loop 19:1x-19:2x, 502 ke user (W44, P1)**: user nyata menangkap 2x 502 saat pakai screener; window audit UX terganggu.
6. **`fix-2026-10-26-04` — ai-gate waiter timeout bocor slot concurrency (W44, P0)**: waiter tak dihapus dari queue → pool lama-lama 414/429 semua → seluruh fitur AI mati diam-diam. Bug arsitektur paling laten.
7. **`fix-2026-10-26-09` — rehype-raw tanpa sanitizer = stored-XSS P0 (W44)**: konten LLM (bisa prompt-inject dari RSS) dirender raw HTML di 4 permukaan publik. Ditutup 27 Okt (selftest 21-check).
8. **`qa-2026-09-24-01` + `cto-2026-10-21-01` — worker image basi dua era (W39/W43, P1)**: deploy sanitizer tak rebuild worker → 'lot'×3 kambuh; fix interval daily→1d hanya rebuild app → worker masih bawa bug. Kelas bug deploy yang sama kambuh 2x.
9. **`symlink-drift` family (`ops-2026-10-11-02`, `ops-2026-10-14-01`, `ops-2026-10-28-01`, `ops-2026-11-01-04`) — file state org ditimpa jadi regular file, 10 kali (W41–W44)**: writer melewati single-writer protocol; drift #10 bahkan oleh Researcher `os.replace` manual. Bukti sistemik: org membocorkan api pada dirinya sendiri paling sering lewat jalur ini.
10. **`qa-2026-10-26-01` — generator brief dua basis breadth dalam satu artikel (W44, P1)**: judul pakai basis incl-indeks, body eks-indeks — 507 vs 506 kontradiktif; fix di generator (bukan patch SQL), menandai pergeseran QA dari patch konten ke fix akar.

*(Honorable mention: `ux-2026-10-10-01` TICKER_RE tolak .JK — fitur retention baru langsung mati di hari kedua; `bug-2026-10-16-01` logika guest/login terbalik — user login diroute ke register.)*

---

## Pola Task QA yang Muncul Gara-gara Bug Lolos ke Prod

1. **Koreksi angka/superlatif konten LLM pasca-publish adalah kelas task QA terbesar (≥40 task `qa-*`/content-fix, W39–W44 terus-menerus).** Pola berulang: superlatif salah ranking ("terbesar/terdalam/terkuat" rank #6-#13 ditulis #1), breadth salah hari (angka Jumat dipakai Senin — cross-day copy), agregat tak ter-replikasi DB mana pun (angka "fiktif" 137/139/506), dua basis hitung dalam satu artikel. Semua lolos karena **generator publish tanpa replay SQL** dan (sampai W41) fact-check gate tidak dipanggil di jalur auto-publish — gate baru live 6 Okt (prd-2026-10-05-01) dan review-tooling Tolak baru ada 22 Okt.
2. **Bug yang sama kambuh karena fix tidak sampai ke image/worker yang menjalankannya**: 'lot'×3 (W39→W40, worker basi), stale marketCap (worker image 17 Okt), symlink drift (10×). QA di permukaan konten menutup gejala sementara deploy pipeline terus melahirkan ulang gejala — akar di build/kereta, bukan konten.
3. **Tooling QA sendiri menjadi sumber task QA baru** (meta-recursive): backlog_health alert-by-design dicatat error, run_ledger undercount, sre_brief false-positive (self-heal dihitung error), error-cluster collapse, reslot_guard slot hantu — ~10 task ops lahir untuk memperbaiki alat pemantau yang berisik. Alert fatigue dari tooling yang salah label menutupi error betulan.

---

## 3 Kesimpulan

1. **Rasio bug riil lebih rendah dari baseline regex, tapi tren naiknya nyata: W39–W42 rata-rata ~9% → W43–W44 ~20%.** Baseline 50-55% adalah artefak penghitungan (QA konten dihitung bug). Namun volume absolut bug naik 2→5→11→17 per minggu seiring volume task naik 12→85 — setiap kenaikan throughput membawa bug baru, dan W43-44 memang periode org "membayar utang" deploy pipeline & koordinasi multi-agen yang tertinggal dari kecepatan build fiturnya.
2. **Jawaban pertanyaan owner: 85% bug self-inflicted — tapi yang terbakar bukan sekadar "api sendiri", melainkan api ORG, bukan api produk.** Mayoritas bug besar lahir di jalur koordinasi (deploy menimpa main, dua writer satu file state, image tak direbuild bareng, slot cron hantu), bukan regresi logika fitur lama. Memperketat review kode fitur tidak akan memadamkan kelas api terbesar; yang akan memadamkan adalah single-writer statejson penuh, rebuild app+worker atomik, dan pre-deploy gate divergence main/origin.
3. **Kelas kerja terbesar yang terselubung adalah data-quality (56 task, 21%) — hampir semua QA konten LLM pasca-publish, dan ini 100% self-inflicted yang bisa dicegah di hulu.** Fact-check gate baru live 6 Okt dan masih bocor (jalur paralel `movement-analysis` tanpa guard baru ditutup 26 Okt; doctrine generator dual-basis baru 26 Okt). Menaikkan gate ke SEMUA jalur publish + replay-SQL assertion otomatis pra-publish berpotensi menghapus ~40 task QA — setara ~15% kapasitas kereta 6 minggu terakhir — yang saat ini dipakai memadamkan angka salah yang seharusnya tidak pernah tayang.
