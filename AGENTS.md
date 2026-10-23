<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## API Reuse Rule (owner directive 17 Okt 2026)

Market data = SATU PINTU. Sebelum membuat endpoint/service/fungsi data baru:

1. **REUSE DULU** — cek `src/domains/stock/market-snapshot.service.ts` (EOD movers/breadth/sektor/IHSG), `live-quotes` (intraday live), `technicalAnalysisService` (radar/sinyal), `stockMarketService` (list/detail/compare). Kalau data yang sama sudah ada → pakai/improve yang lama. **JANGAN buat jalur compute baru.**
2. **IMPROVE, BUKAN DUPLIKAT** — kalau endpoint lama kurang (field/filter/cache), extend responsenya dengan backward-compatible shape; konsumen lama tidak boleh putus.
3. **Compute change/breadth/movers DI LUAR snapshot service = DILARANG** — semua prev-close via doctrine LATERAL per-saham, sesi ber-volume asli, EQUITY only, exclude `^` (kecuali IHSG row). Konsistensi cross-page = invariant; tiap deploy market-related WAJIB consistency-test (curl home+/stocks+/api/market, angka Top Gainer identik).
4. Endpoint baru hanya kalau domain benar-benar baru (bentuk data/freshness/konsumen beda) — dan wajib catat alasan di header comment route.

## Project overview

**teknikal.id** — IDX stock data platform (Next.js 16 App Router + React 19 + TypeScript + Prisma + PostgreSQL). Public pages: homepage radar, `/stocks` screener, `/saham/[ticker]` (incl. `kenapa-naik-hari-ini`), `/akademi`, `/pasar` (Koran Saham Live, noindex). Prod = docker compose (`teknikalidnew-app-1`, `-worker-1`, `-db-1`), served at https://teknikal.id.

## Build & test commands

- `npm run dev` — dev server
- `npm run build` — production build (needs DATABASE_URL; most pages are force-dynamic)
- `npm run lint` — eslint
- `npx tsc --noEmit` — typecheck
- `npx prisma validate && npx prisma generate` — schema
- CI runs: install -> prisma validate/generate/db-push -> tsc -> lint -> build (`.github/workflows/ci.yml`)
- Deploy prod: `/deploy` (`.claude/commands/deploy.md`); verify `/qa-check` (`.claude/commands/qa-check.md`)

## Architecture

- `src/domains/stock/` — data layer services (single source of truth for market data)
- `src/app/(public)/` — public routes; `src/app/api/` — REST endpoints
- Worker (separate container, image baked) computes indicators; rebuild required when worker code changes
- DB: PostgreSQL, camelCase tables (`PageView`, `Stock`, `StockPrice`, `createdAt`)

## Conventions

- Agent-org docs live in `docs/agent-org/` (ceo-decisions.md, cto-queue.json, handoff.md) — update bookkeeping on every deploy
- Deploy budget: 2/day routine (owner-directed hotfixes excluded)
- Night train T-MMDD-N: board only verified tasks (DONE-WHEN green with physical proof: curl/grep/SQL count)
- DB access: `docker exec teknikalidnew-db-1 psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"` (role "postgres" does not exist)
- Destructive SQL: conditional — requires fresh backup <24h (`~/backups/teknikalid/`), SELECT COUNT first, narrow WHERE, log rowcount to docs/agent-org/decisions.md. Never touch auth/payments/security/env.
- **GATEGUARD pre-flight (wajib sebelum deploy prod / push-force / destructive SQL / sentuh auth)** — tulis di deliverable dulu, baru eksekusi: `targets:` (ls/SQL eksplisit), `blast:` (apa yang rusak kalau salah), `rollback:` (commit SHA / backup file / image lama). Tanpa blok ini task tidak boleh naik DONE. "Are you sure?" tidak dihitung — hanya fakta.
