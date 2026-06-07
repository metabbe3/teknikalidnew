import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { stripJk } from "@/lib/utils";

export const runtime = "nodejs";

// --- Locale-safe formatting (no Intl.NumberFormat dependency) ---

function ogPrice(v: number): string {
  return "Rp" + Math.round(v).toLocaleString("en-US");
}

function ogPercent(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function ogVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(v).toString();
}

// --- Sparkline generation ---

function generateSparkline(prices: number[]) {
  if (prices.length < 2) return { linePath: "", fillPath: "", lastX: 0, lastY: 0 };

  const W = 1100;
  const H = 120;
  const PAD = 10;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (prices.length - 1);

  const pts = prices.map((p, i) => ({
    x: PAD + i * stepX,
    y: PAD + (H - PAD * 2) - ((p - min) / range) * (H - PAD * 2),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const fillPath =
    linePath +
    ` L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD).toFixed(1)}` +
    ` L${pts[0].x.toFixed(1)},${(H - PAD).toFixed(1)} Z`;

  return {
    linePath,
    fillPath,
    lastX: pts[pts.length - 1].x,
    lastY: pts[pts.length - 1].y,
  };
}

// --- Signal badge colors ---

function signalColors(label: string | null) {
  switch (label) {
    case "Strong Bullish":
      return { bg: "rgba(16,185,129,0.25)", text: "#34d399", arrow: "▲▲" };
    case "Bullish":
      return { bg: "rgba(16,185,129,0.15)", text: "#6ee7b7", arrow: "▲" };
    case "Bearish":
      return { bg: "rgba(239,68,68,0.15)", text: "#fca5a5", arrow: "▼" };
    case "Strong Bearish":
      return { bg: "rgba(239,68,68,0.25)", text: "#f87171", arrow: "▼▼" };
    default:
      return { bg: "rgba(255,255,255,0.08)", text: "#94a3b8", arrow: "--" };
  }
}

// --- RSI color ---

function rsiHex(v: number | null) {
  if (v === null) return "#94a3b8";
  if (v > 70) return "#f87171";
  if (v < 30) return "#34d399";
  return "#94a3b8";
}

// --- Indicator pill ---

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "#64748b", fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ color, fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

// --- Fallback image ---

function fallbackImage(ticker: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <span style={{ color: "white", fontSize: 48, fontWeight: 800, fontFamily: "monospace" }}>
          {stripJk(ticker)}
        </span>
        <span style={{ color: "#64748b", fontSize: 18, marginTop: 16 }}>teknikal.id</span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

// --- Route handler ---

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return new Response("Missing ticker", { status: 400 });
  }

  try {
    const data = await stockMarketService.getStockOgData(ticker);

    const isPositive = data.change !== null && data.change >= 0;
    const lineColor = isPositive ? "#0d9488" : "#dc2626";
    const sig = signalColors(data.signalLabel);
    const spark = generateSparkline(data.sparkline);

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0f172a",
            padding: 48,
          }}
        >
          {/* Row 1: Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  backgroundColor: "#3b82f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 18, fontWeight: 800,
                }}
              >
                T
              </div>
              <span style={{ color: "#94a3b8", fontSize: 18, fontWeight: 600 }}>TeknikalID</span>
            </div>
            <span style={{ color: "#64748b", fontSize: 14 }}>Analisis Teknikal</span>
          </div>

          {/* Row 2: Stock info + Price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 36 }}>
            {/* Left: Stock identity */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "white", fontSize: 44, fontWeight: 800, fontFamily: "monospace" }}>
                  {stripJk(data.ticker)}
                </span>
                <span
                  style={{
                    padding: "4px 14px", borderRadius: 6,
                    backgroundColor: sig.bg, color: sig.text,
                    fontSize: 16, fontWeight: 700,
                  }}
                >
                  {sig.arrow} {data.signalLabel || "Netral"}
                </span>
                {data.isGorengan && (
                  <span
                    style={{
                      padding: "4px 12px", borderRadius: 6,
                      backgroundColor: "rgba(245,158,11,0.2)",
                      color: "#fbbf24", fontSize: 14, fontWeight: 700,
                    }}
                  >
                    Gorengan
                  </span>
                )}
              </div>
              <span style={{ color: "#94a3b8", fontSize: 18 }}>{data.name}</span>
              <span style={{ color: "#64748b", fontSize: 14 }}>{data.sector}</span>
            </div>

            {/* Right: Price block */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ color: "white", fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {data.close !== null ? ogPrice(data.close) : "—"}
              </span>
              {data.changePercent !== null && (
                <span style={{ color: lineColor, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {ogPercent(data.changePercent)}
                  {data.change !== null && (
                    <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 8 }}>
                      ({data.change >= 0 ? "+" : ""}{ogPrice(Math.abs(data.change))})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Row 3: Sparkline */}
          {data.sparkline.length >= 2 && (
            <div style={{ display: "flex", marginTop: 28, marginBottom: 24 }}>
              <svg width="1104" height="140" viewBox="0 0 1104 140">
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={spark.fillPath} fill="url(#sg)" />
                <path
                  d={spark.linePath}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={spark.lastX} cy={spark.lastY} r="4" fill={lineColor} />
              </svg>
            </div>
          )}

          {/* Spacer if no sparkline */}
          {data.sparkline.length < 2 && <div style={{ flex: 1 }} />}

          {/* Row 4: Indicator strip */}
          <div
            style={{
              display: "flex", gap: 24, alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 16, paddingBottom: 16,
            }}
          >
            <Pill label="RSI" value={data.rsi14 !== null ? data.rsi14.toFixed(0) : "—"} color={rsiHex(data.rsi14)} />
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <Pill
              label="MACD"
              value={data.macdHist !== null ? (data.macdHist >= 0 ? "▲ Bullish" : "▼ Bearish") : "—"}
              color={data.macdHist !== null && data.macdHist >= 0 ? "#34d399" : "#f87171"}
            />
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <Pill label="SMA" value={data.smaStatus} color="#94a3b8" />
            {data.volume !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                <Pill label="Vol" value={ogVolume(data.volume)} color="#94a3b8" />
              </div>
            )}
          </div>

          {/* Row 5: Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 2, width: 40, backgroundColor: "#3b82f6", borderRadius: 1 }} />
              <span style={{ color: "#64748b", fontSize: 13 }}>
                teknikal.id/stocks/{data.ticker}
              </span>
            </div>
            <span style={{ color: "#475569", fontSize: 11 }}>Data tertunda ~5mnt</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[OG stock] Failed for ticker:", ticker, error);
    return fallbackImage(ticker);
  }
}
