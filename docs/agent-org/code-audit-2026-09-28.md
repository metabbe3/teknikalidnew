# Code Quality Audit — teknikal.id + hivePOS
Tanggal: 2026-09-28 · Scanner: mekanis (tsc/vet/grep/AST) via Code SOP v1.0 · Bukti: angka di bawah

## GATES BASELINE (semua HIJAU ✅)
- teknikal.id: tsc --noEmit 0 error · 680 file TS/TSRC · 80.4k LOC
- hivepos-web: tsc --noEmit 0 error · 580 file · 80.1k LOC (types.ts generated 13.4k)
- hivepos-api: go vet 0 · 37/37 pkg test OK · 129 file Go · 29.1k LOC

## TEMUAN teknikal.id (urut prioritas)

### P1 — kosong! (clean)
- console.log: 0 · ts-ignore: 0 · any: hanya 4 (2 wajar: remark AST + socialLinks)
- 7 empty-catch `catch {}` → P2 (bukan P1: tidak di jalur data-user; base-agent.ts 3x = silent telemetry, events-init 1x = best-effort init)

### P2 — refactor kandidat (ukuran, bukan bug)
- app/admin/agent-hub/[agentType]/page.tsx 1152 baris → extract subkomponen per tab
- app/admin/pipelines/page.tsx 1102 → sama
- app/(public)/stocks/[ticker]/page.tsx 1071 → extract chart/section
- lib/idx-stocks.ts 1032 (data+logic campur) → pisahkan data JSON dari logic
- Catatan: 145 'use client' dari 680 file = rasio sehat (21%)

## TEMUAN hivepos-web

### P2 — type hygiene
- 41 `: any` di app/components/lib (vs 4 di teknikal) → ganti ke contract types (types.ts sudah ada!)
- 5 empty-catch → kasih minimal logger/sentry breadcrumb
- tenant-site/page.tsx 1667 baris → extract section components
- i18n.ts 2943 baris satu file → split per-domain (en/id), lazy-load per route

## TEMUAN hivepos-api (paling substantive)

### P1 — 7 ignored-error di write-path production
- internal/shared/jobs/runrec.go: Complete()/Fail() `_, _ = ExecContext` — job status bisa diam-diam tak terupdate (monitoring bohong). FIX: log error via slog minimal, atau return error.
- 5 sisanya di test/rollback (aman: tx.Rollback after error = idiom benar)

### P2 — error wrapping
- 95 fmt.Errorf tanpa %w — mayoritas message-statis (acceptable), tapi yang membungkus error lain harus %w (audit target: ~20an)

### P2 — god-repositories
- superadmin/repository.go 1993 baris 70 SELECT · reports 1808/50 → split per aggregate (tenants/outlets/audit…), query-builder helper utk filter berulang

## VERDICT
Kedua repo STANDARNYA SUDAH TINGGI (tsc/vet/test hijau semua, console.log 0, ts-ignore 0, konvensi tertulis + lessons-learned). Tech debt = ukuran file (refactor kosmetik-arsitektural) + kebersihan error, BUKAN bug aktif. AegisGo tetap rapi (cover 90.1% gate).

## REKOMENDASI EKSEKUSI (via CTO queue, bukan big-bang)
1. hivePOS-api runrec.go error-log (P1, 30 menit, 1 commit)
2. hivepos-web 41 any → typed (P2, bertahap saat sentuh file — jangan churn)
3. Refactor file >1000 baris SATU PER SATU saat ada feature yang menyentuhnya (avoid cold refactor = regression risk tanpa nilai user)
4. TIDAK perlu: rewrite, framework change, mass-rename — return rendah, risiko tinggi
