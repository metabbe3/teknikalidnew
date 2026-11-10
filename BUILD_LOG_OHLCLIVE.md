# BUILD LOG — OHLCV Strip Live Hydration Saat Market Open

- **Branch**: `feature/ux-conversion-1109`
- **Worktree**: `/tmp/uxconv-wt`
- **Status Git**: Working tree modified, tidak di-commit / push / build / deploy sesuai instruksi brief.

---

## 1. File yang Dibuat / Diubah

### File Baru
1. `src/components/stock/ohlcv-live.tsx` (`"use client"`)
   - Merender strip ringkasan OHLCV inline (`O`, `H`, `L`, `C`, `Vol`, serta label tanggal sesi) dengan teks awal SSR dari props server (`ohlcv`, `ticker`, `sessionDate`).
   - Mengubah `aria-label` dari `"Ringkasan OHLCV hari ini"` menjadi `"Ringkasan OHLCV sesi terbaru"` serta menambahkan `title` attribute pada container strip.
   - Menambahkan atribut `data-live-*` dengan nilai ternormalisasi `TICKER.JK`:
     - `data-live-oh="TICKER.JK"` pada span nilai Open (`O`)
     - `data-live-high="TICKER.JK"` pada span nilai High (`H`, `text-bullish`)
     - `data-live-low="TICKER.JK"` pada span nilai Low (`L`, `text-bearish`)
     - `data-live-close="TICKER.JK"` pada span nilai Close (`C`)
     - `data-live-vol="TICKER.JK"` pada span nilai Volume (`Vol`, format compact `id-ID` `maximumFractionDigits: 1`, mis. `"12,4 jt"`), terpisah dari badge `volumeRatio` (`x1,5`) agar patch `textContent` tidak menimpa rasio volume.
   - Merender label tanggal sesi di ujung kanan strip: `<span className="text-[10px] text-text-tertiary">sesi {resolvedSessionDate}</span>` (contoh: `sesi 9 Nov`).

### File yang Diubah
2. `src/components/stock/trading-plan-card.tsx`
   - Tetap sebagai Server Component (tanpa `"use client"`).
   - Menambahkan prop opsional `ticker?: string` dan `sessionDate?: string` pada `TradingPlanCard`.
   - Mengganti strip OHLCV inline dengan `<OhlcvLive ohlcv={ohlcv} ticker={ticker} sessionDate={sessionDate} />` (tetap inline di luar `<details>` collapse, mematuhi FIXED-ELEMENT LAW).
3. `src/components/stock/live-price.tsx`
   - Memperluas interface `QuoteRow` dengan field `high`, `low`, `open`, `volume`, serta `dayHigh`, `dayLow`, `prevClose`, `marketState`.
   - Menormalisasi hasil `/api/live-quotes` (`high: raw.high ?? raw.dayHigh ?? null`, `low: raw.low ?? raw.dayLow ?? null`, `open: raw.open ?? null`, `volume: raw.volume ?? null`, `marketState: raw.marketState ?? null`).
   - Mengikutsertakan elemen `[data-live-oh]`, `[data-live-high]`, `[data-live-low]`, `[data-live-close]`, dan `[data-live-vol]` ke dalam daftar ticker yang di-poll ke `/api/live-quotes`.
   - Mem-patch `textContent` elemen `[data-live-oh]`, `[data-live-high]`, `[data-live-low]`, `[data-live-close]`, dan `[data-live-vol]` hanya saat `isMarketHoursWib() && marketState !== "CLOSED" && marketState !== "CLOSED_WIB"`.
4. `src/components/stock/guest-quota.tsx`
   - Menambahkan prop `sessionDate?: string` pada `GuestTradingPlanGate` dan meneruskan `ticker={cleanTicker}` serta `sessionDate={sessionDate}` ke `<TradingPlanCard />` baik saat initial SSR render maupun setelah client mount.
5. `src/lib/utils.ts`
   - Menambahkan helper `formatTanggalIndo(date?: Date | string | null): string | undefined` menggunakan `Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })` yang menghasilkan format singkat seperti `"9 Nov"`.
6. `src/app/(public)/stocks/[ticker]/page.tsx`
   - Mengimpor `formatTanggalIndo` dari `@/lib/utils` dan meneruskan `sessionDate={formatTanggalIndo(latest?.date)}` ke `<GuestTradingPlanGate />`.

---

## 2. Cara Kerja Hydration & Live Patching

1. **SSR Render Awal**:
   - `StockDetailPage` (`page.tsx`) mengambil baris harga EOD terbaru (`latest`) dari database, memformat tanggal sesi via `formatTanggalIndo(latest?.date)` (mis. `"9 Nov"`), dan meneruskannya bersama objek `ohlcv` ke `GuestTradingPlanGate` -> `TradingPlanCard` -> `OhlcvLive`.
   - HTML SSR sudah berisi angka EOD lengkap (`O`, `H`, `L`, `C`, `Vol`, dan `sesi 9 Nov`) untuk kebutuhan SEO dan tampilan instan tanpa layout shift.
2. **Client Polling & DOM Patching (`LivePrice`)**:
   - Komponen global `<LivePrice />` melakukan polling setiap 60 detik ke `/api/live-quotes?s=...` untuk seluruh ticker unik yang ditemukan pada atribut `data-live-*` di DOM.
   - Saat respons diterima dan pasar sedang buka (`isMarketHoursWib()` bernilai `true` dan `marketState` bukan `"CLOSED"` / `"CLOSED_WIB"`):
     - `[data-live-oh]` di-patch dengan `formatPrice(q.open)`
     - `[data-live-high]` di-patch dengan `formatPrice(q.high)` (dari `dayHigh`)
     - `[data-live-low]` di-patch dengan `formatPrice(q.low)` (dari `dayLow`)
     - `[data-live-close]` di-patch dengan `formatPrice(q.price)`
     - `[data-live-vol]` di-patch dengan `fmtCompactVol(q.volume)` (`regularMarketVolume` dalam format compact `id-ID`, mis. `"12,4 jt"`)
   - Pembaruan murni menggunakan mutasi `el.textContent` bila nilai berubah (tanpa re-render React tree dan aman untuk `prefers-reduced-motion`).

---

## 3. Catatan Edge Cases (Weekend, Market State, & Fallback)

- **Akhir Pekan (Sabtu/Minggu)**:
  - `LivePrice` mengecek `day !== 0 && day !== 6` sebelum melakukan fetch, serta `isMarketHoursWib()` mewajibkan Senin–Jumat pukul 09:00–16:15 WIB. Pada akhir pekan tidak ada request `/api/live-quotes` yang dikirim dan nilai SSR EOD + label `sesi <tanggal>` tetap utuh.
- **Luar Jam Bursa (Pre-market / Post-market) & `marketState`**:
  - Di luar pukul 09:00–16:15 WIB, `/api/live-quotes` mengembalikan payload `buildClosedQuoteRow` dengan `marketState: "CLOSED_WIB"` dan `open/dayHigh/dayLow/volume: null`.
  - Di sisi client, `LivePrice` juga memvalidasi `isMarketHoursWib() && q.marketState !== "CLOSED" && q.marketState !== "CLOSED_WIB"`. Jika upstream mengembalikan `marketState: "CLOSED"` (mis. hari libur bursa di hari kerja) atau field bernilai `null`/`<= 0`, DOM tidak disentuh sehingga angka EOD sesi terakhir tetap tampil jujur.
- **Tab Browser Hidden / Gangguan Jaringan**:
  - Polling berhenti saat `document.hidden === true` dan otomatis menyegarkan ulang saat tab kembali aktif (`visibilitychange`). Bila fetch gagal, nilai SSR/terakhir tetap dipertahankan tanpa error UI.
