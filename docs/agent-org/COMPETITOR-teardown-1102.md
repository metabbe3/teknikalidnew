# COMPETITOR TEARDOWN — TeknikalAgent vs Pasar AI/Sinyal Saham IDX
**Tanggal:** 2 November 2026 · **Metode:** browsing langsung ke landing page, halaman harga, terms, dan docs tiap kompetitor (read-only). Semua angka dibaca dari halaman live tanggal ini.

---

## 1. INVEZGO (invezgo.com) — Kompetitor Langsung Terdekat

**Posisi:** "AI untuk Saham Indonesia" — platform web+mobile (Android/iOS) dengan bandarmologi, screener, Live Alert, AI Chat, tape reading. Rilis ~Sep 2026. Klaim 1.000+ investor, 900+ saham, testimoni diambil dari Instagram. Grub publik TG @invezgo hanya **245 member** (patokan adopsi awal).

### 1a. Harga Pasti (dibaca dari invezgo.com/id, 2 Nov 2026)

| Paket | Harga Normal | Harga Promo (diskon) | Per bulan | Isi |
|---|---|---|---|---|
| Trial | — | **Gratis 3 hari** | — | Semua alat: AI Chat, Analisa AI, alat analisa, watchlist & jurnal, 2 formula Live Alert, tape reading, integrasi AI |
| Starter | Rp57.000 | **Rp39.900** (-30%) | /bulan | Alat analisa saham, watchlist & jurnal, keuntungan membership. **Tanpa AI Chat** |
| Basic | Rp133.000 | **Rp79.900** (-40%) | /bulan | Starter + 7 formula Live Alert + tape reading. **Tanpa AI Chat** |
| Pro | Rp275.000 | **Rp149.900** (-45%) | /bulan | Basic + AI Chat + Analisa AI + 15 formula Live Alert |
| Ultra | Rp670.000 | **Rp299.900** (-55%) | /bulan | Pro + **Integrasi AI via CustomGPT/MCP** + 30 formula Live Alert |

**Fakta kunci:** Harga promo Invezgo (39,9 / 79,9 / 149,9 / 299,9 ribu) **nyaris identik dengan tier rencana TeknikalAgent** (79/149/299 ribu). Mereka sudah mengunci mental price point yang sama — kita tidak bisa menang lewat harga saja.
**Trial mereka 3 hari gratis** (vs kita Rp1.000/14 hari — kita lebih murah untuk coba, lebih panjang, dan meng-filter freeloader).

Pembayaran: QRIS, IDR. Bulanan/tahunan **tidak auto-renew** (per ToS) — churn-friendly bagi kita.

### 1b. Fitur Lengkap (cek: chat ✅ / brief ✅ / alert ✅ / PDF ❓ / screening ✅ / broker connect ❌)

- **AI Chat:** ✅ Ya, di web/app, ID+EN. Di belakangnya **64 tool read-only** (harga, chart, order book, broker flow, kepemilikan, laporan keuangan) — arsitektur agentic RAG-tool-calling.
- **Telegram AI Chat:** ✅ Ada (@invezgo_ai_bot), streaming realtime, **TAPI khusus paket Ultra (Rp299.900/bln)** — gated di tier termahal. Aktivasi manual: copy `UserID: ...` dari dashboard lalu kirim ke bot. Kuota pesan AI Chat dibagi antara web & TG (per pesan dihitung).
- **Brief harian watchlist:** ✅ "Laporan watchlist setiap hari" dikirim ke **WhatsApp atau Telegram** — format analisa watchlist, bukan brief pagi personal yang bisa dikonfigurasikan.
- **Alert:** ✅ Live Alert berbasis **formula/rumus** (variabel harga, running trade, order book, broker summary, KSEI, fundamental), dicek terus selama jam bursa, kirim IN/OUT ke Telegram. 2 formula gratis, 7/15/30 per tier.
- **PDF riset:** ❌ Tidak ada bukti fitur PDF/laporan riset siap unduh di landing & docs.
- **Screening:** ✅ Screener 900+ saham, rumus custom bisa disimpan.
- **Broker connect / eksekusi:** ❌ Tidak ada, dan eksplisit: "Invezgo bukan perusahaan sekuritas: Anda tidak bisa membeli atau menjual saham di sini."
- **Model AI:** "Invezgo Pro" — klaim **model yang di-fine-tune khusus pengetahuan pasar saham Indonesia**. Blog menyebut menggabungkan "model-model populer" + data BEI. Tidak ada nama model eksternal yang dijanjikan.
- **Lain:** bandarmologi (inventory chart, broker summary, foreign vs domestik), tape reading, kalkulator (ARA/ARB, profit, average down, compound, dividen, right issue), API + MCP + SDK untuk developer (ada paket Developer Elite), Program Mahasiswa & Referral.

### 1c. Framing Regulasi / Hedging

- Landing FAQ: "Apakah Invezgo memberikan rekomendasi beli atau jual?" → jawaban hedging (tidak mengarahkan transaksi).
- ToS: "provides facts and opinions but doesn't guarantee their accuracy or **offer financial advice**"; "for **informational and entertainment purposes only**"; "Invest at your own risk; losses can be substantial"; disclosure bahwa tim/content creator **boleh punya posisi** di saham yang dibahas.
- Docs AI Chat: "Jawaban AI bersifat informatif, **bukan nasihat keuangan**."
- Tidak ada klaim lisensi OJK/izin alas produk di landing. ToS: no refund setelah pembelian, bisa terminate akun termasuk alasan DMCA/plagiarisme.

### 1d. Kelemahan yang Terlihat dari Luar

1. **AI Chat di TG hanya untuk Ultra (Rp299rb)** — pengguna Rp39–150rb tidak dapat asisten chat. Celah besar: kita bisa kasih chat agentic di tier menengah.
2. **Kuota per-pesan** untuk AI Chat (web+TG dihitung sama) → pengalaman "takut bertanya", friction vs chat unlimited.
3. **Trial 3 hari gratis tanpa komitmen** → menarik freeloader, konversi lemah; tanpa kartu/commitment.
4. **Bukan sekuritas, tanpa broker connect** — sama seperti kita, tapi berarti tak ada moat eksekusi.
5. **Distribusi organik kecil:** grup TG resmi 245 member; testimoni "dikutip apa adanya dari Instagram" (kualitas sosial proof rendah); tidak terlihat aset SEO berarti (blog baru mulai Sep 2026). Kita punya 170 artikel + domain authority.
6. **Activation friction TG:** harus copy UserID manual dari dashboard → funnel aktivasi bocor vs deep-link 1-klik kita.
7. Tidak ada **PDF riset** dan tidak ada **sector radar** terstruktur di messaging; brief = analisa watchlist generik, bukan brief pagi personal.
8. Review publik independen masih sangat tipis (1 review LinkedIn positif, mwm.ai directory). Belum ada komplain massal — juga berarti belum ada love massal.

---

## 2. SinyalTrader + Pemain Lain (Harga & Model)

| Pemain | Harga (Rp) | Model / Fitur Inti | Kanal |
|---|---|---|---|
| **SinyalTrader** (sinyaltrader.com) | Halaman /harga = 404; **harga tidak dipublikasikan** — funnel ke CS "Kak Sitra" via WA. Free trial 1 bulan diklaim. | "Sitra AI" — engine kuantitatif: ConnorsRSI, VSA volume spike, MFI/OBV, filter anti-FCA, RR min 1:2; sinyal BUY+TP/SL + "94% AI confidence"; jurnal performa publik; disclaimer bukan nasihat investasi. Push WA & TG <1 detik. | WA + TG |
| **Sinyal Cerdas** (sinyalcerdas.com) | Free Rp0; **Pro Rp150rb/bln**; tahunan Rp1,5jt → promo Rp1jt (≈Rp83rb/bln). Checkout Lynk. | Sinyal AI 971 saham (free = sinyal jual saja; Pro = sinyal beli), portfolio tracker, history sinyal. | Web (+notifikasi) |
| **SGB VVIP** (sinyalsaham.id) | Starter Rp499rb→**promo Rp333rb**/bln; Pro 3 bln Rp1,599jt→**Rp666rb** (≈Rp222rb/bln); **Lifetime Rp2,999jt→Rp999rb** sekali bayar. Daftar via WA admin. Garansi refund 3 hari. | Channel TG VVIP: sinyal bot buy/TP/SL, brief pagi + trading plan, bandarmologi/smart money, AI screener breakout/volume spike, konsultasi 1-on-1 (tier atas). Komunitas. | TG + WA |
| **Signal Saham** (signalsaham.com) | **Tidak dipublikasikan** (SPA tanpa halaman harga; app wajib login; kontak admin WA). Klaim 1.200+ user ritel. | Analisis kuantitatif 30+ metode, 900+ emiten, backtest, klaim win rate >80% & profit 1–2%/hari (red flag klaim berlebihan). | Web + WA |
| **Trendra** (trendra.me) | Free Rp0; **Starter Rp19rb/bln** (atau Rp199rb/thn); **Pro Rp49rb/bln** (atau Rp499rb/thn). | Sinyal scalping/swing + TP/SL, Smart Scanner, Bandar Detector 50+ broker, Analisis AI (tier berbayar), trading academy. | Web + TG/email/SMS |
| **Bizsaham** (bizsaham.com) | Satu paket: normal Rp850rb → **promo Rp250rb / 12 bulan** sekali bayar. No refund. | **Mirror sinyal** dari grup premium pihak ketiga (bukan riset sendiri), bot 24/7, market review harian. | TG |
| **INDOSTOCK.AI** (indostock.ai) | Dasar gratis; Analis AI pakai **kredit** (20 gratis, top-up via Midtrans; harga/kredit tidak dipublikasikan). PT Griyanet (NIB tertera). | Screener, chart, analis AI per emiten, paper trading, alert TG (RSI/MACD/CHoCH/BOS), portfolio E2EE. | Web + TG alert |

**Pola pasar:** (a) semua pemain sinyal murni menjual "sinyal + TP/SL", bukan asisten riset; (b) harga eceran efektif pasar berkisar **Rp19rb–Rp333rb/bulan** dengan titik berat Rp49–150rb; (c) TG/WA adalah kanal default; (d) beberapa sembunyikan harga (funnel admin WA) — harga transparan adalah diferensiasi kepercayaan.

---

## 3. Evidence Willingness-to-Bayar Retail IDX (angka nyata)

| Produk | Harga Terverifikasi | Bukti Adopsi |
|---|---|---|
| **Stockbit Pro** (Chartbit/Screener/Keystats) | **Rp250rb/bln** (1 bln); Rp200rb/bln (6 bln); Rp150rb/bln (12 bln) — dikonfirmasi review independen + listing App Store; halaman resmi 403 saat dicek | #1 frekuensi transaksi dari 95 sekuritas (34 jt+ transaksi Jan–Jul 2025); komunitas 100rb+ user aktif |
| **RTI Business** (data real-time, berlangganan sejak Agu 2024) | **Rp120–150rb/bln** (2 sumber komunitas berbeda; halaman resmi tak dapat diakses) | App data andalan trader ritel sejak 2015; migrasi gratis→bayar 2024 diprotes tapi bertahan |
| **Bareksa** (individu) | Tanpa langganan; fee beli 0,1% / jual 0,2% | 1,1 jt+ akun investor terdaftar |
| **Bareksa data (institusi)** | Rp5–7,5jt/bln (bukan ritel — patokan harga data wholesale) | — |
| **SGB VVIP** | Rp333rb/bln promo (reg. Rp499rb) | Klaim "ribuan trader aktif" |
| **Ruang Saham** (komunitas) | **Rp475rb/bln**; Rp1,15jt/3bln; Rp2jt/6bln; Rp3,5jt/thn | Klaim 17rb member, 3.5rb+ alumni, 8rb+ portofolio ditangani (self-reported; DNS down saat dicek, harga dari indeks mesin pencari) |
| **WGTradingRoom Pro** | Rp700rb/3bln promo (reg. Rp1,2jt); paket hingga Rp6,9jt | Live 2 Nov 2026 |
| **Sailly Trading Hub (SAG)** | Rp600rb/bln | Batch Nov 2026 dibuka 17 Okt (pendaftaran periodik) |
| **GoInvest Trader's Room** | Rp100rb/bln via Lynk.id | — |
| **robo.invest** | Tidak terverifikasi (domain mati/DNS fail saat dicek) | — |

**Kesimpulan WTP:** retail IDX terbukti membayar **Rp100rb–475rb/bulan** untuk tool data (Stockbit Pro 250rb, RTI 120–150rb) dan komunitas (Ruang Saham 475rb, SGB 333rb). Harga TeknikalAgent 149–299rb berada tepat di band WTP terbukti. Titik Rp79rb bersaing langsung dengan Trendra Pro (49rb) & Sinyal Cerdas Pro (150rb) — posisi menengah sehat.

---

## 4. Lima Celah Diferensiasi TeknikalAgent (yang kompetitor TIDAK punya)

| # | Celah | Bukti Kompetitor Tidak Punya | Cara Kita Eksploitasi |
|---|---|---|---|
| 1 | **AI chat agentic di tier menengah (bukan hanya top-tier), unlimited-ish** | Invezgo meng-gate TG AI Chat di Ultra Rp299rb + kuota per-pesan; Sinyal Cerdas/Trendra tidak punya chat sama sekali; sinyal player lain one-way broadcast | Buka chat agentic sejak tier 79rb dengan fair-use; jadikan "asisten riset pribadi" bukan "sinyal broadcaster" |
| 2 | **Pipeline data 940 saham milik sendiri + foreign flow** (bukan reseller/scrape umum) | Invezgo 900+ saham tapi tanpa sektor radar & tanpa PDF; Bizsaham cuma mirror; Signal Saham klaim >80% win rate tanpa audit; tidak ada yang punya eval flywheel | Setiap jawaban chat disertai data house-own yang bisa diverifikasi di web → klaim kualitas yang bisa dibuktikan, bukan "94% confidence" tanpa bukti |
| 3 | **Flywheel eval (jawaban AI di-eval & dilatih ulang) + brief pagi PERSONAL** | Tidak ada kompetitor yang menampilkan mekanisme evaluasi/feedback loop; brief Invezgo = laporan watchlist generik; SGB = brief manual admin | Publikasikan eval score berkala (transparansi kinerja) — serang klaim "94% confidence"/"win rate >80%" yang tak teraudit |
| 4 | **SEO 170 artikel + 1-klik aktifasi dari web** | Invezgo blog baru lahir Sep 2026; grup TG mereka 245 member; aktivasi bot mereka manual copy UserID; tidak ada yang punya aset SEO | Setiap artikel = landing funnel dengan tombol "tanya AI ini langsung di TG" (deep-link) → CAC organik ~0 vs mereka bayar iklan IG |
| 5 | **Riset PDF + sector radar terstruktur + alert berita (bukan hanya formula harga)** | Invezgo alert = formula teknikal/kondisi; tidak ada riset PDF siap unduh; sector radar tidak ada di messaging siapa pun | PDF riset siap baca + sector radar pagi = konten yang bisa di-share viral (each PDF = marketing asset) |

**Positioning ringkas:** "Asisten riset pribadi (bukan grup sinyal pom-pom, bukan tool rumit) — data 940 saham sendiri, dievaluasi berkala, aktif 1-klik dari artikel yang sedang kamu baca."

---

## Sumber utama (live 2 Nov 2026)
- invezgo.com/id (landing, harga, FAQ, testimoni) · invezgo.com/id/terms (ToS) · docs.invezgo.com/integrations/telegram-ai-chat/ (gating Ultra, model fine-tuned, kuota)
- sinyaltrader.com (landing + /harga 404, disclaimer) · sinyalcerdas.com/pricing · sinyalsaham.id · signalsaham.com · trendra.me · bizsaham.com · indostock.ai
- Stockbit Pro: finansialku.com review + listing App Store (apptail.io) · RTI: primestockmarket.com · Bareksa: bareksa.com/id/member/langganan · ruangsaham.com/membership · wgtradingroom.pro · saillythub.id
