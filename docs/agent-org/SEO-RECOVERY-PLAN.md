# SEO Recovery Plan — teknikal.id (3 Nov 2026)

Sumber: 3 subagent paralel (diagnosis GSC, audit teknis, quick-win keyword) + audit manual.
Konteks: impresi 3-bulan 6.120→856; klik 3-bulan cuma 5; sosmed +45%/bln jadi mesin traffic utama.

## Temuan Kunci

### 1. "Kolaps September" sebagian besar MIRAGE rolling-window
- Snapshot harian kita = window 3-bulan ROLLING. Drop 14→21 Sep mencerminkan **minggu sehat 15-21 Juni (~600 impr/hari) keluar dari window**, bukan event real-time.
- Penurunan riil justru **bertahap sejak Agustus**: klik mingguan 26→18→12→6→~0.
- BUKAN penalty/deindex: "idx radar" muncul pos 12 sejak 23 Sep (situs masih bisa ranking).
- Tidak ada core update Sept 2026 yang terkonfirmasi sumber resmi.

### 2. Masalah teknis nyata (diperbaiki murah)
| # | Temuan | Severity |
|---|---|---|
| T1 | sitemap-news.xml: 40/88 URL (45%) = redirect 308 ke /stocks (URL lama /berita/saham-*) | **P0** |
| T2 | lastmod mass-stamp: 84% URL bertanggal identik 2026-11-02 | P2 |
| T3 | 476 halaman programatik /saham/*/kenapa-naik-turun (37% sitemap) risiko thin-content | P1 |
| T4 | KONI/MPRO/STAR dll 200 tapi TIDAK ada di sitemap.xml; CKRA 404 (ticker invalid) | P1 |
| T5 | publication_date WIB dilabel "Z" (UTC) → tampak future-dated | P3 |
| T6 | http://www = 2 hop; 308 vs 301; 404 page canonical ke homepage | P3 |

### 3. Quick-win keyword (semua effort-S kecuali 3)
- **idx radar pos 12 → JACKPOT**: ranking datang dari /stocks (ada frasa "IDX Radar"); /idx-radar sendiri canonical ke /stocks. Perkuat sinyal = peluang halaman 1.
- Akar masalah cluster ticker (pos 61-92): H1 cuma kode ticker (tanpa "Harga Saham X Hari Ini"), bukan halaman tipis.
- Halaman brand/navigasi tak memuat frasa yang dicari: /indeks/smc-liquid tak pernah menulis "Composite", /community tak menulis "diskusi investasi".

## Rencana Eksekusi (3 gelombang)

### GELOMBANG 1 — Rapikan fondasi (1 sprint, semua effort-S)
1. **SEO-01 sitemap-news bersih**: buang 40 URL redirect; hanya URL 200 final. Filter di generator.
2. **SEO-02 idx radar**: keputusan strategi — /idx-radar jadi halaman kanonik sendiri (H1 "IDX Radar", masuk sitemap, internal link navbar) ATAU 301 permanen ke /stocks + perkuat H2. Target: pos 12 → halaman 1.
3. **SEO-03 sitemap ticker lengkap**: audit delta (halaman 200 vs sitemap) → tambah KONI/MPRO/STAR + lainnya; fix meta desc dobel "Perdana Bangun Pusaka (Perdana Bangun Pusaka)"; CKRA cek universe.
4. **SEO-04 lastmod jujur**: per-URL dari data riil (last price change / analisa update), hapus mass-stamp.

### GELOMBANG 2 — Template 940 halaman + kurasi (1-2 sprint)
5. **SEO-05 pilot template stock page** (BRIS dulu — pos 70,8 terbaik di cluster): H1 → "Harga Saham BRIS (Bank Syariah Indonesia) Hari Ini" + intro 1 paragraf exact-match. Verified → rollout 940 halaman.
6. **SEO-06 anchor internal link**: berita→stock link pakai anchor deskriptif ("harga saham KLBF hari ini"), bukan cuma "KLBF".
7. **SEO-07 kurasi 476 kenapa-naik/turun**: hanya ticker pergerakan signifikan + narasi unik; sisanya keluar sitemap + noindex.
8. **SEO-08 head term split**: /stocks = "daftar saham IDX"; /harga-saham-hari-ini = pulih jadi halaman kanonik sendiri (movers + FAQ).

### GELOMBANG 3 — Navigasi & brand (1 sprint)
9. **SEO-09**: smc-liquid title + "IDX SMC Composite"; /community + "diskusi investasi"; section "Grafik Saham Hari Ini" di /stocks.
10. **SEO-10 hygiene**: publication_date UTC benar; 301 permanen; www 1-hop; 404 page tanpa canonical ke home.

## Target & Pengukuran
- Baseline (3 Nov): impr 3-bln 856 · klik 5 · idx radar pos 12.
- 30 hari: idx radar halaman 1 (klik permanen +1-3/hari); ticker cluster pos 61-92 → 40-60; sitemap 100% URL 200.
- 60 hari: impresi 3-bln kembali >1.500; klik 3-bln >15.
- Cek mingguan via gsc-keyword-history.jsonl (snapshot harian sudah jalan).

## Non-goals
- Tidak kejar "eastspring idx esg" (intent reksa dana, off-core).
- Tidak beli backlink / apapun berbayar (fase monetisasi F1 = Rp0).
- Tidak buat halaman baru sebelum Gelombang 1-2 selesai (kualitas dulu, kuantitas kemudian).
