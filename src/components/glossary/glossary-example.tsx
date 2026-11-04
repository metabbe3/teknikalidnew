/**
 * GlossaryExample — blok "Contoh angka nyata hari ini" untuk halaman istilah
 * glosarium prioritas (PRD im-2026-10-29-2 fase-2 / prd-2026-11-02-03).
 *
 * SATU PINTU (rule qa-30-01): SEMUA angka di sini diambil dari service existing
 * (marketSnapshotService / screener-analysis / StockDividend / StockFundamental /
 * Stock.listingDate) — DILARANG menghitung indikator sendiri di komponen.
 * Fail-soft: pool kosong / DB error → blok dirender sebagai empty-state jujur
 * ("belum ada data hari ini"), BUKAN angka karangan — sesuai spirit fail-closed
 * PRD prd-2026-11-02-02 dan doctrine data-trust.
 *
 * ponytail: reuse fetchScreenerRows retry pattern (ISR re-bake blip) + formatPrice.
 */
import Link from "next/link";
import { ArrowRight, Sigma } from "lucide-react";
import { formatPrice, stripJk } from "@/lib/utils";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import type { GlossaryExampleSpec } from "@/lib/glossary-deep-dives";
import { prisma } from "@/lib/prisma";

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("id-ID", { maximumFractionDigits: digits });
}
function fmtDateWIB(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(d);
}
function fmtMarketCap(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1e12) return `Rp${(v / 1e12).toFixed(1)} T`;
  if (v >= 1e9) return `Rp${(v / 1e9).toFixed(1)} M`;
  return formatPrice(v);
}

export async function GlossaryExample({ spec }: { spec: GlossaryExampleSpec }) {
  let body: React.ReactNode = null;

  try {
    if (spec.kind === "screener_top") {
      const { stocks, failed } = await fetchScreenerRows(spec.preset, 3);
      const rows = stocks as Array<{
        ticker: string; name: string; close: number | null; rsi14?: number | null;
        sma20?: number | null; sma50?: number | null;
      }>;
      if (!failed && rows.length > 0) {
        body = (
          <ul className="divide-y divide-border">
            {rows.map((s) => (
              <li key={s.ticker} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/stocks/${s.ticker}`} className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
                    {stripJk(s.ticker)}
                  </Link>
                  <p className="text-xs text-text-tertiary truncate max-w-[260px] sm:max-w-sm">{s.name}</p>
                </div>
                <div className="text-right font-mono text-xs sm:text-sm text-text-secondary">
                  <span className="block">Harga {formatPrice(s.close ?? 0)}</span>
                  {s.rsi14 != null && <span className="block text-text-tertiary">RSI {fmtNum(s.rsi14, 1)}</span>}
                  {s.sma20 != null && <span className="block text-text-tertiary">SMA20 {fmtNum(s.sma20, 0)}</span>}
                </div>
              </li>
            ))}
          </ul>
        );
      }
    } else if (spec.kind === "oversold_count") {
      const [count, snap] = await Promise.all([
        marketSnapshotService.getOversoldCount(),
        marketSnapshotService.getSnapshot(),
      ]);
      if (count > 0) {
        body = (
          <div className="py-2 space-y-1.5 font-mono text-sm text-text-secondary">
            <p>
              Sesi <span className="text-text-primary font-semibold">{snap.sessionDate ?? "terakhir"}</span> —{" "}
              <span className="text-text-primary font-semibold">{count} saham</span> berstatus oversold
              (RSI&lt;30, non-gorengan, aktif).
            </p>
            {snap.ihsg && (
              <p className="text-text-tertiary">
                Konteks IHSG: {fmtNum(snap.ihsg.close, 2)} ({fmtPct(snap.ihsg.changePercent)}) —{" "}
                <Link href="/saham-oversold" className="text-accent hover:underline">lihat daftar lengkap</Link>.
              </p>
            )}
          </div>
        );
      }
    } else if (spec.kind === "dividend_upcoming") {
      const today = new Date();
      const rows = await prisma.stockDividend.findMany({
        where: { exDate: { gte: today } },
        orderBy: { exDate: "asc" },
        take: 3,
        select: {
          amount: true, exDate: true,
          stock: { select: { ticker: true, name: true } },
        },
      });
      if (rows.length > 0) {
        body = (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={`${r.stock.ticker}-${r.exDate?.toISOString()}`} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/stocks/${r.stock.ticker}`} className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
                    {stripJk(r.stock.ticker)}
                  </Link>
                  <p className="text-xs text-text-tertiary truncate max-w-[260px] sm:max-w-sm">{r.stock.name}</p>
                </div>
                <div className="text-right font-mono text-xs sm:text-sm text-text-secondary">
                  {r.exDate && <span className="block">Ex date {fmtDateWIB(r.exDate)}</span>}
                  {r.amount != null && <span className="block">Dividen {formatPrice(Number(r.amount))}/lembar</span>}
                </div>
              </li>
            ))}
          </ul>
        );
      }
    } else if (spec.kind === "fundamental_top") {
      // SATU PINTU fundamental: pakai tanggal snapshot fundamental ter-isi terakhir
      // (pola screener-analysis FUNDAMENTAL_PRESETS — fundamental tertinggal dari
      // harga harian, join paksa ke tanggal harga = hasil selalu kosong).
      const fundDateRow = await prisma.$queryRaw<Array<{ date: Date }>>`
        SELECT sf.date FROM "StockFundamental" sf
        JOIN "Stock" s ON s.id = sf."stockId" AND s."isActive" = true
        WHERE sf."dividendYield" IS NOT NULL OR sf.pe IS NOT NULL OR sf."marketCap" IS NOT NULL
        GROUP BY sf.date HAVING COUNT(*) >= 100
        ORDER BY sf.date DESC LIMIT 1`;
      const fundDate = fundDateRow[0]?.date;
      if (fundDate) {
        const rows = await prisma.$queryRaw<
          Array<{ ticker: string; name: string; close: number | null; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }>
        >`
          SELECT s.ticker, s.name, sp.close::float8 AS close, sf.pe::float8 AS pe,
                 sf.pb::float8 AS pb, sf.eps::float8 AS eps,
                 sf."dividendYield"::float8 AS "dividendYield", sf."marketCap"
          FROM "StockFundamental" sf
          JOIN "Stock" s ON s.id = sf."stockId" AND s."isActive" = true
          LEFT JOIN LATERAL (
            SELECT close FROM "StockPrice"
            WHERE "stockId" = s.id ORDER BY date DESC LIMIT 1
          ) sp ON true
          WHERE sf.date = ${fundDate} AND sf."marketCap" IS NOT NULL
          ORDER BY sf."marketCap" DESC LIMIT 3`;
        if (rows.length > 0) {
          body = (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.ticker} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`/stocks/${r.ticker}`} className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
                      {stripJk(r.ticker)}
                    </Link>
                    <p className="text-xs text-text-tertiary truncate max-w-[240px] sm:max-w-sm">
                      Kap. pasar {fmtMarketCap(Number(r.marketCap))}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs sm:text-sm text-text-secondary">
                    <span className="block">P/E {fmtNum(r.pe, 2)} · P/BV {fmtNum(r.pb, 2)}</span>
                    {r.eps != null && <span className="block text-text-tertiary">EPS {fmtNum(r.eps, 0)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          );
        }
      }
    } else if (spec.kind === "ipo_recent") {
      const rows = await prisma.stock.findMany({
        where: { listingDate: { not: null }, isActive: true, assetClass: "EQUITY" },
        orderBy: { listingDate: "desc" },
        take: 3,
        select: {
          ticker: true, name: true, listingDate: true,
          prices: { orderBy: { date: "desc" }, take: 1, select: { close: true } },
        },
      });
      if (rows.length > 0) {
        body = (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.ticker} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/stocks/${r.ticker}`} className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
                    {stripJk(r.ticker)}
                  </Link>
                  <p className="text-xs text-text-tertiary truncate max-w-[260px] sm:max-w-sm">{r.name}</p>
                </div>
                <div className="text-right font-mono text-xs sm:text-sm text-text-secondary">
                  {r.listingDate && <span className="block">Listing {fmtDateWIB(r.listingDate)}</span>}
                  {r.prices[0] && <span className="block text-text-tertiary">Harga {formatPrice(Number(r.prices[0].close))}</span>}
                </div>
              </li>
            ))}
          </ul>
        );
      }
    } else if (spec.kind === "ihsg_snapshot") {
      const snap = await marketSnapshotService.getSnapshot();
      if (snap.ihsg) {
        body = (
          <div className="py-2 space-y-1.5 font-mono text-sm text-text-secondary">
            <p>
              IHSG sesi <span className="text-text-primary font-semibold">{snap.sessionDate ?? "terakhir"}</span>:{" "}
              <span className="text-text-primary font-semibold">{fmtNum(snap.ihsg.close, 2)}</span> ({fmtPct(snap.ihsg.changePercent)}).
            </p>
            <p className="text-text-tertiary">
              Breadth: {snap.breadth.advancers} naik / {snap.breadth.decliners} turun dari {snap.breadth.total} saham —{" "}
              <Link href="/stocks" className="text-accent hover:underline">lihat pasar</Link>.
            </p>
          </div>
        );
      }
    } else if (spec.kind === "lot_math") {
      const snap = await marketSnapshotService.getSnapshot();
      const liquid = await prisma.stock.findFirst({
        where: { isActive: true, assetClass: "EQUITY", ticker: { in: ["BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK"] } },
        orderBy: [{ prices: { _count: "desc" } }],
        select: {
          ticker: true, name: true,
          prices: { orderBy: { date: "desc" }, take: 1, select: { close: true } },
        },
      });
      const close = liquid?.prices[0] ? Number(liquid.prices[0].close) : null;
      if (close != null && close > 0) {
        body = (
          <div className="py-2 space-y-1.5 font-mono text-sm text-text-secondary">
            <p>
              {stripJk(liquid!.ticker)} ditutup <span className="text-text-primary font-semibold">{formatPrice(close)}</span>/lembar
              (sesi {snap.sessionDate ?? "terakhir"}).
            </p>
            <p className="text-text-tertiary">
              1 lot = 100 lembar → modal per lot ≈{" "}
              <span className="text-text-primary font-semibold">{formatPrice(close * 100)}</span> (belum termasuk biaya broker).
            </p>
          </div>
        );
      }
    }
  } catch {
    body = null; // fail-soft: empty-state jujur, bukan 500
  }

  return (
    <section
      className="mb-6 p-6 bg-bg-card rounded-xl depth-shadow border border-border"
      aria-label="Contoh angka nyata hari ini"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sigma className="h-4 w-4 text-accent" />
        <h2 className="text-base font-bold text-text-primary">Contoh angka nyata hari ini</h2>
      </div>
      {body ?? (
        <p className="text-sm text-text-tertiary italic">
          Data pasar untuk contoh belum tersedia saat halaman ini dibuat. Angka akan
          muncul otomatis pada pembaruan berikutnya — tidak ada angka perkiraan di halaman ini.
        </p>
      )}
      <p className="mt-3 text-[11px] font-mono text-text-tertiary">
        Sumber: data live teknikal.id — bukan angka karangan.
      </p>
    </section>
  );
}
