#!/bin/bash
# TeknikalID Production Database Setup
# Run once after `docker compose up -d` on a fresh server
# Creates admin account, seeds stocks, backfills price data
# Delete after setup: rm scripts/setup-prod-db.sh

set -e

echo "=== TeknikalID Database Setup ==="
echo ""

# 1. Run migrations (also runs on container startup, but safe to re-run)
echo "[1/5] Running Prisma migrations..."
docker compose exec app npx prisma migrate deploy

# 2. Create admin account
echo ""
echo "[2/5] Creating admin account..."
read -p "Admin email: " ADMIN_EMAIL
read -sp "Admin password: " ADMIN_PASSWORD
echo ""
read -p "Admin name [Tim TeknikalID]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Tim TeknikalID}
read -p "Admin username [teknikalid]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-teknikalid}

docker compose exec app node -e "
const { PrismaClient } = require('./src/generated/prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('${ADMIN_PASSWORD}', 12);
  const user = await prisma.user.upsert({
    where: { email: '${ADMIN_EMAIL}' },
    update: { role: 'ADMIN', name: '${ADMIN_NAME}', username: '${ADMIN_USERNAME}', password: hash },
    create: { email: '${ADMIN_EMAIL}', name: '${ADMIN_NAME}', username: '${ADMIN_USERNAME}', password: hash, role: 'ADMIN' },
  });
  console.log('Admin created:', user.email, user.role);
  await prisma.\$disconnect();
})();
"

# 3. Seed IDX stocks
echo ""
echo "[3/5] Seeding 956 IDX stocks..."
docker compose exec app npx tsx prisma/seed.ts

# 4. Backfill historical prices (1 year)
echo ""
echo "[4/5] Backfilling historical prices (this takes 30-60 min)..."
echo "  You can Ctrl+C and run later: docker compose exec app npx tsx scripts/backfill-historical.ts"
read -p "Run backfill now? [y/N]: " RUN_BACKFILL
if [ "$RUN_BACKFILL" = "y" ] || [ "$RUN_BACKFILL" = "Y" ]; then
  docker compose exec app npx tsx scripts/backfill-historical.ts
fi

# 5. Recalculate indicators
echo ""
echo "[5/5] Recalculating technical indicators..."
echo "  Run later: docker compose exec app npx tsx scripts/recalculate-indicators.ts"
read -p "Run now? [y/N]: " RUN_INDICATORS
if [ "$RUN_INDICATORS" = "y" ] || [ "$RUN_INDICATORS" = "Y" ]; then
  docker compose exec app npx tsx scripts/recalculate-indicators.ts
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Your admin login:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: (the one you set)"
echo "  URL:      http://localhost:3000/admin/login"
echo ""
echo "Daily cron jobs — set these up on the server:"
echo "  0 17 * * 1-5 cd $(pwd) && docker compose exec app npx tsx scripts/update-prices.ts >> cron.log 2>&1"
echo "  30 17 * * 1-5 cd $(pwd) && docker compose exec app npx tsx scripts/recalculate-indicators.ts >> cron.log 2>&1"
echo ""
echo "Now delete this script: rm scripts/setup-prod-db.sh"
