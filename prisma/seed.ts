import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { IDX_STOCKS, IDX40_TICKERS } from "../src/lib/idx-stocks";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Seeding ${IDX_STOCKS.length} IDX stocks...`);

  const idx40Set = new Set(IDX40_TICKERS);

  for (const stock of IDX_STOCKS) {
    await prisma.stock.upsert({
      where: { ticker: stock.ticker },
      update: {
        name: stock.name,
        sector: stock.sector,
        listingBoard: stock.listingBoard,
        isActive: true,
      },
      create: {
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        listingBoard: stock.listingBoard,
        isActive: true,
      },
    });
  }

  // Deactivate stocks in DB that are no longer in the stock list
  const allTickers = IDX_STOCKS.map((s) => s.ticker);
  const deactivated = await prisma.stock.updateMany({
    where: { ticker: { notIn: allTickers }, isActive: true },
    data: { isActive: false },
  });

  const count = await prisma.stock.count({ where: { isActive: true } });
  const idx40Count = await prisma.stock.count({ where: { ticker: { in: IDX40_TICKERS } } });
  console.log(`Seeded ${IDX_STOCKS.length} stocks. Active: ${count}. IDX40: ${idx40Count}.`);
  if (deactivated.count > 0) console.log(`Deactivated ${deactivated.count} removed stocks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
