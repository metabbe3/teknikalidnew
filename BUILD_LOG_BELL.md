# BUILD LOG — Web In-App Notification Bell (Header) + API

- **Branch**: `feature/ux-conversion-1109`
- **Worktree**: `/tmp/uxconv-wt`
- **Status Git**: Working tree modified, tidak di-commit / push / build / deploy (sesuai instruksi brief).

---

## 1. File yang Dibuat / Diubah

1. `src/app/api/notifications/route.ts` (Diubah — TASK 1)
   - **`GET /api/notifications`**:
     - Autentikasi sesi via `requireAuth()`.
     - Resolve `email → chat_id` melalui `agent.agent_web_binding` dengan `prisma.$queryRaw` pada skema `agent` (`SELECT chat_id::text FROM agent.agent_web_binding WHERE lower(email) = ... LIMIT 1`). Mendukung `chat_id` positif (Telegram terhubung) maupun negatif (virtual binding web tanpa Telegram).
     - Jika belum ada baris binding: langsung mengembalikan `{ unread: 0, items: [] }` (tanpa error dan **tanpa** auto-create virtual binding — tetap diserahkan ke `agentd` saat chat pertama).
     - Mengambil 30 notifikasi terbaru dari `agent.web_notification` (`ORDER BY created_at DESC LIMIT 30`) beserta jumlah unread (`read_at IS NULL`) dalam format `{ unread: n, items: [{ id, kind, title, body, url, createdAt, read }] }`.
   - **`POST /api/notifications`**:
     - Menerima `{ action: "mark-read", id? }`.
     - Tanpa `id`: menandai seluruh notifikasi milik `chat_id` user sebagai dibaca (`UPDATE agent.web_notification SET read_at = now() WHERE chat_id = $1::bigint AND read_at IS NULL`).
     - Dengan `id`: menandai satu baris dengan verifikasi kepemilikan `chat_id` (`UPDATE agent.web_notification SET read_at = now() WHERE chat_id = $1::bigint AND id::text = $2 AND read_at IS NULL`).
   - Header `Cache-Control: no-store, no-cache, must-revalidate` dan `export const dynamic = "force-dynamic"`.

2. `src/components/layout/notif-bell.tsx` (Baru — TASK 2)
   - Komponen `"use client"` dengan ikon `Bell` dari `lucide-react` dan badge merah angka unread (maksimal tampil `"9+"`).
   - **Klik → Panel Notifikasi**:
     - Desktop (`>=sm`): dropdown tepat di bawah tombol bell (`sm:w-96 sm:max-w-md sm:rounded-2xl`).
     - Mobile (`<sm`): bottom-sheet (`rounded-t-2xl max-w-md w-full`) mengikuti pola `GuestSellModal`.
     - Item: `title` tebal (`font-semibold`) saat unread, `body` 1 baris `truncate`, waktu relatif `id-ID` (`"Baru saja"`, `"5 mnt lalu"`, `"2 jam lalu"`, dst.), klik item membuka `url` + kirim `POST /api/notifications` `{ action: "mark-read", id }`.
     - Simbol kecil per `kind`: `blast` = `🔴`, `pulse` = `📊`, `alert` = `⚡`.
     - Footer `"Tandai semua dibaca"` (`POST /api/notifications` `{ action: "mark-read" }`).
   - **A11y**: `aria-label="Notifikasi (n belum dibaca)"`, tutup dengan tombol `Escape` (fokus kembali ke tombol bell), dan focus trap ringan (`Tab` / `Shift+Tab`).

3. `src/components/layout/header.tsx` (Diubah — TASK 2)
   - Memasang `<NotifBell />` di slot kanan header yang terlihat pada tampilan mobile maupun desktop, hanya ketika `session?.user` terautentikasi.

4. `src/components/uhu/uhu-chat-panel.tsx` (Diubah — TASK 3)
   - Menambahkan dot merah kecil di samping badge `Live` / `Siaga` pada header panel Uhu saat `notifUnread > 0` yang mengarahkan ke bell (`openNotifBell()`).
   - Membaca angka unread dari store sinkron ringan `useNotifUnread()` milik `notif-bell.tsx` tanpa fetch atau polling tambahan (bell tetap satu pintu).

---

## 2. Edge Cases yang Ditangani

1. **Guest Tanpa Bell & Tanpa Polling**:
   - Di `header.tsx` (`{session?.user && <NotifBell />}`) dan di dalam `NotifBell` (`if (!isAuthed) return null`), pengunjung belum login (`unauthenticated` / `loading`) tidak merender elemen bell di DOM dan tidak memicu request `GET /api/notifications`.
2. **Tab Hidden Menghentikan Polling (`visibilitychange` Guard)**:
   - Polling ringan 60 detik (`setInterval` 60.000 ms) hanya berjalan saat `document.visibilityState === "visible"`.
   - Saat tab berpindah ke background (`document.visibilityState !== "visible"`), `clearInterval` dipanggil sehingga tidak ada request di background. Ketika tab kembali `visible`, komponen langsung melakukan sinkronisasi `fetchNotifications()` dan menyalakan ulang interval 60 detik.
3. **User Baru Belum Punya Binding (`agent.agent_web_binding`) & Virtual `chat_id` Negatif**:
   - Regex `/^-?\d+$/` dan pengecekan `rawChatId !== "0"` menerima `chat_id` negatif (virtual web user tanpa Telegram) maupun positif.
   - Jika baris `agent.agent_web_binding` belum ada, API mengembalikan HTTP 200 `{ unread: 0, items: [] }` tanpa membuat binding di endpoint notifikasi.
4. **Tabel `agent.web_notification` Belum Dimigrasi oleh `agentd`**:
   - Jika tabel `agent.web_notification` belum dibuat di database (`42P01`), endpoint menangkap error tersebut secara aman dan mengembalikan `{ unread: 0, items: [] }` (GET) atau `{ ok: true, updated: 0 }` (POST) tanpa menghasilkan HTTP 500.
