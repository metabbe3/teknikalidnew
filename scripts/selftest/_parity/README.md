# Parity runners — fix-2026-10-26-10 (refactor SATU PINTU market engine)

Bukti refactor tidak mengubah angka: OLD (commit base) vs NEW harus IDENTIK bit-per-bit.

## Regenerasi file OLD (jangan commit — dihasilkan dari git):

```bash
BASE=$(git merge-base HEAD origin/main)   # 87d96bf saat refactor
git show $BASE:src/domains/stock/weekly-report.service.ts > scripts/selftest/_parity/weekly-report.OLD.ts
git show $BASE:src/domains/stock/screener-analysis.service.ts > scripts/selftest/_parity/screener.OLD.ts
# perbaiki import relatif "./x" -> "../../../src/domains/stock/x"
```

## Run (DB lokal container db-1; read-only SELECT):

```bash
DB_LOCAL=$(grep '^DATABASE_URL=' .env | head -1 | sed 's/@db:5432/@127.0.0.1:5433/; s/^DATABASE_URL=//')
DATABASE_URL="$DB_LOCAL" npx tsx scripts/selftest/_parity/parity-weekly.ts    # 3 minggu terakhir
DATABASE_URL="$DB_LOCAL" npx tsx scripts/selftest/_parity/parity-screener.ts # volume_spike, volume_spike_low, hype_alert
DATABASE_URL="$DB_LOCAL" npx tsx scripts/selftest/_parity/snap-live.ts       # snapshot harian sanity
```

Hasil saat refactor (27 Okt 2026 malam): PARITY PASS 3/3 minggu IDENTIK + screener 3/3 IDENTIK.
