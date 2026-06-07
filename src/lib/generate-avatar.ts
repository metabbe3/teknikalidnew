/**
 * Deterministic SVG identicon generator.
 * Works in both Node.js and browser — no external dependencies.
 * Same seed string always produces the same avatar.
 */

/** djb2 hash — fast 32-bit integer hash, no crypto needed */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Secondary hash for additional entropy */
function djb2aHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Derive pastel background + foreground colors from a seed string */
function generateColors(seed: string): { bg: string; fg: string } {
  const h1 = djb2Hash(seed);
  const h2 = djb2aHash(seed);

  const hue = h1 % 360;
  const sat = 45 + (h2 % 20); // 45–65 % saturation
  const lightBg = 85 + (h1 % 10); // 85–95 % lightness (very light pastel)
  const lightFg = 40 + (h2 % 20); // 40–60 % lightness (readable)

  return {
    bg: `hsl(${hue}, ${sat}%, ${lightBg}%)`,
    fg: `hsl(${hue}, ${sat}%, ${lightFg}%)`,
  };
}

/**
 * Generate a 5×5 symmetric identicon as an SVG string.
 * The grid is mirrored left-right so it always looks balanced.
 *
 * @param seed — email or username (normalized internally)
 * @param size — viewport size in pixels (default 80)
 */
export function generateIdenticonSvg(seed: string, size = 80): string {
  const normalizedSeed = seed.trim().toLowerCase();
  const h1 = djb2Hash(normalizedSeed);
  const h2 = djb2aHash(normalizedSeed);
  const colors = generateColors(normalizedSeed);

  const grid = 5;
  const cellSize = size / grid;

  // Build a 5×5 boolean grid.
  // Only generate the left 3 columns; mirror cols 1→3 and 0→4.
  const cells: boolean[][] = [];
  for (let row = 0; row < grid; row++) {
    cells[row] = [];
    for (let col = 0; col < 3; col++) {
      const bitIndex = row * 3 + col;
      const source = bitIndex < 15 ? h1 : h2;
      const shift = bitIndex % 30;
      cells[row][col] = ((source >> shift) & 1) === 1;
    }
    // Mirror for symmetry
    cells[row][3] = cells[row][1];
    cells[row][4] = cells[row][0];
  }

  let rects = "";
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      if (cells[row][col]) {
        const x = col * cellSize;
        const y = row * cellSize;
        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${colors.fg}"/>`;
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${colors.bg}"/>`,
    rects,
    `</svg>`,
  ].join("");
}

/**
 * Return a `data:image/svg+xml,...` URI that can be used directly in
 * `<img src="...">` or CSS `background-image`.
 */
export function generateIdenticonDataUri(seed: string, size = 80): string {
  const svg = generateIdenticonSvg(seed, size);
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
