# BUILD LOG — Uhu Floating Mascot + Web Chat Panel

**Tanggal**: 10 Nov 2026  
**Worktree**: `/tmp/uxconv-wt` (`feature/ux-conversion-1109`)  
**Status**: `tsc --noEmit` PASS (0 error), `eslint` PASS (0 error / 0 warning). Tidak melakukan commit/push/build/deploy sesuai instruksi.

---

## 1. File Dibuat / Diubah

| File | Status | Ringkasan |
|---|---|---|
| `src/components/uhu/uhu-mascot.tsx` | BARU | Pure presentational SVG inline burung hantu minimal-geometric (tanpa `"use client"`, tanpa dependensi). Prop `size` (default `44`), `mood: "happy" \| "thinking"`. Menggunakan CSS variable design system (`var(--color-accent, var(--accent))`, `var(--color-bg-card, var(--card))`, `var(--color-warning)`, `currentColor`). A11y `role="img"` `aria-label="Uhu — maskot TeknikalID"`. |
| `src/components/uhu/uhu-fab.tsx` | BARU | Client component FAB `fixed right-4 bottom-20 md:bottom-6 z-40`, ukuran `52px`, `rounded-full bg-bg-card border-border shadow`, berisi `<UhuMascot size={36} />` (dan berubah jadi ikon X dengan `aria-label="Tutup Uhu"` saat panel terbuka). Delay muncul `2.5s` setelah mount agar tidak mengganggu LCP/first paint. Bubble sapaan sekali-per-sesi (`"Halo! Aku Uhu 🦉 — tanya apa aja soal saham"`, `aria-hidden="true"`) di-gate oleh `sessionStorage` `uhu_dismissed`. |
| `src/components/uhu/uhu-chat-panel.tsx` | BARU | Client component panel chat responsif: mobile bottom-sheet (`fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[75dvh]`), desktop dialog (`md:right-6 md:bottom-24 md:w-[380px] md:rounded-xl`). Header dengan `<UhuMascot size={28} />`, judul `"Uhu — Analis AI TeknikalID"`, badge status (`● Live` via `GET /api/uhu`), dan tombol X. Body dengan parser markdown-lite (`< 40` baris, hanya `**bold**` dan `\n`), streaming token progresif, auto-scroll bottom, serta penyimpanan riwayat di memory + `sessionStorage` (`uhu_chat_history`, maks 20 pesan). Input bar `textarea` auto-resize (1–4 baris), `Enter` kirim, `Shift+Enter` baris baru, `Esc` tutup. |
| `src/app/api/uhu/route.ts` | BARU | Endpoint proxy server-only (`GET` status & `POST` chat SSE) menuju `${AGENTD_WEBCHAT_URL}/api/chat` dan `/api/chat/status` dengan header `X-Webchat-Key`. Dilengkapi dokumentasi header sesuai API Reuse Rule #4. |
| `src/app/(public)/layout.tsx` | UBAH | Mount `<UhuFab />` satu kali di level layout publik (`PublicLayout`) secara langsung (tidak di dalam `<details>`, dan tidak termuat di `/admin`, `/auth`, maupun `/api`). |

---

## 2. Keputusan Z-Index & Posisi (`z-40`)

Berdasarkan audit seluruh elemen `fixed` di codebase:
- `BouncerHook` (mobile bottom bar): `z-30`
- `TickerFab` (mobile & desktop pill di `left-1/2 -translate-x-1/2`): `z-40` (posisi tengah-bawah, sedangkan `UhuFab` di kanan-bawah `right-4 bottom-20 md:bottom-6` sehingga tidak bertabrakan secara horizontal maupun vertikal)
- `RegistrationBottomSheet`, `GuestSellModal`, modal transaksi/share: `z-50`
- `StockAiModal` / `ScreenerAiModal`: `z-[100]`

Dengan menempatkan `UhuFab` dan `UhuChatPanel` pada **`z-40`** di `right-4 bottom-20 md:bottom-6`:
1. Tidak menutupi modal penting atau bottom-sheet konversi (`GuestSellModal` / `RegistrationBottomSheet` di `z-50`).
2. Tidak bertabrakan dengan `TickerFab` (yang berada di tengah-bawah `left-1/2 -translate-x-1/2`).
3. Berada di atas konten halaman dan `BouncerHook` (`z-30`).
4. Dirender sebagai anak langsung di `PublicLayout` setelah `OnboardingWizard` (mematuhi **FIXED-ELEMENT LAW**: di luar `<details>`).

---

## 3. Cara Proxy Stream (`/api/uhu`)

1. **Konfigurasi Env**:
   - `AGENTD_WEBCHAT_URL` (default `http://host.docker.internal:9101`)
   - `AGENTD_WEBCHAT_KEY` (wajib; bila kosong langsung mengembalikan HTTP `503 { error: "UHU_DISABLED" }`).
2. **AutentikasiSatu Pintu**:
   - Memanggil `requireAuth()` (pola identik dengan `src/app/api/agent/membership/route.ts`) untuk mengambil `session.email`.
   - Bila guest / belum login → langsung mengembalikan HTTP `401 { error: "AUTH" }`.
3. **Passive Streaming (`ReadableStream`)**:
   - `POST /api/uhu` meneruskan `{ email, text, pageContext }` ke `${AGENTD_WEBCHAT_URL}/api/chat` dengan header `X-Webchat-Key`.
   - Jika status upstream `200 OK` dan memiliki `upstream.body`, route membaca `upstream.body.getReader()` per-chunk (`pull(controller)`) dan langsung melakukan `controller.enqueue(value)` ke `Response` client dengan header:
     - `Content-Type: text/event-stream; charset=utf-8`
     - `Cache-Control: no-cache, no-transform`
     - `Connection: keep-alive`
     - `X-Accel-Buffering: no`
   - Saat koneksi client ditutup/dibatalkan (`request.signal` / `cancel()`), `upstreamReader.cancel()` dipanggil agar tidak ada resource leak di `agentd`.

---

## 4. Penanganan Edge Cases di UI & Proxy

| Kondisi / Edge Case | Respons Proxy (`/api/uhu`) | Tampilan di `UhuChatPanel` |
|---|---|---|
| **Guest (Belum Login)** | `401 { error: "AUTH" }` (atau terdeteksi via `useSession() === "unauthenticated"`) | Kartu ramah **"Login dulu + hubungkan Telegram"** dengan tombol CTA langsung ke `/agent` (*Buka Halaman Agent*) dan `/auth/signin` (*Masuk Akun*). Input dinonaktifkan. |
| **Belum Bind Telegram (`NO_BINDING`)** | `409 { error: "NO_BINDING" }` (diteruskan dari `agentd` 409) | Kartu ramah **"Hubungkan Telegram dulu yuk"** dengan penjelasan singkat dan tombol CTA satu pintu ke `/agent` (*Hubungkan Telegram di /agent*). |
| **Agentd Mati / Env Kosong (`AGENT_OFFLINE` / `UHU_DISABLED`)** | `503 { error: "AGENT_OFFLINE" }` atau `503 { error: "UHU_DISABLED" }` | Badge header berubah ke `Siaga` (abu-abu) dan tampil banner info ramah: *"Uhu sedang istirahat sebentar (layanan AI belum aktif). Coba beberapa saat lagi ya."* |
| **Kuota Habis / Rate Limit (HTTP 429 atau SSE `event: error`)** | HTTP `429` atau frame SSE `event: error` `data: {"message":"..."}` | Parser SSE menangkap `event: error` (maupun HTTP `429`) dan menampilkan banner info ramah beserta tautan ke `/agent` untuk cek/upgrade kuota tanpa memutus state aplikasi. |
