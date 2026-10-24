"use client";

import Image from "next/image";

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
  size?: number;
}

/**
 * Stock emblem — issuer logo dari /public/logos (mirror lokal, weekend 24 Okt 2026:
 * 47 logo asli big-caps + fallback monogram tile utk sisanya).
 * Logo file tak ada → monogram tile (tanpa broken image / request gagal).
 */
export function StockLogo({ name, ticker, size = 32 }: StockLogoProps) {
  const base = ticker.replace(/\.JK$/i, "");
  const letter = (base.charAt(0) || name.charAt(0) || "?").toUpperCase();
  return (
    <Image
      src={`/logos/${base}.jpg`}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="rounded-md flex-shrink-0 object-cover"
      // rantai fallback: .jpg asli (IDX mirror 25 Okt, 425 emiten) → .svg monogram → tile huruf
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fallback === "2") return;
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          img.src = `/logos/${base}.svg`;
          return;
        }
        img.dataset.fallback = "2";
        const parent = img.parentElement;
        if (parent) {
          const tile = document.createElement("div");
          tile.className =
            "flex items-center justify-center bg-accent-muted text-accent font-bold flex-shrink-0";
          tile.style.width = `${size}px`;
          tile.style.height = `${size}px`;
          tile.style.fontSize = `${Math.round(size * 0.45)}px`;
          tile.textContent = letter;
          tile.setAttribute("role", "img");
          tile.setAttribute("aria-label", `${name} logo`);
          parent.replaceChild(tile, img);
        }
      }}
    />
  );
}
