-- perf: getLatestSmaCrossDate (weekly-signal "Sinyal Minggu Ini") 1102ms → 0.04ms
-- Sudah diterapkan manual CONCURRENTLY di prod 10 Nov 22:36; IF NOT EXISTS = no-op aman.
CREATE INDEX IF NOT EXISTS "StockIndicator_sma_cross_latest_idx"
ON "StockIndicator" ("interval", "smaCrossDate" DESC)
WHERE "smaCrossDate" IS NOT NULL;
