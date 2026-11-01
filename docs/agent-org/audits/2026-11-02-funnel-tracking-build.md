# Audit & Build Report: Fix Funnel Blind-Spot (teknikal.id)
Tanggal: 2026-11-02
Branch: `fix/funnel-tracking` (dari `main`)
Author: Agent Antigravity

---

## 1. Executive Summary & Konteks

### Masalah
- Funnel klik naik 2x namun konversi ke user teregistrasi = 0.
- Titik drop dari 10 klik ke 0 registrasi sebelumnya **gelap/blind-spot**:
  1. Tombol CTA "Daftar Gratis" pada `GatedContent` (overlay preview paper trading dan compare) tidak memiliki atribut telemetry `data-engagement`.
  2. Nilai konteks ticker asal (misal `BBCA.JK` dari tombol "Simulasi Beli" di ticker page) hilang saat user sampai di halaman preview paper-trading, dan tidak diteruskan ke formulir registrasi.
  3. Label `register_completed` sebelumnya di-trigger langsung saat tombol submit diklik (`fire-on-click`), bukan saat pembuatan user di database/server berhasil. Kegagalan server (misal validasi email duplikat) tetap dihitung sebagai registrasi selesai, menciptakan data palsu (contoh: 2 klik step1_submit + 1 register_completed pada 28 Okt tanpa record User baru).

### Solusi yang Diimplementasikan
1. **Task 1 (P0)**:
   - Tambah `data-engagement="funnel_paper_gate_cta"` di `GatedContent`.
   - Tambah prop opsional `context?: string` di `GatedContent` dan `PaperTradingPreview`, diteruskan ke `/auth/register?ctx=${encodeURIComponent(context)}`.
   - Di `PaperTradingRouter`, baca query param `ticker` dan teruskan sebagai konteks ticker (`BBCA.JK`).
   - Di `RegisterPage`, baca query param `ctx`, simpan di state `ctx`, dan SAAT SUBMIT BERHASIL (`res.ok`), kirim telemetry event `register_success_ctx:${ctx}` dan `register_success`.
2. **Task 2 (P0)**:
   - Tombol submit formulir registrasi diganti label engagement-nya menjadi `register_submit_final` (klik tombol).
   - Event sukses `register_success` dipindahkan secara jujur ke path post-server-ok (`res.ok === true`).
   - Menghapus label palsu `register_completed` dari formulir registrasi.
   - Menyematkan komentar standar: `// telemetry AC4-fix 1 Nov: success = post-server-ok, bukan click`.
3. **Task 3 (P1)**:
   - Melakukan audit CTA utama yang belum ber-tracking di `src/app/(public)/**` dan komponen pendukungnya, serta menambahkan label semantik pada 10 CTA konversi utama (maksimal 10).
   - Memverifikasi keberadaan dan kebenaran label kartu homepage swing (`funnel_home_swing`) serta crosslink (`crosslink_pasar_swing`, `crosslink_oversold_swing`).

---

## 2. Daftar 10 CTA Konversi yang Diberi Label Semantik (Task 3)

| No | File & Line | Elemen CTA | Label Engagement Baru | Konteks / Intent |
|---|---|---|---|---|
| 1 | `src/app/(public)/berita/page.tsx:292` | `<Link href="/auth/register">` | `cta_register_berita_card` | Box CTA harian di akhir artikel berita |
| 2 | `src/app/(public)/community/page.tsx:398` | `<Link href="/auth/register">` | `cta_register_community` | Gate banner anonim di halaman forum komunitas |
| 3 | `src/components/ui/register-cta-bar.tsx:21` | `<Link href="/auth/register">` | `cta_register_content_bar` | Bottom bar CTA di artikel pasar & brief |
| 4 | `src/components/auth/login-gate.tsx:41` | `<Link href="/auth/register">` | `funnel_login_gate_cta` | Placeholder login gate untuk chart/indikator |
| 5 | `src/components/paper-trading/paper-trading-teaser.tsx:94` | `<Link href="...">` | `funnel_paper_teaser_cta` | Kartu simulasi cepat saham di stock detail |
| 6 | `src/components/ui/registration-inline-prompt.tsx:36` | `<Link href="/auth/register">` | `cta_register_inline_prompt` | Nudge kontekstual saham yang sering dibuka anonim |
| 7 | `src/components/ui/guest-overlimit-banner.tsx:41` | `<Link href="/auth/register">` | `cta_register_overlimit` | Banner batas kuota jelajah anonim (5+ saham) |
| 8 | `src/components/stock/alert-preview-card.tsx:49` | `<Link href="/auth/register">` | `cta_register_alert_card` | Kartu preview alert sinyal otomatis (golden cross/oversold) |
| 9 | `src/components/screener/screener-results.tsx:425` | `<Link href="...">` | `cta_register_screener_bar` | Bar simpan pantauan bintang di hasil screener |
| 10 | `src/components/chart/chart-section.tsx:194` | `<Link href="/auth/register">` | `cta_register_chart_range` | Tombol gembok 🔒 Buka 6mo+ pada grafik saham |

### Verifikasi Label Swing 1 Nov:
```bash
$ grep -rnE "funnel_home_swing|crosslink_pasar_swing|crosslink_oversold_swing" src/
src/app/(public)/pasar/page.tsx:469:        data-engagement="crosslink_pasar_swing"
src/app/(public)/saham-oversold/page.tsx:154:          data-engagement="crosslink_oversold_swing"
src/app/(public)/page.tsx:264:        <Link href="/swing" data-engagement="funnel_home_swing" className="group flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-bg-card border border-accent/30 hover:border-accent/60 depth-shadow transition-all">
```
Status: **VERIFIED (Semua label terpasang dengan tepat)**.

---

## 3. Bukti Verifikasi Grep Fisik

### A. Bukti `funnel_paper_gate_cta` terpasang di GatedContent:
```bash
$ grep -rn "funnel_paper_gate_cta" src/
src/components/ui/gated-content.tsx:59:            data-engagement="funnel_paper_gate_cta"
```

### B. Bukti `register_completed` TIDAK ADA LAGI di register page:
```bash
$ grep -rn "register_completed" src/app/auth/register/page.tsx || echo "VERIFIED: ZERO MATCHES"
VERIFIED: ZERO MATCHES
```

### C. Bukti `register_submit_final` terpasang di submit button:
```bash
$ grep -rn "register_submit_final" src/app/auth/register/page.tsx
src/app/auth/register/page.tsx:18: * Telemetry AC4: data-engagement register_step1_submit / register_submit_final
src/app/auth/register/page.tsx:225:                  data-engagement="register_submit_final"
```

---

## 4. Hasil Uji TypeScript & Unit Tests

### A. `npx tsc --noEmit`
```bash
$ npx tsc --noEmit
Exit code: 0 (No type errors)
```

### B. `npx tsx --test tests/register-funnel.test.ts tests/funnel-gate-tracking.test.ts`
```bash
▶ Funnel Gate Tracking & Honest Register Telemetry
  ✔ Kasus 1: href ctx benar ter-encode (0.283625ms)
  ✔ Kasus 2: register_success fire only on success path — mock fetch (8.759625ms)
  ✔ Kasus 3: tanpa context → href polos (0.068ms)
✔ Funnel Gate Tracking & Honest Register Telemetry (9.564667ms)
▶ isEmailLoose — gate step-1 (AC1)
  ✔ email normal lolos (0.3525ms)
  ✔ kosong / tanpa @ / tanpa dot di domain → ditolak (0.058958ms)
  ✔ spasi + multi-@ → ditolak (0.04825ms)
  ✔ lebih dari 255 char → ditolak (paritas zod max(255)); 255 persis → lolos (0.047542ms)
  ✔ uppercase tetap lolos (dinormalisasi nanti, bukan ditolak) (0.043916ms)
✔ isEmailLoose — gate step-1 (AC1) (1.007834ms)
▶ passwordChecks — ekstraksi perilaku lama (AC3 no-regresi)
  ✔ longEnough = >=8 (boundary 7/8) (0.061375ms)
  ✔ matches hanya true kalau confirm terisi DAN sama (0.047542ms)
✔ passwordChecks — ekstraksi perilaku lama (AC3 no-regresi) (0.178166ms)
▶ step2Ready — tombol submit step-2 aktif (AC1)
  ✔ aktif hanya saat password valid + cocok (0.057667ms)
✔ step2Ready — tombol submit step-2 aktif (AC1) (0.133208ms)
ℹ tests 11
ℹ suites 4
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 166.16525
```

---

## 5. Hasil Build Produksi (`npm run build`)

```
▲ Next.js 16.4.3 (webpack)
✓ Compiled successfully in 8.6s
✓ Finished TypeScript in 3.6s
✓ Collecting page data using 9 workers in 875ms
✓ Generating static pages using 9 workers (196/196) in 994ms

├ ○ /auth/complete-profile
├ ƒ /auth/error
├ ○ /auth/register
├ ○ /auth/signin
├ ○ /compare
├ ○ /paper-trading
...
○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

Command exited with code 0.
```

---

## 6. Git Diff Summary

```diff
modified:   src/app/(public)/berita/page.tsx
modified:   src/app/(public)/community/page.tsx
modified:   src/app/(public)/paper-trading/page.tsx
modified:   src/app/auth/register/page.tsx
modified:   src/components/auth/login-gate.tsx
modified:   src/components/chart/chart-section.tsx
modified:   src/components/compare/compare-page-client.tsx
modified:   src/components/engagement-instrument.tsx
modified:   src/components/paper-trading/paper-trading-preview.tsx
modified:   src/components/paper-trading/paper-trading-teaser.tsx
modified:   src/components/screener/screener-results.tsx
modified:   src/components/stock/alert-preview-card.tsx
modified:   src/components/ui/gated-content.tsx
modified:   src/components/ui/guest-overlimit-banner.tsx
modified:   src/components/ui/register-cta-bar.tsx
modified:   src/components/ui/registration-inline-prompt.tsx
modified:   src/lib/register-funnel.ts
new file:   tests/funnel-gate-tracking.test.ts
new file:   tests/register-funnel.test.ts
```

Semua batasan dipatuhi:
- 0 dependency baru
- 0 endpoint baru (menggunakan endpoint dan queue telemetry existing `/api/public/engagement`)
- Auth service dan register API logic tidak diubah
- Tidak ada push/deploy/merge.
