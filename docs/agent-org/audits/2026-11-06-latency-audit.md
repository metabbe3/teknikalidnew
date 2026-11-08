# Audit Latency Endpoint Publik `teknikal.id` & Konsumen `agentd`

- **Tanggal Audit**: 6 November 2026, ~21:20–21:30 WIB (kondisi pasar: `CLOSED_WIB` / pasca-EOD)
- **Lingkungan Uji**: Jaringan lokal Mac mini (`curl http://localhost:3000/...` langsung ke container `teknikalidnew-app-1`, tanpa CDN Cloudflare) + PostgreSQL `teknikalidnew-db-1` (`Stock`: 1.451 baris, `StockPrice`: 553.721 baris, `StockIndicator`: 529.141 baris, `StockFundamental`: 109.258 baris, `ForeignFlow`: 10.582 baris)
- **Target Owner**: Semua endpoint **< 200–300 ms** (baik warm maupun cold/cache-miss)
- **Metode**: `curl -s -o /dev/null -w '%{http_code} %{size_download} %{time_total}'` diulang **3x sekuensial** per endpoint (diambil **median**). Karena mayoritas endpoint memakai cache memori 60–300 detik, **Run 1 merepresentasikan Cold/Cache-Miss** dan **Run 2–3 merepresentasikan Warm/Cache-Hit** — keduanya dilaporkan secara transparan agar bottleneck yang meledak setiap TTL habis (60–300 detik) tidak tersembunyi di balik median warm.

---

## 1. Ringkasan Eksekutif

1. **Median Warm (Cache Hit)**: **43 dari 45 variasi endpoint** berada di **1,3 ms – 9,0 ms (`OK`)** saat cache in-memory (`stockCache` / `TtlCache` / Next ISR) hangat.
2. **5 Bottleneck Utama > 300 ms (`SLOW`) pada Uncached / Cold Hit (terjadi tiap 60–300 detik atau tiap filter baru)**:
   - **`GET /api/screener` (filter kustom, mis. `?exclude_gorengan=true`)**: Median **396,26 ms** (`R1: 496,64 ms`, `R2: 396,26 ms`, `R3: 302,72 ms`) — **SLOW permanen di setiap request** karena tanpa cache + Prisma `include: { prices: { take: 2 } }` menarik seluruh **553.721 baris** `StockPrice` ke Node.js.
   - **`GET /api/stocks/radar`**: Cold **1.667,43 ms** (median warm `5,42 ms`); `?assetClass=EQUITY` Cold **1.522,50 ms** — predikat `some` tanpa filter `date = latestDate` mencocokkan 877/940 saham sepanjang sejarah + Prisma menarik **1,08 juta baris** (`StockPrice` + `StockIndicator`) ke memori JS.
   - **`GET /api/stocks`**: Cold **1.501,64 ms**, payload **211 KB** (median warm `5,31 ms`) — Prisma `include` menarik 553k `StockPrice` + 529k `StockIndicator` ke memori JS. Dipakai juga oleh `agentd` hanya demi daftar kode ticker.
   - **`GET /api/market/swing`**: Cold **1.314,16 ms** setiap **60 detik** (median warm `3,69 ms`) — tiap cache TTL 60s habis, Postgres melakukan Parallel Seq Scan + Disk Sort `13,2 MB` atas **320.084 baris** histori 24 bulan (`963,65 ms` di DB + ~350 ms komputasi backtest di event loop Node.js), padahal data EOD hanya berubah 1x sehari.
   - **`GET /api/live-quotes?s=...`**: Cold **242,77 ms – 493,88 ms** per kombinasi ticker baru (median warm `4,39 – 8,19 ms`; median 4 sampel cold uncached: **`287,15 ms` WATCH / puncak `493,88 ms` SLOW**). Saat pasar tutup (`CLOSED_WIB`), handler tetap memanggil TradingView + fallback sekuensial Yahoo v8 (`+240 ms` per ticker tak dikenal) **sebelum** mengecek jam bursa, lalu membuang hasilnya.
3. **Temuan Bug Aktif (HTTP 500)**:
   - **`GET /api/me/morning-delta?tickers=BBCA.JK,ARKO.JK`** mengembalikan **HTTP 500** (`4,83 ms`) akibat `TypeError: b.getTime is not a function` karena `jsonb_agg` mengembalikan `si.date` sebagai `string`, bukan `Date`.
4. **Temuan Sisi `agentd` (Batch & Fan-Out)**:
   - Tool `get_stock_snapshot` & `get_technicals` (F4) serta `compare_stocks` & `portfolio_calc` memang sudah konkuren di Go (`taskx.RunBoundedBatch`), **TETAPI URL HTTP yang dipanggil di dalam worker `datasource.go` masih 100% per-ticker** (`/api/live-quotes?s={sym}` dan `/api/stocks/{sym}`), ditambah *double-fetch* sekuensial saat malam hari (`live-quotes` -> `stocks/{sym}`) dan risiko terkena rate limit global `120 req/menit/IP` di `src/proxy.ts`.

---

## 2. Tabel Hasil Pengukuran Nyata (3 Run per Endpoint)

Status klasifikasi:
- **OK**: `< 200 ms` (baik median maupun cold)
- **OK (COLD SLOW / WATCH)**: Median warm `< 200 ms`, tetapi Cold/Cache-Miss `> 200–300 ms` (dialami user/agent tiap TTL 60–300s habis atau kombinasi query baru)
- **SLOW**: Median 3-run `> 300 ms`
- **BUG 500**: Error server aktif

### A. Endpoint yang Dipakai `agentd` (+ Web Publik)

| Endpoint | Konsumen di `agentd` / Web | HTTP | Bytes | R1 Cold (ms) | R2 (ms) | R3 (ms) | Median (ms) | Status | Ringkasan Masalah / Catatan |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `/api/live-quotes?s=BBCA` | `datasource.go:301` (`FetchQuote`), Web `LivePrice` | 200 | 199 | **351,72** | 4,39 | 3,20 | **4,39** | OK *(Cold SLOW 352ms)* | Fetch TV sinkron saat pasar tutup + 2x DB prev-close sekuensial |
| `/api/live-quotes?s=ARKO` | `datasource.go:301` (mid-cap) | 200 | 199 | **242,77** | 7,72 | 7,61 | **7,72** | OK *(Cold WATCH 243ms)* | Sama; TTL cache hanya 60s per string query persis |
| `/api/live-quotes?s=XXXX` | Error path ticker invalid | 200 | 199 | **379,63** | 8,19 | 7,01 | **8,19** | OK *(Cold SLOW 380ms)* | TV null -> lanjut fetch Yahoo v8 sekuensial + bug `Prisma.join([])` |
| `/api/live-quotes?s=BBNI` / `ASII` / `UNVR` / `ZZZZ` | Uji murni Cold (4 ticker berbeda belum di-cache) | 200 | 199 | **324,24** | **250,06** | **246,44** | **287,15*** | **WATCH / SLOW** | *4 sampel cold murni (`ZZZZ` = **493,88 ms**); ini latency nyata tiap cache miss |
| `/api/live-quotes?s=BBCA,BBRI,BMRI,TLKM,ARKO` | Web `LivePrice` batch (belum dipakai `agentd`!) | 200 | 871 | **265,70** | 5,07 | 2,85 | **5,07** | OK *(Cold WATCH 266ms)* | **5 ticker sekaligus = 1x biaya 1 ticker!** Bukti peluang batch `agentd` |
| `/api/stocks/BBCA` | `datasource.go:182,378`, `client.go:365` | 200 | 797 | 10,16 | 8,53 | 8,58 | **8,58** | **OK** | Cepat (`Promise.all` 5 query terindeks per `stockId`) |
| `/api/stocks/ARKO` | Mid-cap detail + 24 indikator | 200 | 797 | 6,18 | 5,89 | 6,23 | **6,18** | **OK** | Cepat |
| `/api/stocks/XXXX` | Error path invalid ticker | 404 | 32 | 4,42 | 4,38 | 4,29 | **4,38** | **OK** | Fast-fail JSON 404 setelah cek indeks `Stock_ticker_key` |
| `/api/stocks/BBCA/trading-plan` | `tradingplan.go:84` (`get_trading_plan`) | 200 | 436 | 8,90 | 8,10 | 7,22 | **8,10** | **OK** | Cepat, namun ada query ganda `Stock` di `getMarketStructure` |
| `/api/stocks/ARKO/trading-plan` | Mid-cap trading plan | 200 | 417 | 11,56 | 5,55 | 7,08 | **7,08** | **OK** | Cepat |
| `/api/stocks/XXXX/trading-plan` | Error path invalid ticker | 404 | 32 | 4,00 | 4,71 | 3,69 | **4,00** | **OK** | Fast-fail 404 |
| `/api/stocks/BBCA/history?range=3mo` | `verdict/eod.go:112`, Web chart | 200 | 6.580 | 5,66 | 4,89 | 4,69 | **4,89** | **OK** | Cepat dari tabel `StockPrice` terindeks |
| `/api/stocks/ARKO/history?range=3mo` | Mid-cap EOD history | 200 | 6.282 | 4,70 | 4,42 | 4,44 | **4,44** | **OK** | Cepat |
| `/api/stocks/XXXX/history?range=3mo` | Error path invalid ticker | 404 | 32 | 4,66 | 4,46 | 4,28 | **4,46** | **OK** | Fast-fail 404 |
| `/api/stocks/%5EJKSE/history?range=3mo` | `verdict/eod.go:18` (benchmark IHSG) | 200 | 6.858 | 4,19 | 6,13 | 4,85 | **4,85** | **OK** | Cepat |
| `/api/stocks` | `router/ticker.go:299` (`Refresh`), Web search | 200 | 211.373 | **1.501,64** | 5,31 | 3,39 | **5,31** | OK *(**Cold SLOW 1.502ms**)* | Cold scan **1,08 juta baris** di Prisma (`stockCache` TTL 300s); payload 211 KB |
| `/api/market` | `marketmovers.go:99` (`get_market_movers`), Web | 200 | 2.181 | 15,08 | 2,14 | 1,68 | **2,14** | **OK** | Sangat cepat berkat `JOIN LATERAL` di `market-snapshot.service.ts` |
| `/api/radar` | `radar.go:71` (`get_radar`), `/pasar` | 200 | 1.736 | 11,98 | 2,50 | 2,57 | **2,57** | **OK** | Baca JSON statis `/var/lib/teknikal-analyst`, namun belum di-cache memori |
| `/api/brief/daily` | `brief.go:53` (`get_daily_brief`), Home strip | 200 | 1.446 | 4,49 | 7,50 | 2,21 | **4,49** | **OK** | Baca JSON statis `/var/lib/teknikal-brief` |
| `/api/market/quote?symbol=XXXX` | `datasource.go:287,493` (legacy fallback ke-4!) | 404 | 22.780 | 2,62 | 2,01 | 1,71 | **2,01** | **DEAD 404** | Kontrak mati (render HTML 404 22 KB); masih dipanggil saat `FetchQuote` gagal |

> **Catatan Query DB Langsung di `agentd` (diukur dengan `EXPLAIN ANALYZE` read-only di Postgres)**:
> - `movers.go:53` (`get_movers` window `LAG` 10 hari): **12,35 ms** (+ `sessionDate` `MAX(date)` terpisah ~0,3 ms) → **OK**
> - `datasource.go:530` (`FetchFundamental` per ticker): **0,85 ms** → **OK** (namun menggunakan mundur `StockFundamental_date_marketCap_idx`, bukan `StockFundamental_stockId_date_key` jika statistik tabel belum `ANALYZE`)
> - `datasource.go:587` (`FetchFundFlow` 5 sesi per ticker): **0,43 ms** → **OK**

---

### B. Endpoint Publik Web Utama Lainnya (`src/app/api/**/route.ts`)

| Endpoint | Konsumen Web Utama | HTTP | Bytes | R1 Cold (ms) | R2 (ms) | R3 (ms) | Median (ms) | Status | Ringkasan Masalah / Catatan |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `/api/screener?exclude_gorengan=true` | Halaman `/screener` (filter kustom) | 200 | 167.020 | **496,64** | **396,26** | **302,72** | **396,26** | **SLOW (>300ms)** | **0 cache** + tiap call Prisma Seq Scan **553.721 baris** `StockPrice`! |
| `/api/screener?rsi_max=35&exclude_gorengan=true` | Halaman `/screener` (filter kustom sempit) | 200 | 57.917 | 119,47 | 102,68 | 109,66 | **109,66** | **OK** *(tanpa cache)* | Lebih sedikit saham cocok, tapi tetap tanpa cache EOD |
| `/api/screener?preset=rsi_oversold` | Home `MiniScreenerPreview`, `/screener` | 200 | 48.646 | 118,41 | 2,44 | 2,28 | **2,44** | **OK** | Di-cache `cachedEod` 5 menit |
| `/api/screener?preset=golden_cross` | Home `MiniScreenerPreview` | 200 | 35.883 | 76,05 | 2,09 | 2,42 | **2,42** | **OK** | Di-cache `cachedEod` 5 menit |
| `/api/screener?preset=volume_spike` | Home `MiniScreenerPreview` | 200 | 6.205 | 10,04 | 1,86 | 1,85 | **1,86** | **OK** | Raw SQL `JOIN LATERAL` cepat |
| `/api/screener` *(tanpa param)* | Error path validasi | 400 | 47 | 25,23 | 5,39 | 3,06 | **5,39** | **OK** | Fast-fail 400 |
| `/api/stocks/radar` | Home `RadarPreview` | 200 | 74.109 | **1.667,43** | 3,07 | 5,42 | **5,42** | OK *(**Cold SLOW 1.667ms**)* | `findOversoldStocks` tanpa filter `date` + tarik 1,08 juta baris ke JS! |
| `/api/stocks/radar?assetClass=EQUITY` | `BottomFishingRadar` | 200 | 74.109 | **1.522,50** | 2,98 | 2,69 | **2,98** | OK *(**Cold SLOW 1.523ms**)* | Cache key terpisah dari `/api/stocks/radar` -> kena penalti 1,5s dua kali |
| `/api/market/swing` | Halaman Swing / Market | 200 | 4.624 | **1.314,16** | 3,69 | 1,89 | **3,69** | OK *(**Cold SLOW 1.314ms**)* | Tarik **320.084 baris** backtest 24 bln tiap **60 detik**! |
| `/api/market/ihsg` | `use-ihsg.ts` (header/widget) | 200 | 116 | 10,34 | 5,86 | 8,06 | **8,06** | **OK** | Membaca snapshot memori `marketSnapshotService` |
| `/api/stocks?sector=Financials` | Filter sektor `/stocks` | 200 | 23.080 | 165,24 | 3,47 | 4,82 | **4,82** | **OK** | Cold 165ms untuk 105 saham sektor Financials |
| `/api/stocks/sparkline` | `StockTable`, `StockCard` | 200 | 33.286 | 27,23 | 2,37 | 3,21 | **3,21** | **OK** | Cepat, tapi selalu dump semua 940 saham (33 KB) tanpa filter `?s=` |
| `/api/stocks/compare?s=BBCA.JK&s=ARKO.JK&range=6mo` | Halaman Compare (`use-compare-data.ts`) | 200 | 12.095 | 13,13 | 8,93 | 8,79 | **8,93** | **OK** | Sudah paralel `Promise.all` & batch query |
| `/api/stocks/compare?s=BBCA&s=ARKO&range=6mo` | Tanpa `.JK` (uji konsistensi format) | 400 | 29 | 3,02 | 3,00 | 2,54 | **3,00** | **OK** *(400)* | Wajib suffix `.JK` (tidak dinormalisasi seperti route lain) |
| `/api/stocks/compare?s=BBCA.JK&s=XXXX.JK&range=6mo` | Error path invalid ticker | 400 | 29 | 2,98 | 3,22 | 3,32 | **3,22** | **OK** | Fast-fail 400 |
| `/api/stocks/BBCA/history?range=1D` | Chart intraday `1D` (large cap) | 200 | 7.286 | 126,04 | 4,48 | 3,56 | **4,48** | **OK** | Cold baca `CachedApiCall` DB (126ms) -> warm memori (4ms) |
| `/api/stocks/ARKO/history?range=1D` | Chart intraday `1D` (mid cap) | 200 | 7.284 | 72,89 | 7,90 | 8,10 | **8,10** | **OK** | Sama; catatan: bila cache Yahoo expired saat jam buka, fetch Yahoo live |
| `/api/stocks/XXXX/history?range=1D` | Error path intraday invalid | 404 | 32 | 4,73 | 6,78 | 7,70 | **6,78** | **OK** | Fast-fail 404 |
| `/api/stocks/BBCA/indicators?range=3mo` | Chart overlay indikator (`use-indicators.ts`) | 200 | 15.667 | 6,03 | 5,08 | 4,64 | **5,08** | **OK** | Cepat |
| `/api/stocks/ARKO/indicators?range=3mo` | Chart overlay indikator (mid cap) | 200 | 15.060 | 4,89 | 7,16 | 4,64 | **4,89** | **OK** | Cepat |
| `/api/stocks/XXXX/indicators?range=3mo` | Error path invalid ticker | 404 | 32 | 2,85 | 2,80 | 2,83 | **2,83** | **OK** | Fast-fail 404 |
| `/api/stocks/BBCA/sentiment` | `SentimentGauge` | 200 | 57 | 8,72 | 4,91 | 2,99 | **4,91** | **OK** | Cepat |
| `/api/stocks/ARKO/sentiment` | `SentimentGauge` (mid cap) | 200 | 57 | 4,80 | 3,45 | 2,94 | **3,45** | **OK** | Cepat |
| `/api/stocks/XXXX/sentiment` | `SentimentGauge` (invalid ticker) | 200 | 57 | 2,73 | 3,25 | 4,32 | **3,25** | **OK** | Mengembalikan sentimen kosong 200 |
| `/api/stocks/BBCA/comments` | `StockDiscussion` | 200 | 29 | 6,36 | 6,04 | 3,70 | **6,04** | **OK** | Cepat |
| `/api/stocks/ARKO/comments` | `StockDiscussion` (mid cap) | 200 | 29 | 3,34 | 4,05 | 3,67 | **3,67** | **OK** | Cepat |
| `/api/stocks/XXXX/comments` | Error path invalid ticker | 400 | 30 | 2,80 | 2,88 | 4,12 | **2,88** | **OK** | Fast-fail 400 |
| `/api/leaderboard` | Halaman Prediksi / Reputasi Komunitas | 200 | 11 | 14,20 | 4,38 | 3,93 | **4,38** | **OK** | *(Tidak ada `/api/prediction` terpisah; prediksi ada di `/api/posts` & `/api/leaderboard`)* |
| `/api/posts` | Feed Komunitas & Prediksi (`use-posts.ts`) | 200 | 575 | 13,77 | 4,70 | 3,89 | **4,70** | **OK** | Cepat |
| `/api/posts?ticker=BBCA.JK` | Feed Prediksi/Post per saham | 200 | 575 | 3,44 | 7,62 | 3,47 | **3,47** | **OK** | Cepat |
| `/api/articles` | Daftar berita/artikel (`use-articles.ts`) | 200 | 67.368 | 12,65 | 4,50 | 4,85 | **4,85** | **OK** | Cepat, namun payload cukup besar (67 KB) |
| `/api/faq` | Halaman FAQ (`use-faq.ts`) | 200 | 31.896 | 9,49 | 3,64 | 4,00 | **4,00** | **OK** | Cepat |
| `/api/faq/trending` | Widget FAQ populer | 200 | 21.391 | 6,32 | 4,30 | 3,48 | **4,30** | **OK** | Cepat |
| `/api/me/morning-delta?tickers=BBCA.JK,ARKO.JK` | `WelcomeBackBanner` (guest mode) | **500** | 41 | 14,37 | 4,83 | 4,27 | **4,83** | **BUG 500** | Crash `TypeError: b.getTime is not a function` di `morning-delta.service.ts:159` |
| `/api/me/morning-delta?tickers=XXXX.JK` | Error path invalid ticker | 200 | 52 | 4,62 | 3,14 | 3,14 | **3,14** | **OK** | Lolos 200 karena array `stocks` kosong sehingga `.sort()` tidak terpanggil |
| `/api/notifications` | `SiteAnnouncementBanner` (`cache: "no-store"`) | 401 | 29 | 2,38 | 2,70 | 4,01 | **2,70** | **OK** | Cepat (401 untuk guest) |
| `/api/tags` | Tag komunitas | 200 | 11 | 8,49 | 3,53 | 2,32 | **3,53** | **OK** | Cepat |
| `/api/health` | Docker / uptime healthcheck | 200 | 54 | 2,02 | 2,11 | 1,96 | **2,02** | **OK** | Cepat |

---

## 3. Bedah Forensik Endpoint Lambat (> 300 ms) & Saran Fix Spesifik (`file:line`)

### 3.1. `GET /api/stocks/radar` (Cold: **1.667,43 ms**), `GET /api/stocks` (Cold: **1.501,64 ms**), dan `GET /api/screener` Custom (Median: **396,26 ms**)

#### Akar Masalah (Terbukti dari `pg_stat_user_tables` & `EXPLAIN ANALYZE`)
Ketiga endpoint ini menderita antipola Prisma yang sama: **nested `include` dengan `take: N` pada relasi `prices` dan/atau `indicators` di atas ratusan induk `Stock`**:
- `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock.repository.ts:227-238` (`findActiveStocksWithPrices` — dipakai `/api/stocks`): melakukan `include: { prices: { where: { volume: { gt: 0 } }, orderBy: { date: "desc" }, take: 6 }, indicators: { orderBy: { date: "desc" }, take: 1 } }` untuk 940 saham aktif.
- `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock.repository.ts:240-263` (`findOversoldStocks` — dipakai `/api/stocks/radar`):
  1. **Bug predikat `some` tanpa tanggal**: `indicators: { some: { interval: '1d', OR: [{ rsi14: { lte: 30 } }, ...] } }` **tidak memfilter `date: latestDate`**. `EXPLAIN ANALYZE` membuktikan **877 dari 940 saham (93%)** cocok karena pernah oversold minimal sekali selama 2 tahun terakhir, dan partial index `StockIndicator_oversold_screen_idx` gagal terpakai optimal!
  2. Untuk 877 saham tersebut, Prisma menjalankan `include: { prices: { take: 6 }, indicators: { take: 1 } }`.
- `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/domains/stock/stock.repository.ts:699-710` (`findIndicatorsByDate` — dipakai `/api/screener`): melakukan `include: { stock: { include: { prices: { orderBy: { date: "desc" }, take: 2 } } } }`. Selain itu, `customScreenerQuery` (`screener-analysis.service.ts:330-482`) **sama sekali tidak memakai `cachedEod`**, sehingga setiap klik filter kustom menghantam DB mentah.

**Bukti Kuantitatif Postgres**: Dengan `@prisma/adapter-pg`, Prisma tidak bisa menaruh `LIMIT 2` / `LIMIT 6` per induk di query child `WHERE "stockId" IN (...)`. Pengukuran `pg_stat_user_tables` sebelum & sesudah **1 panggilan** `/api/screener?exclude_gorengan=true&price_min=51` menunjukkan `seq_scan` `StockPrice` naik `+1` dan `seq_tup_read` melonjak dari `457.484.760` ke `458.038.481` (**tepat `+553.721` baris = 100% seluruh tabel `StockPrice` diseret ke Node.js lalu dibuang 99,7% di memori JS!**). Pada `/api/stocks` dan `/api/stocks/radar`, Prisma menyeret `553.721` baris `StockPrice` **+** `529.141` baris `StockIndicator` = **1.082.862 baris**!

#### Saran Fix Spesifik
1. **`stock.repository.ts:227-238` (`findActiveStocksWithPrices`)**: Ganti `prisma.stock.findMany({ include: ... })` dengan 1 query `$queryRaw` berbasis `LEFT JOIN LATERAL (... ORDER BY date DESC LIMIT 1)` seperti pola `market-snapshot.service.ts:105`. Hasil uji `EXPLAIN (ANALYZE, BUFFERS)` query pengganti ini di DB nyata hanya **25,64 ms** (turun **58x** dari `1.501,64 ms`!).
2. **`stock.repository.ts:240-263` (`findOversoldStocks`) & `screener-analysis.service.ts:218`**: Ambil `latestDate` lebih dulu (`getLatestIndicatorDate`), filter langsung pada `StockIndicator` dengan `WHERE date = latestDate AND interval = '1d' AND (rsi14 <= 30 OR ...)` (langsung mengenai partial index `StockIndicator_oversold_screen_idx`!), lalu ambil harga penutupan dengan `stockRepository.findLatestBarsWithPrev(stockIds)` yang **sudah tersedia** di `stock.repository.ts:374-405`! Estimasi cold latency turun dari **1.667 ms → < 20 ms**.
3. **`stock.repository.ts:699-710` (`findIndicatorsByDate`) & `screener-analysis.service.ts:330`**: Hapus nested `include: { prices: { take: 2 } }` (cukup `include: { stock: { select: { id, ticker, name, sector } } }`), lalu gabungkan harga dengan `stockRepository.findLatestBarsWithPrev(stockIds)` (`stock.repository.ts:374`), serta bungkus `customScreenerQuery` di `screener-analysis.service.ts:330` dengan `cachedEod` berbasis hash parameter filter (TTL 60–300s).

---

### 3.2. `GET /api/market/swing` (Cold: **1.314,16 ms** setiap 60 detik)

#### Akar Masalah
- `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/api/market/swing/route.ts:57` memasang `CACHE_TTL_MS = 60 * 1000` (60 detik).
- Padahal di `route.ts:148-168`, setiap cache miss mengeksekusi query `backtestRowsRaw` 24 bulan atas `StockIndicator` JOIN `StockPrice` JOIN `Stock` (`interval = '1d'`).
- Hasil `EXPLAIN (ANALYZE, BUFFERS)` di Postgres menunjukkan query ini melakukan **Parallel Seq Scan** pada kedua tabel setengah juta baris + **External Merge Disk Sort ~13,2 MB** untuk menghasilkan **320.084 baris** dalam **963,65 ms**, ditambah ~350 ms transfer & komputasi `computeSwingStats` 2x di main thread Node.js.

#### Saran Fix Spesifik
1. **`src/app/api/market/swing/route.ts:57` & `148-168`**: Pisahkan cache kandidat harian dari cache statistik backtest 24 bulan! Karena `backtest` murni dihitung dari bar EOD (`interval = '1d'`), kunci cache backtest berdasarkan `latestDate` (misal `swing-backtest:${asOfStr}` dengan TTL **6–24 jam** atau precompute saat cron `sync-eod` di `src/app/api/cron/sync-eod/route.ts`). Query kandidat top-10 (`route.ts:76-100`) sendirian hanya memakan **< 15 ms**.

---

### 3.3. `GET /api/live-quotes?s=...` (Cold: **242,77 – 493,88 ms**)

#### Akar Masalah
1. **Fetch Eksternal Sia-Sia Saat Pasar Tutup (`src/app/api/live-quotes/route.ts:51` vs `75-97`)**: Handler melakukan `const results = await fetchQuotesBatch(tickers)` ke TradingView Scanner di baris 51, **baru** memeriksa `if (!marketOpen)` di baris 77 dan mengganti seluruh harga dengan `eodLatest` dari DB! Akibatnya di luar jam bursa (malam/akhir pekan), setiap cold request membuang ~230–350 ms ke jaringan eksternal tanpa guna.
2. **Fallback Sekuensial Yahoo v8 untuk Ticker Null/Invalid (`src/lib/yahoo-finance.ts:285-294`)**:
   ```ts
   for (const entry of results) {
     if (entry.quote != null && entry.quote.regularMarketPrice != null) continue;
     const v8 = await fetchQuoteV8(entry.ticker); // sequential await!
   ```
   Komentar kode menyebut fallback ini untuk indeks (`^JKSE`), tetapi kondisinya dijalankan untuk **semua** ticker yang gagal di TradingView (termasuk typo `XXXX.JK` / `ZZZZ.JK` atau saham suspend), secara **sekuensial** (`+240 ms` per ticker gagal; `ZZZZ` terukur **493,88 ms**).
3. **Dua Query DB Sekuensial + Bug Empty Join (`src/app/api/live-quotes/route.ts:59-62` & `src/domains/stock/stock.repository.ts:1338-1343`)**:
   - Baris 59 (`await findPrevClosesByTicker(tickers)`) dan baris 62 (`await findPrevClosesByTicker(tickers, { includeToday: true })`) dieksekusi berurutan (total 6 roundtrip SQL kecil), padahal bisa `Promise.all` (atau saat `marketOpen === true`, `eodLatest` baris 62 bahkan **tidak pernah dibaca** di baris 99–120!).
   - Di `stock.repository.ts:1334`, tidak ada guard `if (stocks.length === 0) return out;` sebelum `Prisma.join(stocks.map((s) => s.id))` di baris 1341, sehingga ticker invalid memicu exception `TypeError: Expected join([])...` di log produksi.
4. **Cache Key Tidak Granular (`src/app/api/live-quotes/route.ts:45`)**: Key `live-quotes:${tickers.join(",")}` menyimpan blob gabungan dgn TTL tetap 60s (bahkan saat malam hari). Request `?s=BBCA,ARKO` tidak bisa memakai cache milik `?s=BBCA`.

#### Saran Fix Spesifik
1. **`src/app/api/live-quotes/route.ts:51-97`**: Pindahkan perhitungan `marketOpen` (baris 72–76) **ke atas baris 51**. Saat `!marketOpen`: **jangan panggil `fetchQuotesBatch(tickers)` sama sekali** — cukup `Promise.all([findPrevClosesByTicker(tickers), findPrevClosesByTicker(tickers, { includeToday: true })])` dan simpan di cache dengan TTL lebih panjang (mis. 5–15 menit saat malam). Saat `marketOpen`: panggil `fetchQuotesBatch(tickers)` **paralel (`Promise.all`)** bersama `findPrevClosesByTicker(tickers)` saja (hapus panggilan `includeToday` yang tak terpakai saat pasar buka!). Cold latency malam turun dari **350 ms → ~8 ms**, jam buka hemat ~15 ms.
2. **`src/lib/yahoo-finance.ts:285-294`**: Batasi fallback `fetchQuoteV8` hanya untuk simbol indeks (`if (!entry.ticker.startsWith("^")) continue;`) atau jalankan paralel dengan `Promise.all` menggunakan batas konkurensi.
3. **`src/domains/stock/stock.repository.ts:1323`**: Tambahkan `if (stocks.length === 0) return new Map<string, number>();` tepat setelah `prisma.stock.findMany`.

---

### 3.4. Bug Aktif HTTP 500: `GET /api/me/morning-delta?tickers=...`

- **Akar Masalah**: Di `src/domains/stock/stock.repository.ts:119-124` (`findStocksWithIndicatorHistoryLateral`), kolom `indicators` dibentuk oleh Postgres `jsonb_agg(jsonb_build_object('date', si.date, ...))`, yang menghasilkan `date` bertipe **`string`** ISO (`"2026-11-06"`), bukan `Date` JS. Di `src/domains/stock/morning-delta.service.ts:159` (dan `:189` untuk user login!), `.sort((a, b) => b.getTime() - a.getTime())` langsung melempar `TypeError: b.getTime is not a function` → **HTTP 500** baik untuk guest maupun user login!
- **Saran Fix Spesifik**: Di `src/domains/stock/stock.repository.ts:148` (atau `morning-delta.service.ts:157,187`), konversi `new Date(d)` sebelum memanggil `.getTime()` / `.toISOString()`.

---

## 4. Peluang Batch ("1 Request Banyak Data")

| Kebutuhan Data | Status Dukungan Batch di Next.js Saat Ini | Bukti / Penghematan Roundtrip | Rekomendasi Konkret |
|---|---|---|---|
| **Live Quotes multi-saham** | **SUDAH ADA**: `GET /api/live-quotes?s=BBCA,BBRI,BMRI,...` (`live-quotes/route.ts:33`, maks **120 ticker**) | 5 ticker diukur **265,7 ms cold / 5,07 ms warm** vs 5x panggil sendiri = ~1.400 ms cold | **Wajib dipakai oleh `agentd`** (lihat Bagian 5) |
| **Compare 2–4 saham** | **SUDAH ADA**: `GET /api/stocks/compare?s=BBCA.JK&s=ARKO.JK` (`stocks/compare/route.ts:11`, maks 4 ticker) | **8,93 ms** untuk 2 saham lengkap (harga + indikator + fundamental + histori) | Normalisasi otomatis suffix `.JK` di `stocks/compare/route.ts:23` agar `?s=BBCA&s=ARKO` tidak 400 |
| **Snapshot EOD + 24 Indikator multi-saham** | **BELUM ADA ROUTE** *(tetapi fungsi service `getStockBatchWithIndicators(tickers)` **SUDAH ADA** di `stock-market.service.ts:161`!)* | Menghemat **N roundtrip** menjadi **1 HTTP call (~15 ms)** untuk `get_technicals` batch, `get_stock_snapshot` batch, dan kartu saham di feed komunitas web (`stock-attachment-card.tsx:178`) | Ekspos `GET /api/stocks/batch?s=BBCA,BBRI,...` (maks 25 ticker, berbasis `JOIN LATERAL`), opsional sertakan `fundamental` & `foreignFlow5d` agar 1 call melayani seluruh `get_stock_snapshot` |
| **Daftar Universe Ticker (`agentd` & Search Bar)** | **BELUM ADA** (`/api/stocks` mengirim 211 KB + indikator semua saham) | Menghemat cold query **1.501 ms → < 3 ms** dan payload **211 KB → ~12 KB** | Tambah query ringan `?mode=universe` pada `src/app/api/stocks/route.ts` (hanya `SELECT ticker, name, sector FROM "Stock" WHERE "isActive" = true`) untuk `router/ticker.go:299`, `hero-search.tsx:31`, dan `ticker-fab.tsx:250` |
| **Sparkline per halaman/tabel** | **BELUM ADA FILTER** (`/api/stocks/sparkline` selalu dump semua 940 saham = 33 KB) | Payload `StockCard` tunggal turun **33 KB → < 500 B** | Tambah query opsional `?s=BBCA,ARKO` di `src/app/api/stocks/sparkline/route.ts` |
| **Trading Plan multi-saham** | **BELUM ADA** (`/api/stocks/[ticker]/trading-plan` per-ticker) | Menghemat N call saat user menanyakan rencana entry/SL beberapa saham sekaligus | Tambah `GET /api/stocks/trading-plan?s=BBCA,ARKO` atau masukkan ke `/api/stocks/batch` |

---

## 5. Audit Sisi Konsumen `agentd` (`teknikal-agent/internal/tools/`)

> Catatan sesuai arahan: F4 memang sudah menambahkan input batch pada `get_stock_snapshot` (`snapshot.go:26`) & `get_technicals` (`technicals.go:19`), dan `compare_stocks` (`compare.go:169`) serta `portfolio_calc` (`portfolio_calc.go:119`) sudah dikonversi memakai `taskx.RunBoundedBatch` — **tidak perlu konversi `taskx` ulang**.

Namun hasil bedah `datasource.go`, `snapshot.go`, `technicals.go`, `compare.go`, dan `portfolio_calc.go` menemukan **6 kebocoran latency & roundtrip** di lapisan HTTP/DB di bawah `taskx`:

1. **URL HTTP Masih 100% Per-Ticker (Belum Memakai Batch `?s=A,B,C`)**:
   - Di `/Users/nicholasandriansurjadi/Documents/teknikal-agent/internal/tools/datasource.go:301-303` (`fetchLiveQuotes`), `agentd` memanggil `/api/live-quotes?s={cleanSym}` **satu ticker per HTTP request**.
   - Akibatnya, saat `portfolio_calc` menghitung 8 saham (`portfolio_calc.go:119`), `compare_stocks` membandingkan 4 saham (`compare.go:169`), atau `get_stock_snapshot` memproses 10 saham (`snapshot.go:237`), worker `taskx` tetap menembakkan **N request HTTP terpisah** ke Next.js, alih-alih **1 request** `GET /api/live-quotes?s=SYM1,SYM2,...`!
   - **Saran Fix**: Tambahkan `FetchQuotesBatch(ctx, symbols []string) (map[string]*QuoteOutput, error)` di `datasource.go` yang menggabungkan simbol ke `/api/live-quotes?s=BBCA,BBRI,...` dalam **1 HTTP call**, lalu mengisi cache per-ticker (`t.saveCache`), dan panggil dari pre-fetch `portfolio_calc.go:118`, `compare.go:169`, serta `snapshot.go:236`.

2. **Double-Fetch Sekuensial Setiap `FetchQuote` di Luar Jam Bursa (`datasource.go:246-274`)**:
   - Saat pasar tutup (`CLOSED_WIB`), `/api/live-quotes` sengaja mengembalikan `volume: null, open: null, dayHigh: null, dayLow: null`.
   - Di `datasource.go:252`, pengecekan `ohlcIncomplete := quote.Volume == 0 || quote.Open == 0 ...` selalu bernilai `true` sepanjang sore/malam/akhir pekan, sehingga `FetchQuote` selalu menembak **Request #1** `/api/live-quotes?s=BBCA` (~350 ms cold), lalu **sekuensial Request #2** `/api/stocks/BBCA` (~8 ms) di baris 254!
   - Lebih parah lagi di `snapshot.go:135-159` (`fetchSingleSnapshot`): sub-task `quote` menembak `/api/live-quotes` lalu `/api/stocks/{sym}`, sementara sub-task `technicals` menembak `/api/stocks/{sym}` yang sama!
   - **Saran Fix**:
     - Di `datasource.go:245`: jika `!IsMarketOpen(now, t.holidays)` (dan bukan fase settlement), langsung panggil `t.fetchStockSnapshot(ctx, cleanSym, now)` (`GET /api/stocks/{sym}`, ~6–8 ms) dan **lompati `/api/live-quotes` (~350 ms)**.
     - Di `snapshot.go:133-186`: saat pasar tutup, cukup ambil `/api/stocks/{sym}` **satu kali** untuk mengisi `Quote` **sekaligus** `Technicals`!

3. **Risiko Self-DDoS terkena Rate Limit `120 req/menit` di `src/proxy.ts`**:
   - Untuk 10 ticker pada `get_stock_snapshot` malam hari, `agentd` saat ini menembak `10x /api/live-quotes` + `10x /api/stocks/{sym}` = **20 HTTP request** dari IP yang sama.
   - Di `/Users/nicholasandriansurjadi/Documents/teknikalidnew/src/proxy.ts:242-246`, semua `/api/*` dibatasi `RATE_LIMIT = 120` req/60s per IP **tanpa pengecualian untuk header `mService-Token`** yang dikirim `agentd` (`datasource.go:764`). Hanya butuh 6 panggilan batch/menit agar `agentd` kena **HTTP 429**, yang memicu retry backoff `2s + 4s = 6 detik` di `datasource.go:738-795`!
   - **Saran Fix**: Selain menggabungkan request menjadi batch, tambahkan bypass rate-limit berbasis validasi `mService-Token === process.env.SERVICE_TOKEN` (timing-safe) di `src/proxy.ts:242`.

4. **Fallback Kontrak Mati `fetchLegacyQuote` pada Error Path (`datasource.go:286-291`)**:
   - Bila ticker gagal di `live-quotes` dan `stocks/{sym}` (404), `FetchQuote` masih jatuh ke langkah ke-4: `t.fetchLegacyQuote` (`GET /api/market/quote?symbol=...`, baris 493) yang **tidak pernah ada di Next.js** (mengembalikan halaman HTML 404 sebesar 22,7 KB).
   - **Saran Fix**: Sama seperti perbaikan `FetchFundamental` (`datasource.go:554`) dan `FetchFundFlow` (`datasource.go:626`), matikan fallback `fetchLegacyQuote` di produksi (atau batasi hanya jika `t.db == nil` untuk unit test mock).

5. **Dead Code `TeknikalLive.FetchManySnapshots` (`datasource.go:438-486`) & Peluang Batch DB**:
   - `TeknikalLive.FetchManySnapshots` (`datasource.go:438`) saat ini tidak dipanggil oleh `snapshot.go` (karena `snapshot.go:209` mendefinisikan `fetchManySnapshots` sendiri) dan di dalamnya pun masih me-loop `/api/stocks/{sym}` per-ticker.
   - Untuk `FetchFundamental` (`datasource.go:529`) dan `FetchFundFlow` (`datasource.go:586`) yang membaca langsung ke Postgres lokal (`t.db`), batch 10 saham di `snapshot.go` / `compare.go` mengeksekusi 20 query SQL terpisah; dapat digabung menjadi 1 query `WHERE s.ticker = ANY($1)` (< 2 ms total).

6. **Refresh Universe Ticker Menarik Payload Berat `/api/stocks` (`internal/router/ticker.go:299`)**:
   - Saat startup/refresh, `ticker.go:299` memanggil `GET /api/stocks` (211 KB, cold 1,5 detik, `Timeout` 5 detik di `cmd/agentd/main.go:144`) hanya untuk mengekstrak field `ticker`. Jika bertepatan dengan beban DB tinggi, rawan mendekati batas timeout 5 detik. Diarahkan ke `/api/stocks?mode=universe` akan memangkasnya ke **< 5 ms**.

---

## 6. Urutan Prioritas Eksekusi (Quick Wins Impact Tertinggi)

1. **[P0 - Bug 500]** Perbaiki `new Date(d)` pada `morning-delta.service.ts:157-159,187-189` dan guard `if (stocks.length === 0)` pada `stock.repository.ts:1323`.
2. **[P0 - Pangkas 1.667ms & 1.502ms & 396ms ke < 25ms]** Ganti Prisma `include: { prices: { take: N } }` dengan `JOIN LATERAL` (`findLatestBarsWithPrev`) pada `findOversoldStocks` (+ tambah filter `date: latestDate`), `findActiveStocksWithPrices`, dan `findIndicatorsByDate` di `stock.repository.ts:227-263,699-710`, serta pasang `cachedEod` pada `customScreenerQuery` (`screener-analysis.service.ts:330`).
3. **[P0 - Pangkas 350ms–494ms di `/api/live-quotes`]** Pindahkan guard `if (!marketOpen)` ke sebelum `fetchQuotesBatch` di `live-quotes/route.ts:51`, paralelkan DB lookup dengan `Promise.all`, dan batasi fallback `fetchQuoteV8` hanya untuk `^` indeks di `yahoo-finance.ts:285`.
4. **[P1 - Pangkas 1.314ms tiap menit di `/api/market/swing`]** Cache hasil `backtest` 24 bulan berdasarkan tanggal sesi EOD (`TTL 6–24 jam`) di `market/swing/route.ts:57,148`.
5. **[P1 - Batch HTTP di `agentd` + Whitelist `mService-Token`]** Tambah `FetchQuotesBatch` (`?s=A,B,C`) + skip `/api/live-quotes` saat pasar tutup di `datasource.go:245,301`, hapus fallback mati `fetchLegacyQuote` (`datasource.go:287`), ekspos `GET /api/stocks/batch?s=...` dari `getStockBatchWithIndicators` (`stock-market.service.ts:161`), dan kecualikan `mService-Token` valid dari limit 120 req/menit di `src/proxy.ts:242`.
