export function getIdxTickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

export function roundToIdxFraction(
  price: number,
  type: "ENTRY" | "STOP_LOSS" | "TAKE_PROFIT",
): number {
  const tick = getIdxTickSize(price);
  if (type === "ENTRY") return Math.round(price / tick) * tick;
  // STOP_LOSS and TAKE_PROFIT round down
  return Math.floor(price / tick) * tick;
}

export function getAraArbLimits(previousClose: number): { ara: number; arb: number } {
  let pct: number;
  if (previousClose < 200) pct = 0.35;
  else if (previousClose < 5000) pct = 0.25;
  else pct = 0.20;

  const rawAra = previousClose * (1 + pct);
  const rawArb = previousClose * (1 - pct);

  return {
    ara: roundToIdxFraction(rawAra, "TAKE_PROFIT"),
    arb: roundToIdxFraction(rawArb, "STOP_LOSS"),
  };
}
