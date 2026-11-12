# PRD prd-2026-11-11-01 — Register Funnel Visibility (first-touch attribution lintas OAuth)
Date: 2026-11-11 | Source idea: idea-2026-11-10-1 (CEO mandate 10 Nov, NSR-9Nov rekomendasi #3) | Status: spec_ready
Tree riset: teknikalidnew main@a93c948 (11 Nov; deployed app 22:26 WIB dari a93c948, bus KONDEKTUR-1111)

## Problem
10/13 register 14d (77%) datang TANPA jejak pageview pra-register (blind). Akar (bukti SQL 11 Nov):
- Jalur OAuth Google = 10/13 register, TIDAK PERNAH menulis User.initialAnonId (coverage DB: 3/44 user total).
- src/lib/auth.ts signIn/createUser callback TIDAK menyentuh anonId sama sekali; hanya
  src/app/api/auth/register/route.ts (credentials, 3/13) yang menulis initialAnonId + event daftar_berhasil.
- Attribution first-touch register 14d: 11 no-first-touch, 2 chatgpt.com (keduanya via jalur credentials).
- Banner guest-quota click 7d = 163 (EngagementEvent label ~quota) — tak terhubung ke register (0 atribusi).

## Solusi (pola kanonik researcher 10 Nov: cookie first-touch SEBELUM redirect OAuth)
1. src/proxy.ts: respons page-load TANPA cookie `first_touch` → Set-Cookie first_touch
   (anonId, path, utm_source, referrer domain; SameSite=Lax, maxAge 30d, httpOnly).
   Cookie kedua kali TIDAK menimpa (first-touch menang, bukan last-touch).
2. src/lib/auth.ts (createUser adapter + signIn callback): baca cookie first_touch saat
   account creation → upsert User.initialAnonId + tulis EngagementEvent
   (type=register_step, label=daftar_berhasil_oauth|daftar_berhasil, path=/auth/callback/[provider]|/auth/register).
3. register/route.ts: tambahkan utmSource cookie ke event existing (label tetap camelCase <=64 char).
4. Baseline & laporan per-source: SQL ranking JOIN PageView ON anonId=initialAnonId (dilarang hitung sendiri).

## Out of scope
Migrasi DB kolom baru (fase-2 opsional User.firstTouchSource), ubah UI auth, ubah rate-limit.

## Gate
MENYENTUH AREA AUTH → butuh ACK owner (charter §6 owner-only domain) SEBELUM builder eksekusi.
CEO mandate 10 Nov sudah meminta riset+PRD ini; verdict researcher: BUILD.

## Bukti query (11 Nov ~23:1x WIB, docker exec teknikalidnew-db-1 psql, read-only)
- registers_14d=13; blind(no PageView pra-register via initialAnonId)=10
- provider: google=10, credentials=3 (Account.provider)
- initialAnonId coverage: 3/44 user
- first-touch register 14d: (no-first-touch)=11, chatgpt.com=2
- banner quota click 7d=163; PV 7d utmSource filled=155/1776

## Acceptance criteria
- AC1 curl -I '/?utm_source=x' tanpa cookie → Set-Cookie first_touch; request ke-2 nilai TIDAK berubah.
- AC2 pasca smoke register OAuth: User.initialAnonId terisi + EngagementEvent register_step tercatat (path provider callback).
- AC3 baseline 14d pasca-live: % register ber-first-touch naik dari 23% (3/13); laporan per-source = SQL ranking asli.
- AC4 0 regresi: register credentials + rate-limit 5/jam/IP utuh; smoke pakai anonId prefix qa- (charter §7).
- AC5 tsc EXIT-0 + build EXIT-0; 0 migrasi DB; rollback = revert commit tunggal.

## Metadata v2
impact:4 (North Star GROWTH funnel register buta→terukur; mandat CEO) | effort:3 | risk:medium (auth area + cookie lintas redirect)
db_migrations:false | dependencies:src/proxy.ts (Next proxy), @/lib/auth NextAuth adapter, EngagementEvent+User.initialAnonId existing, cookies() Next15 async
target_files: src/proxy.ts, src/lib/auth.ts, src/app/api/auth/register/route.ts, src/lib/track-share.ts (util event, estimasi)
estimate_tool_calls: 30
