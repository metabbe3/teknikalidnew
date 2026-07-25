import { decimalToNumber } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";
import { MiniSparkline } from "@/components/chart/mini-sparkline";

export async function IhsgMiniChart() {
  // Fetch IHSG stock + its price history
  const ihsgStock = await prisma.stock.findUnique({
    where: { ticker: "^JKSE" },
  });

  if (!ihsgStock) return null;

  const prices = await prisma.stockPrice.findMany({
    where: { stockId: ihsgStock.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  // If no price data at all, show the stock name + "no data"
  if (prices.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
            IHSG
          </p>
          <p className="text-sm font-semibold text-white">—</p>
        </div>
      </div>
    );
  }

  const latest = prices[0];
  const close = decimalToNumber(latest.close);

  // Calculate change — either from previous day or from stock.changePercent
  let change: number | null = null;
  let changePercent: number | null = null;

  if (prices.length >= 2) {
    const prev = prices[1];
    const prevClose = decimalToNumber(prev.close);
    if (close && prevClose) {
      change = close - prevClose;
      changePercent = prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : null;
    }
  } else {
    // Fallback: use open vs close for the single record
    const open = decimalToNumber(latest.open);
    if (close && open && open !== 0) {
      change = close - open;
      changePercent = ((close - open) / open) * 100;
    }
  }

  // Build sparkline data (reversed so oldest → newest)
  const sparklineData = prices
    .slice()
    .reverse()
    .map((p) => decimalToNumber(p.close))
    .filter((v): v is number => v !== null);

  const isPositive = change !== null && change >= 0;
  const color = isPositive ? "#34d399" : "#f87171";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          IHSG
        </p>
        <p className="text-lg font-bold font-mono tabular-nums text-white">
          {close ? close.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "—"}
        </p>
        {changePercent !== null && (
          <p
            className="text-xs font-semibold font-mono tabular-nums"
            style={{ color }}
          >
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </p>
        )}
      </div>
      <div className="flex-1 h-12 overflow-hidden flex items-center">
        {sparklineData.length >= 2 ? (
          <MiniSparkline data={sparklineData} width={140} height={48} color={color} />
        ) : (
          <p className="text-[10px] text-gray-600 italic">Data historis belum tersedia</p>
        )}
      </div>
    </div>
  );
}
