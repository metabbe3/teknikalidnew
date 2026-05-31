#!/bin/bash
# TeknikalID Production Database Setup
# Run once after `docker compose up -d` on a fresh server
# Creates admin account, seeds stocks, backfills price data
# Delete after setup: rm scripts/setup-prod-db.sh

set -e

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"

# Determine DATABASE_URL for local scripts (points to Docker DB)
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-teknikalid}"
DB_NAME="${DB_NAME:-teknikalid}"

# Read password from .env or fall back to default
if [ -f .env ]; then
  DB_PASS=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2)
else
  DB_PASS="teknikalid_secret_2024"
fi

LOCAL_DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}"

echo "=== TeknikalID Database Setup ==="
echo ""

# 1. Run migrations (also runs on container startup, but safe to re-run)
echo "[1/5] Running Prisma migrations..."
docker compose exec app node node_modules/prisma/build/index.js migrate deploy

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

# Create a temp script that uses PrismaPg adapter + Account for credentials
TEMP_SCRIPT=$(mktemp /tmp/create-admin.XXXXXX.ts)
cat > "$TEMP_SCRIPT" << ADMIN_SCRIPT
import { PrismaClient } from "${DEPLOY_DIR}/src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const hash = await bcrypt.hash("${ADMIN_PASSWORD}", 12);

  // Create/update user (no password field on User model)
  const user = await prisma.user.upsert({
    where: { email: "${ADMIN_EMAIL}" },
    update: { role: "ADMIN", name: "${ADMIN_NAME}", username: "${ADMIN_USERNAME}" },
    create: { email: "${ADMIN_EMAIL}", name: "${ADMIN_NAME}", username: "${ADMIN_USERNAME}", role: "ADMIN" },
  });

  // Store hashed password in Account table (credentials provider pattern)
  const existing = await prisma.account.findFirst({
    where: { userId: user.id, provider: "credentials" }
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { access_token: hash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: "${ADMIN_EMAIL}",
        access_token: hash,
      },
    });
  }

  console.log("Admin created:", user.email, user.role);
  await prisma.\$disconnect();
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
ADMIN_SCRIPT

DATABASE_URL="$LOCAL_DB_URL" npx tsx "$TEMP_SCRIPT"
rm -f "$TEMP_SCRIPT"

# 3. Seed IDX stocks (runs locally, connects to Docker DB)
echo ""
echo "[3/5] Seeding 956 IDX stocks..."
DATABASE_URL="$LOCAL_DB_URL" npx tsx prisma/seed.ts

# 4. Backfill historical prices (runs locally, connects to Docker DB)
echo ""
echo "[4/5] Backfilling historical prices (this takes 30-60 min)..."
echo "  You can Ctrl+C and run later: DATABASE_URL=\"$LOCAL_DB_URL\" npx tsx scripts/backfill-historical.ts"
read -p "Run backfill now? [y/N]: " RUN_BACKFILL
if [ "$RUN_BACKFILL" = "y" ] || [ "$RUN_BACKFILL" = "Y" ]; then
  DATABASE_URL="$LOCAL_DB_URL" npx tsx scripts/backfill-historical.ts
fi

# 5. Recalculate indicators (runs locally, connects to Docker DB)
echo ""
echo "[5/5] Recalculating technical indicators..."
echo "  Run later: DATABASE_URL=\"$LOCAL_DB_URL\" npx tsx scripts/recalculate-indicators.ts"
read -p "Run now? [y/N]: " RUN_INDICATORS
if [ "$RUN_INDICATORS" = "y" ] || [ "$RUN_INDICATORS" = "Y" ]; then
  DATABASE_URL="$LOCAL_DB_URL" npx tsx scripts/recalculate-indicators.ts
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Your admin login:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: (the one you set)"
echo "  URL:      http://localhost:3000/auth/signin"
echo ""
echo "Daily cron jobs — set these up on the server:"
echo "  0 10 * * 1-5 cd $(pwd) && DATABASE_URL=\"$LOCAL_DB_URL\" npx tsx scripts/update-prices.ts >> cron.log 2>&1"
echo "  30 10 * * 1-5 cd $(pwd) && DATABASE_URL=\"$LOCAL_DB_URL\" npx tsx scripts/recalculate-indicators.ts >> cron.log 2>&1"
echo ""
echo "Now delete this script: rm scripts/setup-prod-db.sh"
