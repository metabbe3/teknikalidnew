import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { computeChange } from "@/lib/serialize";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Pantauan Saham",
  description: "Pantau saham pilihan Anda di satu tempat. Lihat harga, perubahan, dan indikator teknikal untuk saham yang Anda pantau.",
};

export const revalidate = 60;

export default async function WatchlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      stock: {
        select: {
          ticker: true,
          name: true,
          sector: true,
          prices: {
            orderBy: { date: "desc" },
            take: 2,
            select: { close: true },
          },
        },
      },
    },
  });

  const items = watchlist.map((entry) => {
    const { close, change, changePercent } = computeChange(
      entry.stock.prices[0],
      entry.stock.prices[1]
    );
    return {
      id: entry.id,
      ticker: entry.stock.ticker,
      name: entry.stock.name,
      sector: entry.stock.sector,
      close,
      change,
      changePercent,
    };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Daftar Pantauan</h1>
        <p className="text-text-secondary text-sm">
          Saham yang Anda pantau ({items.length} saham)
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-bg-hover flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm">
            Belum ada saham dipantau. Tambahkan saham dari halaman detail.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-grid">
          {items.map((item, i) => (
            <div
              key={item.ticker}
              style={{ "--stagger-i": i } as React.CSSProperties}
              className="bg-bg-card depth-shadow rounded-xl p-4 hover:depth-shadow-hover transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`/stocks/${item.ticker}`}
                    className="font-semibold hover:text-accent transition-colors"
                  >
                    {stripJk(item.ticker)}
                  </a>
                  <p className="text-xs text-text-secondary truncate">{item.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold font-mono text-sm">
                    {item.close != null ? formatPrice(item.close) : "---"}
                  </p>
                  {item.changePercent !== null && (
                    <p className={`text-xs font-mono ${changeColor(item.changePercent)}`}>
                      {item.changePercent >= 0 ? "+" : ""}
                      {formatPercent(item.changePercent)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-text-secondary bg-bg-hover px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {item.sector}
                </span>
                <button
                  data-action="remove-watchlist"
                  data-ticker={item.ticker}
                  className="text-xs text-text-secondary hover:text-bearish transition-colors press-scale"
                  aria-label={`Hapus ${stripJk(item.ticker)} dari daftar pantauan`}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
