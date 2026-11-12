# BUILD LOG — UHU IMPROVE (Suggestion Chips + Linkify + Async Red-Dot + Unify Tombol Tanya AI)

**Tanggal**: 10 Nov 2026  
**Worktree**: `/tmp/uxconv-wt` (`feature/ux-conversion-1109`)  
**Status**: `npx tsc --noEmit` PASS (0 error), `npx eslint` pada file Uhu & komponen terkait PASS (0 error / 0 warning). Tidak melakukan commit/push/build/deploy sesuai instruksi.

---

## 1. File Dibuat / Diubah

| File | Status | Ringkasan Perubahan |
|---|---|---|
| `src/components/uhu/uhu-provider.tsx` | **BARU** | Global React Context (`"use client"`) yang menyimpan seluruh state percakapan Uhu (`open`, `messages`, `input`, `streaming`, `isLive`, `gate`, `effectiveGate`, `isGuest`, `errorBanner`, `unreadWhileClosed`, `pageContext`, `chips`, `send()`). Menyediakan helper trigger `<UhuStockTrigger />` (selalu buka Uhu + `pageContext=ticker`) dan `<UhuAskCtaLink />` (logged-in buka Uhu, guest tetap ke `/agent`). |
| `src/app/(public)/layout.tsx` | **UBAH** | Mount `<UhuProvider>` membungkus isi `PublicLayout` sebelum `<UhuFab />` sehingga seluruh halaman publik dan FAB berbagi state tunggal. |
| `src/components/uhu/uhu-fab.tsx` | **UBAH** | Membaca `open`, `setOpen`, `messages`, dan `unreadWhileClosed` dari `useUhu()`. Merender badge titik merah (`span absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-bg-card` dengan `aria-label="Uhu menjawab"`) saat `unreadWhileClosed && !open`. |
| `src/components/uhu/uhu-chat-panel.tsx` | **UBAH** | Menjadi komponen UI murni yang membaca `useUhu()`. Menambahkan bar **Suggestion Chips** kontekstual di atas input bar (`messages.length <= 1 && !streaming`, maks 3 chip, klik = `setInput` + auto-send) serta upgrade `renderLiteMarkdown()` untuk me-linkify `[label](url)` dan bare ticker `/\b([A-Z]{4})(\.JK)?\b/` sebagai React nodes murni tanpa `dangerouslySetInnerHTML`. |
| `src/components/stock/stock-card.tsx` | **UBAH** | Mengganti pemanggilan `<StockAiModal>` pada tombol Sparkles (`Analisa AI`) dengan `openUhu(ticker)` dan menghapus dead import `StockAiModal`. |
| `src/components/stock/stock-ai-modal.tsx` | **UBAH** | Mengarahkan `StockAiModalButton` (termasuk auto-open `?tanya=`) ke `openUhu(ticker)`. File `stock-ai-modal.tsx` dan `/api/ai/stock` tetap dipertahankan. |
| `src/components/stock/ticker-fab.tsx` | **UBAH** | Tombol `"Tanya AI"` pada floating pill mobile & desktop di halaman saham kini memanggil `openUhu(ticker)`. |
| `src/components/stock/bouncer-hook.tsx` | **UBAH** | Tombol `"💬 Tanya AI"` pada bottom strip halaman saham kini memanggil `openUhu(ticker)`. |
| `src/app/(public)/stocks/[ticker]/page.tsx` | **UBAH** | Mengganti tombol `"🤖 Tanya AI soal {TICKER} · gratis 3x →"` (bawah Trading Plan) dan `"💬 Tanya AI Gratis"` (kartu tanya analisa) menjadi `<UhuStockTrigger ticker={ticker}>`. |
| `src/components/screener/screener-ai-modal.tsx` | **UBAH** | Tombol `"Tanya AI"` (`ScreenerAiButton` di `/stocks`) dan deep-link `?ask=` kini membuka Uhu (`openUhu("/stocks")`). |
| `src/app/(public)/pasar/page.tsx` | **UBAH** | Kedua CTA hero (`"Tanya kondisi pasar di AI — gratis 3x"` saat pasar tutup & `"Bingung sama pasar? Tanya AI di Telegram — gratis 3x"` saat live window) memakai `<UhuAskCtaLink guestHref="/agent" pageContextOverride="/pasar">`. |
| `src/components/stock/stocks-pasar-panel.tsx` | **UBAH** | CTA `"☕ Tanya arah IHSG & aliran asing hari ini di Bot — gratis 3x"` memakai `<UhuAskCtaLink guestHref="/agent" pageContextOverride="/pasar">`. |
| `src/components/home/personalized-greeting.tsx` | **UBAH** | CTA `"💬 Tanya AI — gratis 3x"` di beranda memakai `<UhuAskCtaLink guestHref="/agent?from=greeting" pageContextOverride="/">`. |
| `src/app/(public)/indeks/[slug]/page.tsx` | **UBAH** | CTA `"💬 Tanya AI: Saham {Indeks} mana paling potensial hari ini? — Gratis 3x"` memakai `<UhuAskCtaLink guestHref="/agent">`. |
| `src/app/(public)/berita/[slug]/page.tsx` | **UBAH** | CTA atas (`"💬 Tanya dampak berita ini ke AI — gratis 3x"`) dan CTA bawah artikel (`"💬 Analisa {TICKER} di Bot"` / `"💬 Tanya AI di Bot Telegram"`) memakai `<UhuAskCtaLink guestHref="/agent">`. |
| `src/components/saham/compare-table.tsx` | **UBAH** | CTA `"Tanya AI: {A} atau {B}?"` memakai `<UhuAskCtaLink guestHref="/agent" pageContextOverride={a.ticker}>`. |
| `src/components/seo/ask-ai-cta.tsx` | **UBAH** | CTA `"💬 Tanya langsung di Telegram AI — gratis 3x"` pada landing SEO tematik memakai `<UhuAskCtaLink guestHref="/agent">`. |

---

## 2. Daftar Tombol yang Di-Unify ke Uhu (`file:baris`)

### A. Halaman Saham & Kartu Saham (Selalu buka Uhu + `pageContext=ticker`)
1. `src/components/stock/stock-card.tsx:100-108` — Tombol ikon Sparkles `Analisa AI {name}` di kartu saham (`onClick={() => openUhu(ticker)}`). Pemakaian `<StockAiModal>` kini `0` di seluruh codebase (import dead dihapus, file tetap dibiarkan).
2. `src/components/stock/stock-ai-modal.tsx:90-109` — `StockAiModalButton` (`Analisa AI` + handler query `?tanya=`) diarahkan ke `openUhu(ticker)`.
3. `src/components/stock/ticker-fab.tsx:185-194` — Pill mobile `"Tanya AI"` di halaman `/stocks/[ticker]` (`onClick={() => openUhu(ticker)}`).
4. `src/components/stock/ticker-fab.tsx:215-224` — Pill desktop `"Tanya AI"` di halaman `/stocks/[ticker]` (`onClick={() => openUhu(ticker)}`).
5. `src/app/(public)/stocks/[ticker]/page.tsx:829-837` — Baris `"🤖 Tanya AI soal {TICKER} · gratis 3x →"` tepat di bawah kartu Rencana Trading (`<UhuStockTrigger ticker={ticker}>`).
6. `src/app/(public)/stocks/[ticker]/page.tsx:1310-1316` — Tombol `"💬 Tanya AI Gratis"` pada section *"Tanya analisa apa pun soal {TICKER}"* (`<UhuStockTrigger ticker={ticker}>`).
7. `src/components/stock/bouncer-hook.tsx:133-140` — Tombol `"💬 Tanya AI"` pada strip BouncerHook (`onClick={() => openUhu(ticker)}`).
8. `src/components/screener/screener-ai-modal.tsx:119-127` — Tombol `"Tanya AI"` di header `/stocks` (`ScreenerAiButton`, `onClick={() => openUhu("/stocks")}`).

### B. Halaman Lain (Logged-In → Buka Uhu; Guest → Tetap Link `/agent`)
1. `src/app/(public)/pasar/page.tsx:82-88` — Hero `/pasar` (luar jam bursa/akhir pekan): `"Tanya kondisi pasar di AI — gratis 3x"`.
2. `src/app/(public)/pasar/page.tsx:143-149` — Hero `/pasar` (live window): `"Bingung sama pasar? Tanya AI di Telegram — gratis 3x"`.
3. `src/components/stock/stocks-pasar-panel.tsx:215-222` — Panel Koran Pasar di `/stocks`: `"☕ Tanya arah IHSG & aliran asing hari ini di Bot — gratis 3x"`.
4. `src/components/home/personalized-greeting.tsx:76-82` — Greeting bar beranda (`/`): `"💬 Tanya AI — gratis 3x"` (guest menuju `/agent?from=greeting`).
5. `src/app/(public)/indeks/[slug]/page.tsx:209-215` — Banner indeks (`/indeks/[slug]`): `"💬 Tanya AI: Saham {idx.name} mana paling potensial hari ini? — Gratis 3x"`.
6. `src/app/(public)/berita/[slug]/page.tsx:442-448` — Header artikel berita: `"💬 Tanya dampak berita ini ke AI — gratis 3x"`.
7. `src/app/(public)/berita/[slug]/page.tsx:472-481` — Footer artikel berita: `"💬 Analisa {TICKER} di Bot"` / `"💬 Tanya AI di Bot Telegram"`.
8. `src/components/saham/compare-table.tsx:116-122` — Halaman compare (`/saham/[a]-vs-[b]`): `"Tanya AI: {cleanA} atau {cleanB}?"`.
9. `src/components/seo/ask-ai-cta.tsx:22-28` — Blok `AskAiCta` di halaman-halaman landing sinyal SEO: `"💬 Tanya langsung di Telegram AI — gratis 3x"`.

*(Catatan: `GuestSellModal` dan seluruh pricing CTAs di `/agent` tidak disentuh sama sekali).*

---

## 3. Penanganan Edge Cases

1. **Guest di Stock Page (`/stocks/[ticker]`)**:
   - Saat pengunjung belum login (guest) menekan tombol `"Tanya AI"` di halaman saham (`TickerFab`, bawah Trading Plan, kartu Tanya AI Gratis, `BouncerHook`, atau `StockCard`), panel Uhu langsung terbuka (`open=true`, `pageContext=ticker`) — bahkan bila waktu muat halaman belum melewati delay `2.5s` awal `UhuFab`.
   - Di dalam panel Uhu, `effectiveGate === "AUTH"` otomatis aktif (berdasarkan `useSession() === "unauthenticated"` maupun respons `401` dari `/api/uhu`), sehingga Uhu menampilkan kartu gate ramah **"Login dulu + hubungkan Telegram"** dengan tombol konversi langsung ke **`/agent`** (*Buka Halaman Agent*) dan **`/auth/signin`** (*Masuk Akun*), sementara textarea dan suggestion chips dinonaktifkan (`disabled`).
   - Sebaliknya, pada CTA halaman non-saham (`/pasar`, `/`, `/berita`, `/indeks`, dsb.), komponen `<UhuAskCtaLink>` memeriksa `isGuest` dari `UhuProvider`: jika user sudah login (`!isGuest`), klik diintersep (`e.preventDefault()`) untuk membuka panel Uhu; jika guest (`isGuest`), elemen tetap berupa `<a href="/agent">` murni sehingga funnel registrasi/monetisasi tidak berubah.

2. **Panel Ditutup Saat Streaming Berjalan (Async Completion + Red-Dot)**:
   - Seluruh state dan pembaca stream SSE (`fetch("/api/uhu")` + `ReadableStream` reader) berada di `UhuProvider` (level `PublicLayout`), bukan di `UhuChatPanel`.
   - Menutup panel (`closeUhu()` / `setOpen(false)`) hanya menyembunyikan dialog UI (`if (!open) return null`) **tanpa** memanggil `abortRef.current.abort()`. Stream SSE terus berjalan di background hingga event `done` (atau error) selesai diterima dan disimpan ke state `messages` + `sessionStorage`.
   - `openRef` melacak status buka/tutup panel secara sinkron. Ketika blok `finally` pada `send()` selesai dan `!openRef.current` bernilai `true` (panel sedang tertutup), provider mengubah `unreadWhileClosed = true`.
   - `UhuFab` menampilkan badge merah (`<span aria-label="Uhu menjawab" className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-bg-card" />`). Begitu pengguna membuka kembali panel (`setOpen(true)`), `unreadWhileClosed` otomatis di-reset menjadi `false` dan jawaban lengkap langsung terlihat.
