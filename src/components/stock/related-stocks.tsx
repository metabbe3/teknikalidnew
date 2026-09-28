import { computeNeighbors } from "@/domains/stock/stock-graph.service";
import { StockCard } from "./stock-card";

/**
 * Internal-link mesh node: rich "Saham Terkait" cards on the stock detail page.
 * Server component — fetches ranked same-sector neighbors and renders StockCards,
 * passing link equity to sector peers with their live verdict + %change visible.
 * Renders nothing if no neighbors (keeps the page clean for thinly-populated sectors).
 */
export async function RelatedStocks({ ticker }: { ticker: string }) {
  const neighbors = await computeNeighbors(ticker, 3);
  if (neighbors.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">Saham Terkait</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {neighbors.map((n) => (
          <StockCard key={n.ticker} {...n} />
        ))}
      </div>
    </div>
  );
}
