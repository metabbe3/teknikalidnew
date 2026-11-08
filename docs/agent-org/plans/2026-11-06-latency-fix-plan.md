# Rencana Eksekusi Perbaikan Latency `teknikal.id` & `agentd` (L1–L5)

- **Sumber Audit**: `/Users/nicholasandriansurjadi/Documents/teknikalidnew/docs/agent-org/audits/2026-11-06-latency-audit.md` (pengukuran nyata 6 Nov 2026, ~21:20–21:30 WIB)
- **Target Owner**: Seluruh endpoint publik & panggilan internal `agentd` **< 200–300 ms** pada kondisi **cold (cache-miss)** maupun **warm (cache-hit)**, **0 error HTTP 500**, dan **0 self-429**.
- **Prinsip Eksekusi**: Tiap fase (`L1`..`L5`) mandiri (*satu-dispatch-Flash-ready*), tanpa migrasi skema Prisma destruktif, dan menjaga kompatibilitas mundur penuh pada kontrak JSON.

## Ringkasan Fase & Target Metrik

| Fase | Fokus Perbaikan | Repo | Diff | Baseline Nyata (Audit) | Target Pasca-Fix |
|---|---|---|---:|---|---|
| **L1** | Raw SQL `JOIN LATERAL` (pengganti Prisma `include` top-N), filter `latestDate` radar, cache custom screener, pisah cache swing | Web | **M** | Radar cold `1.667 ms`, `/api/stocks` cold `1.502 ms`, Screener custom `396 ms` tiap hit, Swing cold `1.314 ms`/60s | Semua cold **< 40 ms** (swing re-hit 15m **< 20 ms**), warm **< 8 ms** |
| **L2** | Fix HTTP 500 `morning-delta` (`Date` vs `string`), guard `marketOpen` & empty join di `live-quotes`, paralelisasi fallback Yahoo v8 | Web | **S** | `morning-delta` **HTTP 500**, `live-quotes` cold malam `243–494 ms` | `morning-delta` **200 (< 15 ms)**, `live-quotes` malam **< 15 ms**, jam buka **< 250 ms** |
| **L3** | Endpoint baru `GET /api/stocks/batch`, mode ringan `/api/stocks?mode=universe`, filter `?s=` di `/api/stocks/sparkline` | Web | **M** | N× roundtrip per-ticker; universe `1.502 ms` (`211 KB`); sparkline selalu `33 KB` | Batch 10 saham **< 20 ms** (1 call); universe **< 5 ms** (`~18 KB`); sparkline subset **< 1 KB** |
| **L4** | `agentd` konsumsi endpoint batch, skip `live-quotes` malam + hapus double-fetch, whitelist `mService-Token` di `proxy.ts` | Web + Agent | **M** | 20–30 HTTP req per batch 10 saham + risiko HTTP 429 (`120 req/60s`) + retry `6s` | **1–2 HTTP req** per batch (**< 50 ms** total), **0 HTTP 429**, **0 call** ke `/api/market/quote` |
| **L5** | *(Opsional bila L1–L4 mulus)* Diet payload `/api/stocks` (`211 KB` → mode ringan untuk search/default, `?mode=full` eksplisit) | Web | **S** | `HeroSearch` & `TickerSearchModal` unduh `211 KB` penuh di beranda/detail | Payload search/ringan **< 50 KB** (`< 10 KB` gzip), cold **< 15 ms** |

## Protokol Build, Deploy & Guard Global (Wajib Dipatuhi Eksekutor)

1. **Deploy Repo Web (`/Users/nicholasandriansurjadi/Documents/teknikalidnew`)**:
   - Build **WAJIB SEKUENSIAL satu container** (`app` saja, jangan paralel dengan `worker`) dengan batas memori Node:
     ```bash
     cd /Users/nicholasandriansurjadi/Documents/teknikalidnew
     NODE_OPTIONS="--max-old-space-size=2048" docker compose build app && docker compose up -d app
     docker cp docs/agent-org/ops/isr-warmup.js teknikalidnew-app-1:/tmp/isr-warmup.js
     docker exec teknikalidnew-app-1 node /tmp/isr-warmup.js http://localhost:3000
     ```
2. **Deploy Repo Agent (`/Users/nicholasandriansurjadi/Documents/teknikal-agent`)**:
   - Build binary Go lalu timpa binary aktif `/tmp/agentd_pulse` dan matikan PID lama agar `launchd` (`KeepAlive`) menghidupkan ulang otomatis:
     ```bash
     cd /Users/nicholasandriansurjadi/Documents/teknikal-agent
     go build -o agentd ./cmd/agentd && cp agentd /tmp/agentd_pulse && kill $(pgrep -f /tmp/agentd_pulse)
     ```
3. **Guard Global Lintas Fase**:
   - **Kontrak JSON Utuh**: Dilarang menghapus atau mengubah nama/tipe field response JSON yang sudah ada; hanya boleh menambah field opsional atau cabang query param eksplisit (`?mode=...`, `?s=...`).
   - **Jangan Pecah SSR/Hydration**: Jangan mengubah struktur DOM atau *initial state* komponen SSR yang bergantung pada props server.
   - **Zona Terlarang**: **DILARANG** menyentuh sanitizer maupun Midtrans (`src/lib/sanitize*`, `src/app/api/payment/**`, variabel `MIDTRANS_*` di repo web; serta paket `internal/sanitizer/**` di repo agent).

---

## Fase L1 — Query DB `JOIN LATERAL`, Filter `latestDate` Radar, Cache Screener & TTL Swing

### GOAL Metrik Target
- `GET /api/stocks` (cold): **1.501,64 ms → < 35 ms** (warm **< 6 ms**)
- `GET /api/stocks/radar` & `?assetClass=EQUITY` (cold): **1.667,43 ms → < 25 ms** (warm **< 5 ms**)
- `GET /api/screener?exclude_gorengan=true` (custom filter): **396,26 ms tiap hit → cold < 35 ms, warm < 5 ms**
- `GET /api/market/swing`: frekuensi penalti backtest turun dari tiap **60 detik** menjadi **1x per sesi EOD**, re-hit kandidat tiap 15 menit **< 20 ms** (warm **< 4 ms**)
- Pembacaan sekuensial Postgres (`pg_stat_user_tables.seq_tup_read` pada `StockPrice` & `StockIndicator`): turun dari **+553.721 s/d +1.082.862 baris/hit → +0 baris**

### FILE Path Eksak (Repo Web)
1. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock.repository.ts` (baris `227-263`, `374-405`, `699-710`)
2. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/screener-analysis.service.ts` (baris `120-141`, `204-286`, `330-482`, `505-521`)
3. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock-market.service.ts` (baris `191-253`, `788-790`)
4. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock-graph.service.ts` (baris `32-63`)
5. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/admin/tickers/route.ts` (baris `26-53`)
6. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/market/swing/route.ts` (baris `54-64`, `147-189`)

### LANGKAH Konkret
1. **Perkaya `findLatestBarsWithPrev` (`stock.repository.ts:374-405`)**:
   - Tambahkan `lb.open::float8 AS open, lb.high::float8 AS high, lb.low::float8 AS low` pada klausa `SELECT` baris `381` dan petakan sebagai `number | null` pada `Map` hasil (dibutuhkan `calculatePivotPoints(high, low, close).s1` di radar). Pertahankan `LEFT JOIN LATERAL` (ubah `JOIN LATERAL` baris `383` menjadi `LEFT JOIN LATERAL` sesuai komentar baris `372` agar emiten IPO 1 bar tetap kembali dengan `prevClose: null`).
2. **Ganti `findActiveStocksWithPrices` (`stock.repository.ts:227-238`) dengan SQL `LEFT JOIN LATERAL`**:
   - Ganti `prisma.stock.findMany({ include: { prices: { take: 6 }, indicators: { take: 1 } } })` menjadi satu query `prisma.$queryRaw` atas `"Stock" s`:
     - Filter dinamis `s."isActive" = true` (kecuali opsi `includeInactive: true`), opsional `s.sector = ...` dan `s."assetClass"::text = ...`, urut `ORDER BY s.ticker ASC`.
     - `LEFT JOIN LATERAL (SELECT close, volume, date FROM "StockPrice" WHERE "stockId" = s.id AND volume > 0 ORDER BY date DESC LIMIT 1) lb ON true`.
     - `LEFT JOIN LATERAL (SELECT close FROM "StockPrice" WHERE "stockId" = s.id AND volume > 0 AND date < lb.date AND NOT (close = lb.close AND volume = lb.volume) ORDER BY date DESC LIMIT 1) prev ON true` (mengadopsi logika `dedupeStalePrices` langsung via indeks `"StockPrice_stockId_date_idx"`).
     - Bila `includeIndicators !== false`, sertakan `LEFT JOIN LATERAL (SELECT rsi14, sma20, "signalScore", "signalLabel", "isGorengan" FROM "StockIndicator" WHERE "stockId" = s.id AND interval = '1d' ORDER BY date DESC LIMIT 1) si ON true`.
   - Sesuaikan keempat pemanggil agar membaca field angka hasil lateral (`close, prevClose, volume, date, rsi14, sma20, signalScore, signalLabel, isGorengan`) menggunakan `marketEngine.pctChange(close, prevClose)`:
     - `stock-market.service.ts:191-253` (`getStockList` & `getCryptoList`),
     - `stock-graph.service.ts:32-63` (`computeNeighbors`),
     - `src/app/api/admin/tickers/route.ts:26-53` (ganti juga cabang `includeInactive` baris `28-32` agar memakai fungsi lateral yang sama dengan `includeInactive: true`).
3. **Perbaiki `findOversoldStocks` (`stock.repository.ts:240-263`) & `_radarUncached` (`screener-analysis.service.ts:204-286`)**:
   - Ubah signature menjadi `findOversoldIndicatorsByDate(latestDate: Date, assetClass?: "EQUITY" | "CRYPTO")` yang melakukan `prisma.stockIndicator.findMany` pada `where: { date: latestDate, interval: INTERVAL.DAY, stock: { isActive: true, ...(assetClass ? { assetClass } : {}) }, OR: [{ rsi14: { gt: 0, lte: 30 } }, { AND: [{ stochK: { gt: 0, lte: 20 } }, { stochD: { gt: 0, lte: 20 } }] }] }` dengan `include: { stock: { select: { id: true, ticker: true, name: true, sector: true } } }` — langsung memicu partial index `"StockIndicator_oversold_screen_idx"`.
   - Di `_radarUncached` (`screener-analysis.service.ts:218`), ambil `latestDateRow = await stockRepository.getLatestIndicatorDate(assetClass)` (jika kosong return `[]`), panggil `findOversoldIndicatorsByDate(latestDateRow.date, assetClass)`, lalu ambil harga & `high`/`low`/`prevClose`/`volume` lewat `stockRepository.findLatestBarsWithPrev(stockIds)`. Hitung `changePercent` via `marketEngine.pctChange(bar.close, bar.prevClose)` dan `support1` via `calculatePivotPoints(bar.high, bar.low, bar.close).s1`.
4. **Hapus nested `prices` dari `findIndicatorsByDate` (`stock.repository.ts:699-710`)**:
   - Ubah `include` menjadi `{ stock: { select: { id: true, ticker: true, name: true, sector: true } } }`.
   - Pada ketiga pemanggil di `screener-analysis.service.ts` — baris `121` (`_screenerQueryUncached`), baris `398` (`customScreenerQuery`), dan baris `506` (`dailyRadarService.getDailyRadar`) — ambil harga untuk `results.map((r) => r.stockId)` menggunakan `await stockRepository.findLatestBarsWithPrev(stockIds)` lalu hitung `close`, `changePercent`, dan `volume` dari map tersebut.
5. **Pasang Cache EOD pada `customScreenerQuery` (`screener-analysis.service.ts:330-482`)**:
   - Buat kunci deterministik dari parameter `filters` yang dinormalisasi & diurutkan (mis. `JSON.stringify` atas key terurut, termasuk `sector` yang di-sort), lalu bungkus eksekusi query di dalam `cachedEod(eodKey("screener-custom", filterHash), ...)` (TTL default 300s, otomatis di-clear oleh `clearEodCaches()` saat cron `sync-eod` di `src/app/api/cron/sync-eod/route.ts:36`). Saring output akhir dengan `excludeIndexRows(...)` agar `^JKSE` tidak bocor.
6. **Perpanjang TTL & Pisahkan Cache Backtest di `/api/market/swing` (`src/app/api/market/swing/route.ts:54-64, 147-189`)**:
   - Naikkan `CACHE_TTL_MS` response dari `60 * 1000` menjadi `15 * 60 * 1000` (15 menit).
   - Simpan cache terpisah khusus hasil `backtest` (`{ asOf: string; expiresAt: number; stats34: SwingStats; stats20: SwingStats }`) ber-TTL `6 * 60 * 60 * 1000` (6 jam) yang di-key dengan `asOfStr` (`latestDate`). Jika `cachedBacktest?.asOf === asOfStr && now < cachedBacktest.expiresAt`, lewati query `backtestRowsRaw` 24 bulan (`320.084` baris) dan pakai `stats34`/`stats20` dari memori.

### GUARD Fase L1
- Jangan memanggil `.equals()` pada hasil `close` float dari `$queryRaw` (deduplikasi bar stale sudah ditangani di klausa `NOT (close = lb.close AND volume = lb.volume)` SQL).
- Pastikan seluruh kolom response `StockListRow`, item radar (`support1`, `isDeepOversold`, `hasVolumeSpike`, `upsideToSma20`), screener, `DailyRadarItem`, `/api/admin/tickers`, dan `SwingMarketResponse` tetap persis sama nama maupun tipenya.
- Jangan menyentuh file sanitizer atau Midtrans.

### VERIFIKASI Fase L1
1. Typecheck wajib lulus bersih: `cd /Users/nicholasandriansurjadi/Documents/teknikalidnew && npx tsc --noEmit`.
2. Catat baseline `seq_scan` & `seq_tup_read` sebelum hit:
   ```bash
   docker exec teknikalidnew-db-1 psql -U teknikalid -d teknikalid -c \
     "SELECT relname, seq_scan, seq_tup_read FROM pg_stat_user_tables WHERE relname IN ('StockPrice','StockIndicator');"
   ```
3. Setelah deploy container `app` (sekuensial), jalankan `curl -s -o /dev/null -w '%{http_code} %{size_download} %{time_total}\n'` masing-masing 3x pada:
   - `http://localhost:3000/api/stocks` (target Run 1 cold `< 0.040s`, Run 2–3 `< 0.008s`, size ~211KB)
   - `http://localhost:3000/api/stocks/radar` & `?assetClass=EQUITY` (target Run 1 cold `< 0.030s`, Run 2–3 `< 0.006s`)
   - `http://localhost:3000/api/screener?exclude_gorengan=true&price_min=51` (target Run 1 cold `< 0.040s`, Run 2–3 `< 0.006s`)
   - `http://localhost:3000/api/market/swing` (Run 2–3 `< 0.005s`, tidak ada lagi lonjakan 1,3s tiap 60 detik)
4. Jalankan ulang query `pg_stat_user_tables` di langkah 2 sesudah panggilan cold `/api/screener?exclude_gorengan=true&price_min=52` dan pastikan kenaikan `seq_tup_read` pada `StockPrice` adalah **`0`** (turun dari `+553.721`).

- **Ukuran Diff**: **M** (~140–180 baris perubahan bersih pada 6 file).

---

## Fase L2 — Bug HTTP 500 `morning-delta`, Guard `marketOpen` `live-quotes` & Konkurensi Yahoo v8

### GOAL Metrik Target
- `GET /api/me/morning-delta?tickers=BBCA.JK,ARKO.JK`: **HTTP 500 → HTTP 200 (< 15 ms)**
- `GET /api/live-quotes?s=BBCA` & `?s=XXXX` saat pasar tutup (`CLOSED_WIB`): **351,72 ms – 493,88 ms → < 15 ms** (**0** fetch eksternal ke TradingView/Yahoo; **0** error `Prisma.join([])`)
- `GET /api/live-quotes?s=...` saat pasar buka (multi-ticker termasuk simbol fallback v8): **< 250 ms** cold, **< 8 ms** warm

### FILE Path Eksak (Repo Web)
1. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock.repository.ts` (baris `141-151`, `1316-1343`)
2. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/morning-delta.service.ts` (baris `156-162`, `186-192`)
3. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/live-quotes/route.ts` (baris `14-16`, `50-98`)
4. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/lib/yahoo-finance.ts` (baris `284-296`)

### LANGKAH Konkret
1. **Fix `Date` vs `string` dari `jsonb_agg` di `morning-delta`**:
   - Di `stock.repository.ts:147-149` (`findStocksWithIndicatorHistoryLateral`), konversi setiap elemen `r.indicators` sehingga properti `date` selalu berupa instance `new Date(ind.date as string | Date)` (bukan raw ISO string dari Postgres `jsonb_build_object`).
   - Di `morning-delta.service.ts:156-160` (`getDeltaForTickers`) dan `186-190` (`getMorningDelta`), tambahkan normalisasi defensif `.map((d) => (d instanceof Date ? d : new Date(d)))` dan `.filter((d) => !Number.isNaN(d.getTime()))` sebelum `.sort((a, b) => b.getTime() - a.getTime())`.
2. **Guard Empty Array sebelum `Prisma.join` di `findPrevClosesByTicker` (`stock.repository.ts:1319-1334`)**:
   - Tepat setelah `const stocks = await prisma.stock.findMany(...)` (baris `1322`), tambahkan `if (stocks.length === 0) return new Map<string, number>();` untuk mencegah `TypeError` pada `Prisma.join([])` saat seluruh ticker input tidak terdaftar (`XXXX.JK`).
3. **Pindahkan Guard `marketOpen` ke Sebelum `fetchQuotesBatch` di `src/app/api/live-quotes/route.ts:50-98`**:
   - Pindahkan perhitungan `nowWib`, `wibDay`, `wibMinutes`, dan `marketOpen` (baris `72-76`) ke **atas baris `51`**.
   - **Cabang `!marketOpen`**:
     - Jangan panggil `fetchQuotesBatch(tickers)` sama sekali.
     - Eksekusi `const [eodPrev, eodLatest] = await Promise.all([findPrevClosesByTicker(tickers), findPrevClosesByTicker(tickers, { includeToday: true })])` (dibungkus `try/catch` yang sama).
     - Bangun array `closed: LiveQuoteRow[]` dari `tickers.map((ticker) => ({ ticker, price: (eodLatest.get(ticker) ?? eodPrev.get(ticker)) ?? null, change: null, changePercent: null, volume: null, dayHigh: null, dayLow: null, open: null, prevClose: eodPrev.get(ticker) ?? null, marketState: "CLOSED_WIB" }))`.
     - Simpan ke `CACHE` dengan TTL malam lebih panjang `CLOSED_TTL_MS = 5 * 60 * 1000` (300 detik) dan kembalikan `{ quotes: closed, ts: Date.now() }`.
   - **Cabang `marketOpen`**:
     - Jalankan paralel `const [results, eodPrev] = await Promise.all([fetchQuotesBatch(tickers), findPrevClosesByTicker(tickers).catch((e) => { console.error(...); return new Map<string, number>(); })])` (hapus pemanggilan `includeToday: true` yang tidak pernah dipakai saat pasar buka). Simpan ke `CACHE` dengan `TTL_MS = 60 * 1000`.
4. **Paralelkan Fallback Yahoo v8 di `src/lib/yahoo-finance.ts:284-296`**:
   - Ganti loop sekuensial `for (const entry of results) { ... await fetchQuoteV8(entry.ticker); }` dengan `Promise.all` menggunakan pembatas konkurensi `pLimit(6)` (`p-limit` sudah menjadi dependensi di `package.json`) atas subset `results.filter((e) => e.quote == null || e.quote.regularMarketPrice == null)`.

### GUARD Fase L2
- **WAJIB pertahankan** `change: null` dan `changePercent: null` pada payload `CLOSED_WIB` di `/api/live-quotes`! Komponen `LivePrice` client mengandalkan `changePercent: null` agar tidak menimpa persentase EOD SSR di header dengan `-0%` (lihat komentar owner 21 Okt di `live-quotes/route.ts:67-71`).
- Kontrak `MorningDelta` (`{ data: { asOf, trackedCount, bullets } }`) tidak boleh berubah bentuk.

### VERIFIKASI Fase L2
1. Typecheck lulus: `cd /Users/nicholasandriansurjadi/Documents/teknikalidnew && npx tsc --noEmit`.
2. Deploy `app` (sekuensial), lalu uji dengan `curl`:
   - `curl -s -w '\n%{http_code} %{time_total}\n' 'http://localhost:3000/api/me/morning-delta?tickers=BBCA.JK,ARKO.JK'` → wajib **HTTP 200**, JSON valid memiliki `data.trackedCount: 2` dan `data.asOf` string ISO, waktu **< 0.020s**.
   - `curl -s -w '\n%{http_code} %{time_total}\n' 'http://localhost:3000/api/live-quotes?s=BBNI,ASII,UNVR,ZZZZ'` (saat pasar tutup) → wajib **HTTP 200**, `marketState: "CLOSED_WIB"`, cold **< 0.020s** (turun dari ~350–494 ms), dan `docker logs teknikalidnew-app-1 --tail 30` bersih dari `[LiveQuotes] EOD prev lookup failed`.

- **Ukuran Diff**: **S** (~65–85 baris perubahan pada 4 file).

---

## Fase L3 — Endpoint Batch `GET /api/stocks/batch`, Mode `universe` & Filter Sparkline

### GOAL Metrik Target
- `GET /api/stocks/batch?s=BBCA,BBRI,BMRI,TLKM,ARKO` (baru, hingga 25 ticker): cold **< 25 ms**, warm **< 5 ms** dalam 1 roundtrip HTTP
- `GET /api/stocks?mode=universe`: cold **< 5 ms**, warm **< 2 ms**, payload **~18 KB** (turun dari `211 KB` / `1.502 ms`)
- `GET /api/stocks/sparkline?s=BBCA,ARKO`: **< 5 ms**, payload **< 400 B** (turun dari `33.286 B`)
- Konsumen SSR internal `getStockBatchWithIndicators` (`page.tsx`, `stocks/[ticker]/page.tsx`, `indeks/[slug]/page.tsx`, `berita/[slug]/page.tsx`): **0 seq scan** pada `StockPrice`

### FILE Path Eksak (Repo Web)
1. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock.repository.ts` (baris `74-83`, `186-191`)
2. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock-market.service.ts` (baris `161-222`, `509-532`)
3. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/lib/validation.ts` (baris `199-203`)
4. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/stocks/route.ts` (baris `8-18`)
5. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/stocks/sparkline/route.ts` (baris `1-14`)
6. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/stocks/batch/route.ts` *(file baru)*

### LANGKAH Konkret
1. **Upgrade Batch Repository ke `JOIN LATERAL` (`stock.repository.ts`)**:
   - Tambahkan `findStockUniverse(sector?: string)` yang menjalankan `prisma.stock.findMany({ where: { isActive: true, assetClass: "EQUITY", ...(sector ? { sector } : {}) }, select: { ticker: true, name: true, sector: true }, orderBy: { ticker: "asc" } })`.
   - Tambahkan `findStocksBatchLateral(tickers: string[])` yang menormalisasi input (`BBCA` → `BBCA.JK`, tetap dukung `^JKSE`), mengambil baris aktif dari `"Stock"`, menggabungkan OHLCV terbaru + `prevClose` non-stale lewat `LEFT JOIN LATERAL` pada `"StockPrice"`, `batchGetWeek52HighLow(stockIds)` paralel dengan `prisma.stockIndicator.findMany` untuk baris indikator terbaru per `stockId` (`DISTINCT ON ("stockId") ... WHERE interval = '1d' ORDER BY "stockId", date DESC` atau query terindeks setara).
   - Arahkan `stockMarketService.getStockBatchWithIndicators(tickers)` (`stock-market.service.ts:161-189`) agar memakai `findStocksBatchLateral(tickers)` sambil **mempertahankan return shape persis sama** untuk ke-4 halaman SSR pemanggilnya.
2. **Buat Service & Route `GET /api/stocks/batch` (`src/app/api/stocks/batch/route.ts`)**:
   - Tambahkan `stockMarketService.getStockDetailsFullBatch(tickers: string[])` berbasis `findStocksBatchLateral` + `serializeIndicator`, di-cache per kunci terurut di `stockCache` (`TTL 60_000 ms`).
   - Buat `src/app/api/stocks/batch/route.ts` (`export const dynamic = "force-dynamic"`):
     - Parse query `?s=BBCA,BBRI,...` (split koma, trim, uppercase, normalisasi suffix `.JK` kecuali mengandung `.` atau diawali `^`, deduplikasi, batas maks `25` ticker; bila kosong balas `400 { error: "Parameter s wajib diisi" }`).
     - Kembalikan `200 { items: [...] }` dalam urutan input, di mana **setiap elemen memiliki field identik dengan `GET /api/stocks/[ticker]`** (`src/app/api/stocks/[ticker]/route.ts:15-31`: `ticker, name, sector, close, change, changePercent, volume, open, high, low, prevClose, date, week52High, week52Low, indicators`). Ticker yang tidak ditemukan cukup dilewati dari `items` (jangan gagalkan seluruh batch dengan 404).
     - Catatan routing Next.js App Router: segmen statis `api/stocks/batch` otomatis diprioritaskan di atas segmen dinamis `api/stocks/[ticker]` (sama seperti `radar`, `compare`, dan `sparkline`).
3. **Tambahkan `?mode=universe` pada `GET /api/stocks`**:
   - Di `src/lib/validation.ts:200` (`schemas.stockList`), ubah menjadi `z.object({ sector: z.string().optional(), mode: z.enum(["universe", "full"]).optional() })`.
   - Di `stock-market.service.ts`, tambahkan `getStockUniverse(sector?: string)` ber-cache `stockCache` (`stock-universe:equity:${sector ?? "all"}`, TTL `300_000` ms).
   - Di `src/app/api/stocks/route.ts`, jika `data.mode === "universe"` kembalikan `NextResponse.json(await stockMarketService.getStockUniverse(data.sector))`; selain itu jalankan `getStockList(data.sector)` seperti semula.
4. **Tambahkan Filter Opsional `?s=` pada `GET /api/stocks/sparkline`**:
   - Ubah `getSparklines(tickers?: string[])` di `stock-market.service.ts:509`: tetap hitung & cache map penuh `"sparklines"` di `stockCache` (TTL `300_000` ms); bila `tickers` diberikan dan tidak kosong, normalisasi ke `.JK` dan kembalikan objek subset hanya untuk ticker yang cocok.
   - Di `src/app/api/stocks/sparkline/route.ts:7`, ubah `GET(request: NextRequest)` untuk mem-parse `request.nextUrl.searchParams.get("s")` (maks 120 simbol) dan meneruskannya ke `getSparklines(tickers)`. Tanpa `?s=`, output identik 100% dengan sebelumnya.

### GUARD Fase L3
- Jangan mengubah `findStocksByTickersWithIndicators` lama jika masih dipakai oleh `thesis.service.ts:90,124` dan `article-fact-check.ts:111,139,178`, kecuali return type Prisma-nya tetap identik. Membuat fungsi baru `findStocksBatchLateral` jauh lebih aman dan nol risiko kompilasi silang.
- Panggilan `GET /api/stocks` dan `GET /api/stocks/sparkline` tanpa query param wajib menghasilkan struktur JSON yang 100% identik dengan saat ini.

### VERIFIKASI Fase L3
1. Typecheck lulus: `cd /Users/nicholasandriansurjadi/Documents/teknikalidnew && npx tsc --noEmit`.
2. Deploy `app` (sekuensial + `isr-warmup.js`), lalu uji `curl -s -o /dev/null -w '%{http_code} %{size_download} %{time_total}\n'`:
   - `http://localhost:3000/api/stocks/batch?s=BBCA,BBRI,BMRI,TLKM,ARKO,XXXX` → `200`, `items.length === 5` (memuat 24 indikator lengkap per saham), cold `< 0.025s`, warm `< 0.005s`.
   - `http://localhost:3000/api/stocks?mode=universe` → `200`, size `~15.000–25.000` bytes, cold `< 0.005s`.
   - `http://localhost:3000/api/stocks/sparkline?s=BBCA,ARKO` → `200`, size `< 400` bytes; tanpa `?s=` tetap `~33.286` bytes.

- **Ukuran Diff**: **M** (~130–170 baris perubahan pada 5 file + 1 file route baru).

---

## Fase L4 — `agentd` Pakai Batch HTTP, Skip `live-quotes` Malam & Anti Self-429

### GOAL Metrik Target
- Eksekusi batch 10 saham di `agentd` (`get_stock_snapshot`, `get_technicals`, `compare_stocks`, `portfolio_calc`): turun dari **20–30 HTTP request** menjadi **1–2 HTTP request (< 50 ms total HTTP)**
- `FetchQuote` tunggal di luar jam bursa (`frozen`): turun dari **2 HTTP request (~360 ms)** menjadi **1 HTTP request (~6–8 ms)**, **0 call** ke `/api/live-quotes` dan **0 call** ke kontrak mati `/api/market/quote`
- Startup/refresh `TickerUniverse.Refresh`: turun dari **1.502 ms (`211 KB`) → < 5 ms (`~18 KB`)**
- Burst > 120 request/menit dari `agentd` ber-header `mService-Token` valid ke `proxy.ts`: **0 respons HTTP 429**

### FILE Path Eksak (Repo Web + Repo Agent)
1. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/docker-compose.yml` (baris `22-26`)
2. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/proxy.ts` (baris `224-289`)
3. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/datasource.go` (baris `37-43`, `228-371`, `437-515`, `723-828`)
4. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/client.go` (baris `290-413`)
5. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/snapshot.go` (baris `114-258`)
6. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/technicals.go` (baris `179-228`)
7. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/compare.go` (baris `165-179`)
8. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/portfolio_calc.go` (baris `117-131`)
9. `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/router/ticker.go` (baris `293-304`)

### LANGKAH Konkret
1. **Whitelist `mService-Token` di `src/proxy.ts` & Wiring Env `docker-compose.yml` (Repo Web)**:
   - Di `docker-compose.yml` pada `services.app.environment` (sekitar baris `22`), tambahkan `- SERVICE_TOKEN=${SERVICE_TOKEN:-}`, dan pastikan `.env` memiliki `SERVICE_TOKEN` yang nilainya sama persis dengan `AGENTD_API_SERVICE_TOKEN` milik `agentd`.
   - Di `src/proxy.ts`, tambahkan helper `isTrustedServiceRequest(request: NextRequest): boolean` menggunakan `timingSafeEqual` dari `crypto` (pola `src/lib/cron-guard.ts:10-24`, *fail-closed* bila `process.env.SERVICE_TOKEN` kosong). Jika `true`, lompati rate-limiter `rateLimitMap` (`120 req/60s` di baris `242`), `isBlocked(ip)` (baris `257`), dan `stockApiRateLimitMap` (baris `270`). **Jangan** lompati guard `/api/auth/*` atau `/api/admin/*`.
2. **Naikkan Cap Ukuran Body Khusus Endpoint Batch di `datasource.go:818-825` (Repo Agent)**:
   - Saat ini `fetchHTTPNetwork` memotong semua respons di `MaxToolResponseBytes` (`4096` B), padahal 10 saham dari `/api/stocks/batch` berukuran `~8 KB`. Buat helper `maxResponseBytes(endpoint string) int64` yang mengembalikan `64 * 1024` (64 KB) khusus untuk `"/api/stocks/batch"` dan `"/api/live-quotes"`, serta tetap `MaxToolResponseBytes` (`4096` B) untuk seluruh endpoint lainnya.
3. **Skip `live-quotes` Malam Hari, Hapus Double-Fetch `ohlcIncomplete` & Matikan `fetchLegacyQuote` (`datasource.go:228-294`)**:
   - Di `FetchQuote`:
     - Bila `CachePhase(now, t.holidays) == "frozen"` (malam pasca 16:15 WIB, pra-08:55 WIB, akhir pekan, libur): panggil `t.fetchStockSnapshot(ctx, cleanSym, now)` (`/api/stocks/{sym}`) **lebih dulu**; bila sukses simpan ke `t.saveCache` dan langsung return. Hanya bila gagal (mis. `httptest` mock unit test yang hanya menyediakan `/api/live-quotes`), fallback ke `t.fetchLiveQuotes(ctx, cleanSym, now)`.
     - Bila fase `"open"` atau `"settlement"`: panggil `t.fetchLiveQuotes` lebih dulu; **hapus** pemicu `ohlcIncomplete` umum dan hanya merge `fetchStockSnapshot` apabila `quote.MarketStatus == "PASAR TUTUP"` atau `marketState == "CLOSED_WIB"` (mencegah saham suspensi/belum trade menembak 2 request).
   - Di baris `286-291`, batasi pemanggilan `t.fetchLegacyQuote` (`/api/market/quote`) **hanya saat `t.db == nil`** (konsisten dengan guard `FetchFundamental` baris `554` dan `FetchFundFlow` baris `626`).
4. **Implementasi `FetchQuotesBatch` & `FetchStocksBatch` (`datasource.go` & `client.go`)**:
   - Tambahkan `FetchQuotesBatch(ctx context.Context, symbols []string) map[string]*QuoteOutput` pada `TeknikalLive` (dan wrapper di `APIClient` yang menormalisasi simbol via `TickerValidator`):
     - Ambil simbol yang sudah hit di `t.cache`; untuk sisanya: saat `"frozen"` panggil `FetchStocksBatch`, saat `"open"`/`"settlement"` panggil `GET /api/live-quotes?s=SYM1,SYM2,...` (chunk maks 50 simbol/call), parse `liveQuotesResponse`, simpan ke `t.saveCache`, dan kembalikan map hasil.
   - Tambahkan `FetchStocksBatch(ctx context.Context, symbols []string) (map[string]*QuoteOutput, map[string]*TechnicalsOutput, error)` yang memanggil `GET /api/stocks/batch?s=SYM1,SYM2,...` (chunk maks 25 simbol/call), mendecode `{ items: [...] }` ke gabungan field snapshot + `stockDetailResponse`, mengisi `t.saveCache` untuk setiap `QuoteOutput`, dan mengembalikan kedua map sekaligus.
5. **Hubungkan ke `snapshot.go`, `technicals.go`, `compare.go`, `portfolio_calc.go` dengan Fallback Ramah-Test**:
   - **`snapshot.go`**:
     - Di `fetchSingleSnapshot` (`114-201`): saat `CachePhase == "frozen"`, ambil `/api/stocks/{sym}` satu kali untuk mengisi `out.Quote` sekaligus `out.Technicals`.
     - Di `fetchManySnapshots` (`209-258`): panggil `FetchStocksBatch` (dan `FetchQuotesBatch` bila pasar buka) di awal atas slice `active`. Untuk tiap simbol yang hadir di map batch, isi `Quote` & `Technicals` langsung dan jalankan hanya `fundamental` + `fundflow` (`t.db`); bila batch endpoint mengembalikan error/kosong (mis. pada `httptest` mock lama di `batch_test.go`), fallback mulus ke `fetchSingleSnapshot` per simbol.
   - **`technicals.go:179-228` (`fetchManyTechnicals`)**: panggil `client.FetchStocksBatch` lebih dulu; simbol yang absen karena mock server lama di-fallback ke `client.FetchTechnicals`.
   - **`compare.go:165-179` & `portfolio_calc.go:117-131`**: panggil `FetchQuotesBatch` atas daftar simbol valid sebelum `taskx.RunBoundedBatch` sehingga pemanggilan `FetchQuote` di dalam worker langsung membaca cache memori (`0 ms`) atau fallback per-ticker bila salah satu gagal.
6. **Arahkan Universe Refresh ke Mode Ringan (`internal/router/ticker.go:299`)**:
   - Ubah urutan percobaan di `Refresh`: coba `"/api/stocks?mode=universe"` lebih dulu, fallback ke `"/api/stocks"`, lalu `"/api/market/universe"`.

### GUARD Fase L4
- **DILARANG** mengubah file apa pun di `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/sanitizer/**`.
- Seluruh unit test eksisting di `datasource_test.go` (termasuk `TestTeknikalLive_MappingLiveQuotes` walau dijalankan malam hari!) dan `batch_test.go` (`TestSnapshotTool_MultiStockBatch`, `TestSnapshotTool_PartialDegradation`, `TestTechnicalsTool_MultiStockBatch`) **WAJIB tetap lulus 100%** tanpa menghapus test lama.
- Urutan deploy L4: deploy perubahan Repo Web (`proxy.ts` + `docker-compose.yml` + pastikan Fase L3 sudah live) **lebih dulu**, baru build & restart `agentd`.

### VERIFIKASI Fase L4
1. Unit test Go dengan race detector wajib hijau:
   ```bash
   cd /Users/nicholasandriansurjadi/Documents/teknikal-agent && go test -race ./internal/tools/... ./internal/router/...
   ```
2. Uji anti self-429 di Web: kirim 150 request cepat ke `http://localhost:3000/api/stocks/BBCA` dengan header `-H "mService-Token: <token>"` → seluruh 150 respons wajib **HTTP 200** (`0` respons `429`), sedangkan tanpa header tetap terkena `429` setelah request ke-120.
3. Setelah deploy `agentd` ke `/tmp/agentd_pulse`, pantau log `agentd` & akses Next.js saat memicu `get_stock_snapshot` 5 saham: pastikan hanya tercatat **1 request** `GET /api/stocks/batch?s=...` (`< 25 ms`) saat malam (atau +1 `GET /api/live-quotes?s=...` saat jam buka) dan `0` request ke `/api/market/quote`.

- **Ukuran Diff**: **M** (~200–250 baris perubahan lintas 2 file Web + 7 file Go).

---

## Fase L5 (Opsional bila L1–L4 Mulus) — Diet Payload `/api/stocks` (`211 KB` → Mode Ringan)

### GOAL Metrik Target
- Payload pencarian saham di Beranda (`HeroSearch`) & halaman detail (`TickerSearchModal`): **211.373 B → < 45.000 B** uncompressed (**< 9 KB** gzip), latency cold **< 15 ms**, warm **< 3 ms**
- Tabel penuh `/stocks` (`SahamView` → `?mode=full`): tetap utuh semua kolom (`listingBoard, close, change, changePercent, volume, rsi14, sma20, signalScore`) dengan ukuran terpangkas ~15% lewat pembulatan float 2 desimal (**~175 KB** uncompressed)

### FILE Path Eksak (Repo Web)
1. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/lib/validation.ts` (baris `199-203`)
2. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock-market.service.ts` (baris `191-222`)
3. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/stocks/route.ts` (baris `8-18`)
4. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/stock/saham-view.tsx` (baris `43-48`)
5. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/home/hero-search.tsx` (baris `29-39`)
6. `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/stock/ticker-fab.tsx` (baris `248-258`)

### LANGKAH Konkret
1. **Migrasikan `SahamView` ke `?mode=full` Eksplisit (`saham-view.tsx:43`)**:
   - Ubah `apiPath` untuk `EQUITY` menjadi `"/api/stocks?mode=full"` agar tabel utama `/stocks` selalu meminta seluruh kolom indikator (`rsi14`, `sma20`, `volume`, `listingBoard`) secara eksplisit.
2. **Sediakan Mode Ringan `lite` & Bulatkan Presisi Float (`stock-market.service.ts` & `validation.ts`)**:
   - Di `schemas.stockList` (`validation.ts:200`), dukung `mode: z.enum(["lite", "universe", "full"]).optional()`.
   - Bulatkan `changePercent` ke 2 desimal (`Math.round(pct * 100) / 100`) pada `getStockList` (menghilangkan string IEEE-754 17 digit seperti `0.8097165991902834`).
   - Tambahkan `getStockListLite(sector?: string)` ber-cache `stockCache` (`stock-list-lite:equity:${sector ?? "all"}`, TTL `300_000` ms) yang hanya mengembalikan `{ ticker, name, sector, close, changePercent }` (semua field yang benar-benar dirender oleh `HeroSearch` baris `152-168` dan `TickerSearchModal` baris `344-355`).
3. **Arahkan Search Widget & Switch Default `/api/stocks` (`hero-search.tsx`, `ticker-fab.tsx`, `stocks/route.ts`)**:
   - Ubah `fetch("/api/stocks")` di `hero-search.tsx:31` dan `ticker-fab.tsx:250` menjadi `fetch("/api/stocks?mode=lite")` (sesuaikan tipe state lokal menjadi `Pick<StockRow, "ticker" | "name" | "sector" | "close" | "changePercent">[]`).
   - *(Opsional setelah verifikasi 0 skrip eksternal lain yang bergantung pada kolom `rsi14`/`sma20` tanpa param)*: Di `src/app/api/stocks/route.ts`, jadikan `getStockListLite` sebagai perilaku default saat `mode` tidak dikirim, dan `getStockList` saat `mode === "full"`. Jika masih ada keraguan konsumen eksternal, pertahankan default `full` dan nikmati penghematan 80% bandwidth di seluruh trafik Beranda & Detail Saham lewat `?mode=lite`.

### GUARD Fase L5
- **Wajib satu commit atomik** antara perubahan `saham-view.tsx` (`?mode=full`) dan perubahan default di `api/stocks/route.ts` agar tabel `/stocks` tidak pernah kehilangan kolom `volume`, `rsi14`, `sma20`, atau badge `listingBoard`.
- Pastikan `HeroSearch` dan `TickerSearchModal` tetap menampilkan persentase perubahan (`+0,81%` / `-1,20%`) persis seperti sebelumnya (`changePercent` wajib ada di `lite`, berbeda dari `universe` murni milik `agentd`).

### VERIFIKASI Fase L5
1. Typecheck lulus: `cd /Users/nicholasandriansurjadi/Documents/teknikalidnew && npx tsc --noEmit`.
2. Deploy `app` (sekuensial + `isr-warmup.js`), lalu uji `curl -s -o /dev/null -w '%{http_code} %{size_download} %{time_total}\n'`:
   - `http://localhost:3000/api/stocks?mode=lite` → `200`, size **< 50.000** bytes, cold **< 0.015s**, warm **< 0.003s**.
   - `http://localhost:3000/api/stocks?mode=full` → `200`, memuat lengkap `rsi14`, `sma20`, `volume`, `listingBoard`, cold **< 0.035s**.
3. Cek fungsional halaman `/`, `/stocks`, dan tombol cari saham di `/stocks/BBCA.JK` — tidak ada *hydration mismatch* maupun kolom kosong.

- **Ukuran Diff**: **S** (~55–75 baris perubahan pada 6 file).
