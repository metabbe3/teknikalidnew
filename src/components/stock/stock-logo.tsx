interface StockLogoProps {
  name: string;
  ticker: string;
  /**
   * Issuer logos are served from idx.co.id, which (a) the page CSP blocks for
   * `img-src` and (b) returns 403 to any server-side fetch. Rather than ship a
   * broken image or a noisy failed request, we render a consistent branded
   * monogram tile. `src` is accepted for API compatibility but intentionally
   * unused.
   */
  src?: string | null;
}

/**
 * Stock emblem — a branded monogram tile (first letter of the ticker).
 * Guarantees no broken image and no console errors next to the ticker h1.
 */
export function StockLogo({ name, ticker }: StockLogoProps) {
  const letter = (ticker.replace(/\.JK$/i, "").charAt(0) || name.charAt(0) || "?").toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-md flex items-center justify-center bg-accent-muted text-accent font-bold text-sm flex-shrink-0"
      role="img"
      aria-label={`${name} logo`}
    >
      {letter}
    </div>
  );
}
