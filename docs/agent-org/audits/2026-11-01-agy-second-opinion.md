# Second Opinion: Diagnosis Agent-Org teknikal.id

**Tanggal:** 1 November 2026  
**Peran:** Senior Engineering Management Consultant  
**Subjek:** Evaluasi Kualitas Antrean CTO, Defect Rate, dan Arsitektur Agent

---

## 1. Spiral Bug-Fix vs Normal Scaling: Interpretasi Data

Klaim bahwa lonjakan ini adalah "fase normal scaling" **keliru secara fundamental**. Data menunjukkan org ini sedang terjebak dalam **Self-Inflicted Firefighting Spiral (Doom Loop)**.

* **Divergensi Throughput vs Defect:** Volume task melesat 4.5x dalam 5 minggu (W39: 12 task → W44: 54 task). Namun, dekomposisinya membuktikan patologi serius:
  * Kapasitas pembuatan fitur baru praktis stagnan: W39 menghasilkan 11 fitur, W42 menghasilkan 21 fitur, dan W44 hanya 27 fitur (hanya naik 2.45x).
  * Beban bug meledak 27x lipat: dari ~1 bug di W39 menjadi 27 bug di W43 (55%) dan 27 bug di W44 (50%).
* **Rasio 1:1 (Perpetual Motion of Rework):** Di W44, setiap 1 fitur yang dirilis langsung melahirkan 1 bug tiket baru (27 fitur vs 27 bug). Separuh dari seluruh komputasi dan context window agent dihabiskan hanya untuk membersihkan sampah dari deploy hari sebelumnya.
* **Korelasi Pivot 23 Oktober:** Lonjakan drastis terjadi tepat di W43 (49 task) dan W44 (54 task) pasca penutupan hivePOS dan pivot agresif mengejar KPI traffic (-4.6% MoM). Tekanan output memaksa throughput Builder dinaikkan secara artifisial, membanjiri antrean CTO dengan output setengah matang.

Ini bukan scaling; ini adalah pabrik yang mempercepat ban berjalan tanpa kontrol kualitas, sehingga separuh pekerja di hilir bekerja membuang produk cacat.

---

## 2. Ranking Akar Masalah (Kapasitas 50% untuk Bugfix)

Berikut adalah ranking diagnosis berdasarkan bukti operasional sistem:

### Peringkat 1: (a) QA Gate Bocor (Ketiadaan Verification Gate Deterministik)
* **Alasan:** Fakta bahwa QA berstatus "ad-hoc, bukan permanen" adalah penyebab utama lolosnya cacat fatal ke produksi.
* **Bukti Nyata:** Bug seperti salah angka rekap (485 jadi 65), teks halusinasi LLM ("BBRI+BBCA top" padahal data cuma BBCA), dan analytics UTM ter-strip bukanlah bug logika rumit, melainkan kegagalan dasar validasi data dan schema integrity. LLM Builder yang memeriksa kodenya sendiri menderita *confirmation bias*; tanpa gate deterministik, produksi menjadi tempat testing.

### Peringkat 2: (c) Deploy Terlalu Cepat Tanpa Soak Time
* **Alasan:** Siklus harian (PRD 08:30 → Builder siang → Deploy malam) memberi waktu penyerapan (soak time) sebesar **nol jam**.
* **Bukti Nyata:** Kasus *foreign flow sync* diblokir Cloudflare dan *error boundary* meledak di client terjadi karena kode baru langsung terekspos ke live traffic tanpa dry-run pada siklus data IDX berikutnya. Tidak ada staging buffer untuk memverifikasi apakah cron batch malam berjalan mulus.

### Peringkat 3: (d) Debt Akumulasi (Infrastruktur & Pipeline)
* **Alasan:** Sistem berjalan di *single Mac mini* dengan tumpukan Next.js + Go + Postgres di balik Cloudflare.
* **Bukti Nyata:** Batasan arsitektural (misal WAF Cloudflare mencekik scraping, resource contention cron vs web server) mulai memperlihatkan kerapuhan saat volume cron dinaikkan 4.5x. Namun ini ada di peringkat 3 karena mayoritas bug W43-W44 adalah regresi fungsional langsung dari task baru, bukan keusangan kode warisan.

### Peringkat 4: (b) Scope Creep per Task
* **Alasan:** Bukan kontributor dominan terhadap 50% bug.
* **Bukti Nyata:** Task yang dikerjakan relatif terisolasi (tooltip istilah, rekap mingguan, fix utm). Masalahnya bukan task mengerjakan terlalu banyak hal, melainkan task kecil dikerjakan secara serampangan tanpa *acceptance criteria* yang ketat.

---

## 3. Efektivitas Penambahan Agent QA vs Intervensi Fundamental

Menambah Agent QA Specialist berbasis LLM saat ini adalah **langkah reaktif yang keliru** jika dilakukan sebelum memperbaiki pondasi.

### Kapan Agent Baru TIDAK Menolong:
1. **Verifikasi Halusinasi dengan Halusinasi:** Agent QA berbasis LLM prompt tidak dapat menjamin integritas data numerik (misal mendeteksi anomali 485 vs 65) tanpa test harness berbasis kode. LLM cenderung melewatkan subtle data bug saat membaca diff.
2. **Menambah Overhead Antrean:** Menambah satu hop agent (PRD → CTO → Builder → QA → Deploy) hanya memperpanjang latency, menambah biaya token, dan menambah titik kegagalan integrasi cron.
3. **Bottleneck Lingkungan Nyata:** Agent LLM tidak bisa memvalidasi apakah Cloudflare memblokir worker di Mac mini tanpa integrasi testing nyata di level runtime.

### Intervensi Fundamental yang Wajib Dilakukan Terlebih Dahulu:
1. **Hard WIP Limit pada CTO Queue:** Batasi antrean harian maksimal 4-5 task selesai per hari (maksimal 20-25 task/minggu, potong separuh dari 54 task W44). Paksa pipeline melambat agar kualitas pulih.
2. **Definisi "Done" (DoD) Wajib Test Assertion:** Builder dilarang menandai task selesai tanpa menyertakan unit test / snapshot test untuk parsing data dan schema validation.
3. **Decouple Build dari Deploy (24-Hour Staging Soak):** Hentikan kebiasaan "deploy malam setiap hari". Fitur non-kritis harus menginap minimal 1 siklus market IDX di staging sebelum promosi ke production.

---

## 4. Desain Konkret 3 KPI untuk Agent QA Specialist

Jika Agent QA tetap diimplementasikan, agent tersebut harus bertindak sebagai **Deterministic CI/CD Gatekeeper** (menjalankan assertions, end-to-end headless browser, dan contract validation), bukan sekadar pembaca prompt.

Evaluasi kelayakan ekonominya menggunakan 3 KPI berikut:

| No | KPI | Baseline Saat Ini | Target 3 Minggu | Formula / Bukti Finansial |
|---|---|---|---|---|
| 1 | **Defect Escape Rate (DER)** | ~100% bug lolos ke prod (27 bug/minggu di W44) | **< 10%** bug lolos ke prod | `(Bug Prod / Total Bug Tertangkap) * 100`. QA menangkap minimal 90% error data & UI sebelum merge. |
| 2 | **CTO Queue Bug Ratio** | 50% - 55% kapasitas (27 tiket/minggu) | **< 15%** kapasitas (maks 3-5 tiket/minggu) | Menghemat 20+ siklus Builder & CTO per minggu; menghentikan pemborosan token untuk rework. |
| 3 | **Data & Analytics Integrity Rate** | Sering jebol (rekap salah, UTM ter-strip) | **100% Zero-Tolerance** | Lolos verifikasi schema otomatis: 0 artikel dengan data mislabel, 0 link tanpa UTM valid. |

---

## 5. Kesalahan Klasik yang Harus Dihindari Bulan Depan

Target traffic MoM +5..15% pasca baseline Oktober (-4.6%) di tengah maintenance tinggi memicu jebakan klasik organisasi kecil:

1. **"Feature Flurry" Trap (Menyamakan Output dengan Hasil Growth):**
   * *Kesalahan:* Memompa puluhan fitur mini dan artikel kosmetik (54 task/minggu) dengan harapan traffic naik otomatis.
   * *Bahaya:* Traffic IDX -4.6% tidak akan disembuhkan oleh tooltip istilah saham. Konsentrasi terpecah, sementara produk inti tidak stabil.
2. **Membakar Kredibilitas Finansial (Data Trust Destruction):**
   * *Kesalahan:* Merilis artikel analisis saham dengan data cacat (oversold 485 jadi 65, menyebut BBRI padahal data cuma BBCA).
   * *Bahaya:* Di ranah finansial, integritas data adalah produk itu sendiri. Pengguna yang menemukan angka keliru akan kehilangan kepercayaan permanen; *bounce rate* naik dan retensi hancur.
3. **"Flying Blind" karena Instrumentasi Rusak:**
   * *Kesalahan:* Mengabaikan bug tracking analytics (seperti UTM ter-strip) demi mengejar perilisan fitur.
   * *Bahaya:* teknikal.id tidak akan bisa mengidentifikasi kanal akuisisi mana yang mendatangkan growth +5..15%, berisiko membakar waktu untuk kanal yang mati.
4. **Memaksa Hardware & Network Mac Mini Melampaui Batas:**
   * *Kesalahan:* Menumpuk beban cron agent dan traffic scraping bersamaan tanpa circuit breaker saat Cloudflare mulai memblokir request.
   * *Bahaya:* Single point of failure runtuh, memicu downtime total saat jam market aktif.

---

## VERDICT
1. **Spiral bug-fix atau normal?** Spiral bug-fix (bukan normal scaling; 50% kapasitas terbakar rasio 1:1 bug-ke-fitur akibat akselerasi output tak terkontrol).
2. **Agent QA: yes/no/dengan syarat?** DENGAN SYARAT (hanya jika berupa deterministic test harness berbasis code & schema assertion; tolak jika sekadar LLM prompt review).
3. **Satu intervensi paling urgent?** Terapkan hard WIP limit antrean CTO (maks 20 task/minggu) dan decouple deploy harian dengan soak time staging 24 jam.
4. **Akar masalah utama:** QA gate bocor (ketiadaan data assertion) menempati peringkat #1 sebelum deploy tanpa soak dan debt Mac mini.
5. **Mandat growth:** Hentikan feature flurry; amankan kepercayaan data saham IDX (zero error angka) dan pulihkan tracking UTM analytics.
