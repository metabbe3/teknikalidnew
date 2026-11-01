# Audit & Execution Report: Sweep Hygiene (Dead Code + DRY Konsolidasi) — teknikal.id

**Tanggal:** 2026-11-02  
**Branch:** `chore/sweep-hygiene` (dari `main` @ `df437659381059423225469a652582fe49197cdb`)  
**Status:** ALL TASKS COMPLETED (Task 1, 2, 3) — TypeScript 0 Error, Build SUCCESS (Exit 0), Unit Tests & Selftests 100% PASS  

---

## 1. Executive Summary

Berdasarkan brief owner "sweep it" (2 Nov 2026), dilakukan pembersihan codebase teknikal.id mencakup:
1. **Dead Code Elimination:** 19 file komponen, hook, dan utilitas tanpa pemakai dihapus menggunakan `git rm` setelah re-verifikasi independen melalui `git grep` pada path dan symbol exports.
2. **DRY Konsolidasi:**
   - 10 definisi duplikat `formatRupiah` disatukan ke `src/lib/format-number.ts` dengan penanganan varian `number | null`.
   - 3 definisi `wibDateKey` + 1 kalkulasi inline disatukan ke `wibDayKey` di `src/lib/datetime-wib.ts`.
   - 2 implementasi `timeAgo` bergaya bahasa Inggris di admin agent hub dikonsolidasikan ke `timeAgo(date, "en")` di `src/lib/time.ts`.
   - Varian `stripJk` dibiarkan dengan alasan intentional case-insensitivity.
3. **Empty Catch Hardening:** Penambahan logging `console.warn` non-blocking pada 2 file endpoint (`/api/track/pageview` dan `/api/auth/register`) yang sebelumnya menelan error secara silent.

---

## 2. TASK 1: Eliminasi 19 File Dead Code

Semua 19 file telah diverifikasi ulang dengan grep simbol ekspor dan path di seluruh `src/` dan `tests/`. Seluruh file terkonfirmasi memiliki 0 referensi eksternal (0 false-positives).

| No | File Path | Ekspor yang Dihapus | Status Re-verifikasi | Catatan |
|---|---|---|---|---|
| 1 | `src/components/home/ihsg-mini-chart.tsx` | `IhsgMiniChart` | 0 pemakai di `src/` | Async server comp unreferenced |
| 2 | `src/components/home/for-you-signals.tsx` | `ForYouSignals` | 0 pemakai di `src/` | Komponen lama digantikan MorningDelta |
| 3 | `src/components/article/article-feed.tsx` | `ArticleFeed` | 0 pemakai di `src/` | Dead client feed component |
| 4 | `src/components/stock/stock-ai-panel.tsx` | `StockAiData`, `StockAiPanel` | 0 pemakai di `src/` | Panel lama |
| 5 | `src/components/stock/signal-links.tsx` | `SignalLinks` | 0 pemakai di `src/` | Dead signal nav links |
| 6 | `src/components/stock/related-stocks.tsx` | `RelatedStocks` | 0 pemakai di `src/` | Async server component tanpa pemanggil |
| 7 | `src/components/PaymentButton.tsx` | `PaymentButton` (default) | 0 pemakai di `src/` | Pembayaran memakai drawer baru |
| 8 | `src/app/(public)/berita/berita-grid.tsx` | `buildBeritaUrl`, `BeritaPagination` | 0 pemakai di `src/` | Komponen grid berita lama |
| 9 | `src/components/ui/user-avatar.tsx` | `UserAvatar` | 0 pemakai di `src/` | Unused avatar UI wrapper |
| 10 | `src/components/ui/price-badge.tsx` | `PriceBadge` | 0 pemakai di `src/` | Unused badge UI component |
| 11 | `src/components/ui/border-beam.tsx` | `BorderBeam` | 0 pemakai di `src/` | Port border-beam tanpa pemakai di layout/modal |
| 12 | `src/components/community/leaderboard.tsx` | `Leaderboard` | 0 pemakai di `src/` | Diverifikasi tidak di-import admin/public |
| 13 | `src/components/community/achievement-toast.tsx` | `AchievementToast` | 0 pemakai di `src/` | Unused community toast |
| 14 | `src/components/community/feed-tabs.tsx` | `FeedTabs` | 0 pemakai di `src/` | Unused tab switcher |
| 15 | `src/lib/api-helpers.ts` | `withAuth`, `withOptionalAuth`, `withAdmin`, `apiSuccess`, `apiCreated`, `apiError` | 0 pemakai di `src/` | API routes memakai authService & NextResponse langsung |
| 16 | `src/hooks/use-image-generation.ts` | `useImageGeneration` | 0 pemakai di `src/` | Dead hook |
| 17 | `src/hooks/use-telemetry.ts` | `useTelemetry` | 0 pemakai di `src/` | Dead telemetry hook |
| 18 | `src/hooks/use-realtime-notifications.ts` | `useRealtimeNotifications` | 0 pemakai di `src/` | Polling/socket notifikasi menggunakan hook lain |
| 19 | `src/hooks/use-likes.ts` | `useToggleLike` | 0 pemakai di `src/` | Post card menggunakan use-posts inline mutation |

---

## 3. TASK 2: DRY Konsolidasi

### 2.1 formatRupiah (10 File → `src/lib/format-number.ts`)
Fungsi `formatRupiah(n: number | null): string` ditambahkan ke `src/lib/format-number.ts`:
- Input `null` mengembalikan `"-"`.
- Input `number` diformat menggunakan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
- 10 file yang dikonsolidasikan untuk mengimpor dari `@/lib/format-number`:
  1. `src/components/portfolio/holdings-table.tsx`
  2. `src/components/portfolio/portfolio-summary.tsx`
  3. `src/components/paper-trading/trade-history.tsx`
  4. `src/components/paper-trading/trade-modal.tsx`
  5. `src/components/paper-trading/account-summary.tsx`
  6. `src/components/paper-trading/pending-orders.tsx`
  7. `src/components/paper-trading/topup-modal.tsx`
  8. `src/components/paper-trading/stock-paper-position.tsx`
  9. `src/components/paper-trading/create-account.tsx`
  10. `src/components/paper-trading/positions-table.tsx`

### 2.2 wibDateKey (3 File + 1 Inline → `wibDayKey` di `src/lib/datetime-wib.ts`)
- `src/domains/reputation/daily-award.ts`: Call-site di `dailyCacheKey` direname menjadi `wibDayKey(instant)`. Untuk kompatibilitas backward selftest, diekspor alias `export { wibDayKey as wibDateKey } from "@/lib/datetime-wib"`.
- `src/lib/retention-email.service.ts`: Definisi lokal dihapus, seluruh 7 call-site dimigrasikan memanggil `wibDayKey(...)`.
- `src/domains/stock/pasar-live.service.ts`: Unused helper lokal `wibDateKey` dihapus.
- `src/domains/stock/data-sync.service.ts:196`: Inline `new Date(Date.now() + 7*3600*1000).toISOString().slice(0,10)` diganti dengan `wibDayKey(new Date())`.

### 2.3 timeAgo Admin (2 File → `src/lib/time.ts`)
- `src/app/admin/agent-hub/page.tsx:391`: Definisi lokal dihapus, 2 call-site diganti menjadi `timeAgo(..., "en")`.
- `src/app/admin/agent-hub/[agentType]/page.tsx:1139`: Definisi lokal dihapus, 2 call-site diganti menjadi `timeAgo(..., "en")`.

### 2.4 stripJk Varian — Dibiarkan dengan Alasan
Varian `stripJkExt` dan `stripJkSuffix` yang memiliki variasi case-insensitive regex (`/i`) sengaja tidak disatukan karena perbedaan toleransi format pada upstream provider vs internal routing. Konsolidasi pada fungsi ini memiliki risiko breaking change pada normalisasi ticker.

### 2.5 Ringkasan Count Before vs After

| Pola Grep | Count Baseline | Count Target / Hasil Akhir | Lokasi Tunggal |
|---|---|---|---|
| `function formatRupiah` | 10 | **1** | `src/lib/format-number.ts` |
| `function wibDateKey` | 3 | **0** | Konsolidasi penuh ke `wibDayKey` |
| `function timeAgo` | 3 | **1** | `src/lib/time.ts` |

---

## 4. TASK 3: Empty Catch Logging

1. **`src/app/api/track/pageview/route.ts:173`**
   - Sebelum: `enrichSignupOrigin(userId, ip, path).catch(() => {});`
   - Sesudah:
     ```typescript
     enrichSignupOrigin(userId, ip, path).catch((e) =>
       console.warn("[track] enrichSignupOrigin failed:", e?.message)
     );
     ```
2. **`src/app/api/auth/register/route.ts:24+27`**
   - Sebelum: Dua `.catch(() => {})` pada `user.update` dan `engagementEvent.create`.
   - Sesudah:
     ```typescript
     await prisma.user
       .update({ where: { id: u.id }, data: { initialAnonId: body.anonId } })
       .catch((e) =>
         console.warn("[auth/register] user.update initialAnonId failed:", e?.message)
       );
     await prisma.engagementEvent
       .create({
         data: { anonId: body.anonId, path: "/auth/register", type: "cta_click", label: "daftar_berhasil" },
       })
       .catch((e) =>
         console.warn("[auth/register] anon-merge engagementEvent failed:", e?.message)
       );
     ```

---

## 5. Bukti Fisik & Verifikasi (Definition of Done)

### 5.1 Grep Count Verifikasi
```bash
$ echo "formatRupiah:" && grep -rn "function formatRupiah" src/ && \
  echo "wibDateKey:" && (grep -rn "function wibDateKey" src/ || echo "0 matches") && \
  echo "timeAgo:" && grep -rn "function timeAgo" src/

formatRupiah:
src/lib/format-number.ts:22:export function formatRupiah(n: number | null): string {
wibDateKey:
0 matches
timeAgo:
src/lib/time.ts:1:export function timeAgo(
```

### 5.2 TypeScript Verification (`npx tsc --noEmit`)
- **Baseline:** 0 Error (Exit Code: 0)
- **Sesudah Refactor:** 0 Error (Exit Code: 0)

### 5.3 Unit & Selftest Verification
```bash
✔ formatDecimalId & formatRupiah unit tests (7 passed)
✔ scripts/selftest-reputation-daily.ts (5 passed, 0 fail)
✔ scripts/selftest-retention-email.ts (19 assertion passed, SELFTEST OK)
✔ scripts/selftest/pasar-live-doctrine.selftest.ts (9 pass, 0 fail)
```

### 5.4 Production Build (`npm run build`)
```text
▲ Next.js 16.4.3 (webpack)
- Environments: .env
✓ Compiled successfully in 7.5s
✓ Finished TypeScript in 5.6s
✓ Generating static pages using 9 workers (196/196) in 928ms
Exit Code: 0
BUILD_ID: L0KyUd2TEXEhAJeaKhdAF
```

### 5.5 Git Deletion Verification
19 files removed via `git rm`:
- `src/app/(public)/berita/berita-grid.tsx`
- `src/components/PaymentButton.tsx`
- `src/components/article/article-feed.tsx`
- `src/components/community/achievement-toast.tsx`
- `src/components/community/feed-tabs.tsx`
- `src/components/community/leaderboard.tsx`
- `src/components/home/for-you-signals.tsx`
- `src/components/home/ihsg-mini-chart.tsx`
- `src/components/stock/related-stocks.tsx`
- `src/components/stock/signal-links.tsx`
- `src/components/stock/stock-ai-panel.tsx`
- `src/components/ui/border-beam.tsx`
- `src/components/ui/price-badge.tsx`
- `src/components/ui/user-avatar.tsx`
- `src/hooks/use-image-generation.ts`
- `src/hooks/use-likes.ts`
- `src/hooks/use-realtime-notifications.ts`
- `src/hooks/use-telemetry.ts`
- `src/lib/api-helpers.ts`
