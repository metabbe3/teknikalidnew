/**
 * Probe code-audit-tk-2: parity POLA-LAMA (N+1 findUnique) vs POLA-BARU (batch)
 * dengan data asli DB lokal (read-only SELECT). Exit 0 = identik.
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { buildForeignRows } from "../../src/domains/stock/foreign-flow.util";

// Pola createPrismaClient repo (driver adapter PrismaPg) — env DATABASE_URL host-local.
const url = (process.env.DATABASE_URL ?? "").replace("@db:", "@localhost:").replace(":5432/", ":5433/");
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: url, max: 4 })) });

let queries = { old: 0, new: 0 };

async function main() {
  const stock = await prisma.stock.findUnique({ where: { ticker: "BBCA.JK" } });
  if (!stock) throw new Error("BBCA.JK tidak ketemu");

  // ── POLA LAMA: findUnique per baris ──
  const ffOld = await prisma.foreignFlow.findMany({
    where: { stockId: stock.id }, orderBy: { date: "desc" }, take: 5,
  });
  const oldRows = await Promise.all(
    ffOld.map(async (f) => {
      const px = await prisma.stockPrice.findUnique({
        where: { stockId_date: { stockId: f.stockId, date: f.date } },
        select: { close: true },
      });
      const close = px?.close ? Number(px.close) : null;
      const netShares = Number(f.foreignBuy) - Number(f.foreignSell);
      return { date: f.date, netValue: close !== null ? netShares * close : null };
    })
  );
  queries.old = 1 + ffOld.length; // findMany FF + N findUnique

  // ── POLA BARU: batch + helper ──
  const ffNew = await prisma.foreignFlow.findMany({
    where: { stockId: stock.id }, orderBy: { date: "desc" }, take: 5,
  });
  const pxRows = await prisma.stockPrice.findMany({
    where: { stockId: stock.id, date: { in: ffNew.map((f) => f.date) } },
    select: { stockId: true, date: true, close: true },
  });
  const newRows = buildForeignRows(ffNew, pxRows);
  queries.new = 1 + (ffNew.length ? 1 : 0);

  const identical = JSON.stringify(oldRows) === JSON.stringify(newRows);
  console.log("foreignFlow BBCA.JK:", JSON.stringify(oldRows.map(r => ({ d: r.date.toISOString().slice(0,10), v: r.netValue }))));
  console.log("PARITY_FF:", identical ? "IDENTIK" : "BEDA!");
  console.log("QUERY_COUNT ff: old=" + queries.old + " new=" + queries.new);

  // ── Admin reports parity: preview per laporan ──
  const reports = await prisma.report.findMany({ where: { status: { in: ["PENDING", "REVIEWED", "DISMISSED"] } }, orderBy: { createdAt: "desc" }, take: 50 });
  const preview = (kind: "Post" | "Komentar", u: string, c: string) =>
    `${kind} oleh @${u}: "${c.slice(0, 80)}${c.length > 80 ? "..." : ""}"`;

  const oldPrev = new Map<string, string>();
  for (const r of reports) {
    if (r.targetType === "POST") {
      const p = await prisma.post.findUnique({ where: { id: r.targetId }, select: { content: true, author: { select: { username: true } } } });
      oldPrev.set(r.id, p ? preview("Post", p.author.username, p.content) : "[Post dihapus]");
    } else {
      const c = await prisma.comment.findUnique({ where: { id: r.targetId }, select: { content: true, author: { select: { username: true } } } });
      oldPrev.set(r.id, c ? preview("Komentar", c.author.username, c.content) : "[Komentar dihapus]");
    }
  }

  const posts = await prisma.post.findMany({
    where: { id: { in: reports.filter(r => r.targetType === "POST").map(r => r.targetId) } },
    select: { id: true, content: true, author: { select: { username: true } } },
  });
  const comments = await prisma.comment.findMany({
    where: { id: { in: reports.filter(r => r.targetType !== "POST").map(r => r.targetId) } },
    select: { id: true, content: true, author: { select: { username: true } } },
  });
  const postById = new Map(posts.map(p => [p.id, p]));
  const comById = new Map(comments.map(c => [c.id, c]));
  const newPrev = new Map<string, string>();
  for (const r of reports) {
    if (r.targetType === "POST") {
      const p = postById.get(r.targetId);
      newPrev.set(r.id, p ? preview("Post", p.author.username, p.content) : "[Post dihapus]");
    } else {
      const c = comById.get(r.targetId);
      newPrev.set(r.id, c ? preview("Komentar", c.author.username, c.content) : "[Komentar dihapus]");
    }
  }
  let same = true;
  for (const r of reports) if (oldPrev.get(r.id) !== newPrev.get(r.id)) { same = false; console.log("BEDA:", r.id, oldPrev.get(r.id), "VS", newPrev.get(r.id)); }
  console.log("PARITY_REPORTS(" + reports.length + " laporan):", same ? "IDENTIK" : "BEDA!");
  console.log("QUERY_COUNT reports: old=" + (1 + reports.length) + " new=3");

  await prisma.$disconnect();
  if (!identical || !same) process.exit(1);
}
main().catch(async (e) => { console.error(e); process.exit(1); });
