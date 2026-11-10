# INSIGHT FINAL: Simulasi UX 17 Agen + Voice-of-User 679 Review
**teknikal.id — 9 November 2026** · gabungan `2026-11-09-voice-of-user-playstore.md` + `2026-11-09-mirofish-ux-simulation-report.md`

> Simulasi MiroFish 17 agen (pemula, BSJP/swing trader, pompom, fitur produk sebagai agen) × 15 round, seed = audit fitur aktual + analytics riil (88% mobile, bounce 88%, FAB 21 klik/2.025 PV, Tanya AI 1 pertanyaan/30 hari) + riset 679 review.

---

## ✅ YANG SUDAH OKE (kedua sumber setuju)
1. **Chart ringan + preset 1-klik** (klasik/momentum/tren/bersih) — "ini oke" untuk pemula & swing
2. **Halaman strategi siap-pakai** (/saham-uptrend, volume-spike, undervalued…) — jawab "males nyetting filter"
3. **Kalkulator Trading Plan (R:R)** — paling oke; saran: jadikan hook "一键生成交易计划" di tiap stock page
4. **Kalender dividen + aliran asing** — data lengkap, pengalaman query OK
5. **Track record terbuka + bersih dari pompom** — aset trust yang kompetitor tidak punya
6. **Interface bersih, tanpa iklan grup sinyal** — alasan user kabur dari app sekuritas

## ❌ YANG KURANG (temuan konsisten simulasi = voice-of-user)
1. **Tidak ada onboarding** — pemula buka homepage, tidak tahu platform ini bisa apa, 2 layar langsung pergi (root bounce 88%)
2. **Stock page tidak punya KESIMPULAN CEPAT** — user datang bertanya "bisa beli nggak, stop loss di mana?" → harus baca chart sendiri → pergi. FAB Tanya AI terlalu kecil, artikel 0 klik karena di bawah
3. **Chart tidak menyimpan setting & garis** — keluar app = hilang (keluhan #1 netizen di Stockbit/Ajaib, TERULANG di teknikal.id)
4. **Tidak ada price alert di web** — fitur paling dicari netizen, tapi hanya ada di bot Telegram → tidak bisa jadi alasan register
5. **Screener tidak bisa simpan kustom** — netizen cari "custom screener", kita hanya punya preset strategi
6. **Paywall menjual jumlah perintah, bukan hasil** — "解锁命令数" tidak menarik; yang diinginkan = 提醒+信号+复盘

## 🎯 FITUR YANG DIBUTUHIN (urut prioritas konversi — simulasi menamai 3 trigger)
| # | Fitur | Efek prediksi |
|---|---|---|
| 1 | **Price alert terikat akun web** (pusatkan dari bot TG) | Trigger register #1 — anonim → member |
| 2 | **Chart state tersimpan** (preset + garis, localStorage → cloud) | Trigger retensi #1 — swing user bertahan |
| 3 | **"Kesimpulan cepat" di atas stock page** (tren naik/mTurun/Range + S/R) | Penurun bounce 88% — jawab "bisa beli?" |
| 4 | Onboarding 1 pertanyaan: "pemula / berpengalaman?" → rute beda | Penurun bounce homepage |
| 5 | Custom screener + simpan varian | Kebutuhan netizen berulang |
| 6 | Widget HP / PWA + reminder cum date dari watchlist | Kompetisi dgn app broker di homescreen |
| 7 | Reposition paywall: "Unlock 提醒 & sinyal & catatan hasil" bukan "lebih banyak perintah" | Konversi paid |

## 💰 Temuan monetisasi paling tajam
Pompom menang karena **menjual jawaban** ("bisa beli, SL di sini"), kita menjual **kuota perintah**. Simulasi menunjukkan BSJP rela bayar Night Trader Rp29rb untuk **pengingat menjelang penutupan**, swing rela Pro Rp79rb untuk **pengingat stop-loss**. Track record terbuka = kartu kepercayaan yang harus masuk narasi paywall.

## 🧭 GABUNG KE ROADMAP
Sprint 1 (quick win): trigger #3 (kesimpulan cepat) + onboarding #4 + reposition paywall #7 + hero tagline "Temanmu berinvestasi."
Sprint 2: trigger #1 (alert web + akun) + #2 (chart persist) + custom screener #5
Sprint 3: widget/PWA #6 + jurnal + halaman perbandingan

Simulasi = hipotesis terstruktur (bukan data pasar); validasi dengan A/B & analytics setelah implementasi.
