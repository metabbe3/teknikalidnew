# Roadmap teknikal.id — Berbasis Voice-of-User (9 Nov 2026)

Sumber: 679 review App Store + Google Play (AGY) + komentar YouTube + BrandList.
File riset: `docs/research/2026-11-09-voice-of-user-playstore.md`

---

## A. AUDIT: Yang SUDAH ADA (jangan dibuat ulang)

| Kebutuhan netizen | Status di teknikal.id | Catatan |
|---|---|---|
| Screener teknikal+fundamental | ✅ `/screener` + halaman strategi (uptrend, volume-spike, undervalued, value-growth) | sudah kuat |
| Indikator teknikal | ✅ 9 indikator (RSI, MACD, SMA, BB, volume) + panel terpisah | cukup |
| Preset indikator instan | ✅ sudah ada — preset "klasik/momentum/tren/bersih" dengan nama niat-user | bagus, tinggal diketahui orang |
| Chart ringan mobile | ✅ lightweight-charts + slim mobile (audit 9.481→9.330px) | keunggulan live |
| Sinyal objektif bebas pompom | ✅ Market Structure, Bottom Fishing, Trading Plan kalkulator, Track Record | USP ada |
| Kalender dividen | ✅ `/kalender-dividen` + `/saham-dividen` | data fresh via Scrapling |
| Aliran dana asing/bandar | ✅ `/aliran-dana-asing` per-saham + global | data H-day sejak Scrapling |
| Berita emiten | ✅ /berita + Daily Brief | ada |
| Watchlist | ✅ | ada |
| Price alert | ⚠️ parsial — smart alert via bot TG (cron), belum user-facing "pasang target harga sendiri" | GAP kecil |
| **Drawing tools (trendline/S&R tersimpan)** | ❌ TIDAK ADA | **GAP TERBESAR — keluhan #1 netizen** |
| Timeframe > 3mo + intraday | ❌ 1D–3mo saja | GAP |
| Template tersimpan per-user (login) | ❌ preset ada tapi tidak persist antar saham/sesi | GAP |
| Jurnal win-rate user | ❌ | GAP |

**Insight:** 6 dari 12 kebutuhan netizen SUDAH terjawab — masalahnya bukan produk, tapi **positioning**. Netizen tidak tahu bahwa "analisis yang tidak hilang + bebas pompom" itu ada di sini.

---

## B. ROADMAP (urut effort × dampak)

### 🥇 Sprint 1 (quick win, 1–2 minggu) — "Klaim yang sudah benar"
1. **Homepage repositioning** — angkat USP ke hero (lihat bagian D)
2. **Compare page** (`/compare` sudah ada) → sorot "bandingkan dua saham, bukan dua pom-pom"
3. **Timeframe 6mo/1Y/5Y** (data EOD kita sudah bertahun-tahun — murah)
4. **Price alert user-facing sederhana**: "ingatkan saya di harga X" via bot TG (link stock card → bot) — infra smart alert sudah ada

### 🥈 Sprint 2 (1 bulan) — "Fitur pembeda"
5. **Preset indikator PERSIST** (localStorage dulu, no-login) — preset + indikator pilihan user auto-terpakai di semua saham → langsung jawab keluhan #1 netizen (settingan hilang)
6. **Auto S/R line** di chart (garis support/resistance otomatis dari pivot algorithm — kita punya datanya)
7. Screener: tombol **"Duplikat & ubah"** (clone filter + simpan varian)

### 🥉 Sprint 3 (1–2 bulan) — "Moat"
8. **Draw-on-chart + cloud-save** (trendline horizontal/ray, Fib retracement) — anonymous: localStorage per saham; login: DB. Ini killer feature vs Stockbit/Ajaib
9. **Jurnal sederhana**: catat trading plan dari kalkulator → track record pribadi (win-rate)
10. **Halaman "Kenapa teknikal.id"** — tabel perbandingan vs sekuritas (chart tersimpan, bebas pompom, gratis)

---

## C. USP — Unique Selling Proposition

**USP inti (1 kalimat):**
> **Analisis saham yang tidak menghilang — bebas pompom, bebas nebak.**

Tiga pilar (semua sudah/akan dimiliki, jangan klaim yang belum):
1. **Anti-reset** — preset, garis analisis, dan rencana tradingmu tersimpan, bukan hilang tiap keluar app (vs keluhan #1 Stockbit/Ajaib)
2. **Anti-pompom** — sinyal objektif berbasis algoritma + track record terbuka, bukan cocoklogi stream
3. **Anti-nebak** — chart + 9 indikator + screener + trading plan kalkulator dalam satu tempat, gratis

**Alasan struktural (untuk about/press):** aplikasi sekuritas berat karena bawa beban transaksi (orderbook, RDN, JATS) — kami tidak, karena kami bukan sekuritas. Kami teman analisis untuk user sekuritas *mana pun*.

---

## D. TAGLINE (pilih satu, semua simple)

Kandidat shortlist (gaya owner "simple"):
1. **"Temanmu berinvestasi."** — pendek, hangat, dan langsung memposisikan produk sebagai *teman* (bukan sekuritas, bukan robot). Padanan: teman yang jujur ≠ pompomer.
2. **"Analisa saham tanpa nebak-nebak."** — sudah live di hero; kuat, khas, otentik
3. **"Sinyal objektif, bukan omongan pom-pom."** — tajam ke pain point #1 netizen
4. **"Analisismu, tersimpan."** — menembak keluhan drawing-hilang langsung
5. **"Chart yang mengerti kamu."** — lembut, preset otomatis

**Rekomendasi:** pakai dua lapis —
- **Tagline utama:** *"Temanmu berinvestasi."*
- **Sub-tagline (hero):** *"Chart profesional, sinyal objektif, bebas pompom — dan analisismu tidak pernah hilang."*

## E. METRIK SUKSES
- Sprint 1: bounce stock-page mobile <80% (dari 88%), CTA Tanya AI naik dari ~0
- Sprint 2: % sesi dengan preset dipakai >30%; alert terpasang >50 user
- Sprint 3: MAU retensi 30-hari; jurnal aktif >100 user
