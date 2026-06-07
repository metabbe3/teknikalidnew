import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { stockMarketService, type StockOgData } from "@/domains/stock/stock-market.service";
import { stripJk } from "@/lib/utils";

export const runtime = "nodejs";

// --- Formatting helpers ---

function fmtPrice(v: number): string {
  return "Rp" + Math.round(v).toLocaleString("en-US");
}

function fmtPercent(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(v).toString();
}

function fmtNum(v: number, decimals = 1): string {
  return v.toFixed(decimals);
}

// --- Sparkline hero (light mode, taller) ---

function generateSparklineHero(prices: number[]) {
  if (prices.length < 2) return { linePath: "", fillPath: "", lastX: 0, lastY: 0 };

  const W = 952;
  const H = 300;
  const PAD = 12;

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

// --- Colors (light mode) ---

function signalBadge(label: string | null) {
  switch (label) {
    case "Strong Bullish":
      return { bg: "rgba(5,150,105,0.12)", text: "#047857", label: "Strong Bullish" };
    case "Bullish":
      return { bg: "rgba(16,185,129,0.10)", text: "#059669", label: "Bullish" };
    case "Bearish":
      return { bg: "rgba(239,68,68,0.10)", text: "#dc2626", label: "Bearish" };
    case "Strong Bearish":
      return { bg: "rgba(220,38,38,0.12)", text: "#b91c1c", label: "Strong Bearish" };
    default:
      return { bg: "rgba(100,116,139,0.10)", text: "#64748b", label: "Netral" };
  }
}

function rsiColor(v: number | null) {
  if (v === null) return "#64748b";
  if (v > 70) return "#dc2626";
  if (v < 30) return "#059669";
  return "#334155";
}

function rsiLabel(v: number | null) {
  if (v === null) return "";
  if (v > 70) return "Overbought";
  if (v < 30) return "Oversold";
  return "";
}

function adxLabel(v: number | null) {
  if (v === null) return "";
  if (v > 50) return "Very Strong";
  if (v > 25) return "Strong";
  return "Weak";
}

function confidenceColor(c: string | null) {
  switch (c) {
    case "high": return "#059669";
    case "medium": return "#d97706";
    case "low": return "#dc2626";
    default: return "#64748b";
  }
}

function confidenceBg(c: string | null) {
  switch (c) {
    case "high": return "rgba(5,150,105,0.10)";
    case "medium": return "rgba(217,119,6,0.10)";
    case "low": return "rgba(220,38,38,0.10)";
    default: return "rgba(100,116,139,0.08)";
  }
}

function confidenceLabel(c: string | null) {
  switch (c) {
    case "high": return "Tinggi";
    case "medium": return "Sedang";
    case "low": return "Rendah";
    default: return "--";
  }
}

// --- Indicator row (light mode) ---

function IndicatorRow({ label, value, status, statusColor }: {
  label: string;
  value: string;
  status?: string;
  statusColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 9, paddingBottom: 9, borderTop: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: 22, fontWeight: 600, width: 140 }}>{label}</span>
      <span style={{ color: "#0f172a", fontSize: 32, fontWeight: 700, fontFamily: "monospace" }}>{value}</span>
      {status !== undefined && status !== "" ? (
        <span style={{ color: statusColor ?? "#94a3b8", fontSize: 20, fontWeight: 600, marginLeft: 8 }}>{status}</span>
      ) : (
        <div style={{ width: 80 }} />
      )}
    </div>
  );
}

// --- Fallback image (light mode) ---

function fallbackImage(ticker: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1080, height: 1920,
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          backgroundColor: "#f1f5f9",
        }}
      >
        <div style={{ display: "flex", width: 1080, height: 8, backgroundColor: "#2563eb" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: 1080, height: 1912 }}>
          <span style={{ color: "#0f172a", fontSize: 96, fontWeight: 800, fontFamily: "monospace" }}>
            {stripJk(ticker)}
          </span>
          <span style={{ color: "#64748b", fontSize: 28, marginTop: 24 }}>teknikal.id</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}

// --- Main route handler ---

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return new Response("Missing ticker", { status: 400 });
  }

  try {
    const data = await stockMarketService.getStockOgData(ticker);

    const isPositive = data.change !== null && data.change >= 0;
    const changeColor = isPositive ? "#059669" : "#dc2626";
    const lineColor = isPositive ? "#10b981" : "#ef4444";
    const priceBg = isPositive ? "rgba(5,150,105,0.06)" : "rgba(220,38,38,0.06)";
    const sig = signalBadge(data.signalLabel);
    const spark = generateSparklineHero(data.sparkline);

    return new ImageResponse(
      (
        <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", backgroundColor: "#f1f5f9" }}>
          {/* === Top Accent Bar === */}
          <div style={{ display: "flex", width: 1080, height: 8, backgroundColor: "#2563eb" }} />

          {/* === Background ambient glow === */}
          <svg width="1080" height="1912" viewBox="0 0 1080 1912" style={{ position: "absolute", top: 8, left: 0 }}>
            <defs>
              <radialGradient id="glow" cx="50%" cy="30%" r="35%">
                <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.05" />
                <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1080" height="1912" fill="url(#glow)" />
          </svg>

          {/* === Safe Zone Container === */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            paddingTop: 152,
            paddingBottom: 280,
            paddingLeft: 48,
            paddingRight: 48,
            width: 1080,
            height: 1920,
          }}>

            {/* ── Signal + Gorengan Badges ── */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                paddingTop: 10, paddingBottom: 10, paddingLeft: 24, paddingRight: 24,
                borderRadius: 14,
                backgroundColor: sig.bg,
                color: sig.text,
                fontSize: 28, fontWeight: 700,
              }}>
                {sig.label}
              </div>
              {data.isGorengan && (
                <div style={{
                  paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16,
                  borderRadius: 12,
                  backgroundColor: "rgba(217,119,6,0.10)",
                  color: "#d97706",
                  fontSize: 22, fontWeight: 700,
                  marginLeft: 12,
                }}>
                  Gorengan
                </div>
              )}
            </div>

            {/* Spacer 12px */}
            <div style={{ height: 12 }} />

            {/* ── Stock Identity ── */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#0f172a", fontSize: 104, fontWeight: 800, fontFamily: "monospace", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
                {stripJk(data.ticker)}
              </span>
              <span style={{ color: "#334155", fontSize: 30, fontWeight: 600, marginTop: 8 }}>
                {data.name}
              </span>
              <span style={{ color: "#64748b", fontSize: 24, fontWeight: 500, marginTop: 4 }}>
                {data.sector}
              </span>
            </div>

            {/* Spacer 8px */}
            <div style={{ height: 8 }} />

            {/* ── Price Block with pill background ── */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                display: "flex",
                paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24,
                borderRadius: 16,
                backgroundColor: priceBg,
                alignSelf: "flex-start",
              }}>
                <span style={{ color: changeColor, fontSize: 84, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {data.close !== null ? fmtPrice(data.close) : "--"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                <span style={{ color: changeColor, fontSize: 48, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {data.changePercent !== null ? fmtPercent(data.changePercent) : ""}
                </span>
                {data.change !== null && (
                  <span style={{ color: "#64748b", fontSize: 36, fontWeight: 400, marginLeft: 16 }}>
                    ({data.change >= 0 ? "+" : ""}{fmtPrice(Math.abs(data.change))})
                  </span>
                )}
              </div>
            </div>

            {/* Spacer 16px */}
            <div style={{ height: 16 }} />

            {/* ── Sparkline Hero Card ── */}
            {data.sparkline.length >= 2 && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}>
                {/* Colored top edge */}
                <div style={{ display: "flex", height: 4, backgroundColor: lineColor }} />
                <div style={{ display: "flex", paddingTop: 16, paddingBottom: 16, paddingLeft: 16, paddingRight: 16 }}>
                  <svg width="952" height="300" viewBox="0 0 952 300">
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    <path d={spark.fillPath} fill="url(#sg)" />
                    <path d={spark.linePath} fill="none" stroke={lineColor} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                    {/* Glow ring */}
                    <circle cx={spark.lastX} cy={spark.lastY} r="14" fill={lineColor} opacity="0.12" />
                    {/* Solid dot */}
                    <circle cx={spark.lastX} cy={spark.lastY} r="7" fill={lineColor} />
                    {/* White bullseye */}
                    <circle cx={spark.lastX} cy={spark.lastY} r="3" fill="#ffffff" />
                  </svg>
                </div>
              </div>
            )}
            {data.sparkline.length < 2 && <div style={{ height: 336 }} />}

            {/* Spacer 16px */}
            <div style={{ height: 16 }} />

            {/* ── Indicators Section ── */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Section Header */}
              <div style={{ display: "flex", alignItems: "center", paddingBottom: 12 }}>
                <div style={{ height: 4, width: 36, backgroundColor: "#2563eb", borderRadius: 2 }} />
                <span style={{ color: "#334155", fontSize: 22, fontWeight: 800, marginLeft: 10, letterSpacing: "0.08em" }}>
                  INDIKATOR TEKNIKAL
                </span>
              </div>

              {/* Card with 2-column grid */}
              <div style={{
                display: "flex",
                backgroundColor: "#ffffff",
                borderRadius: 20,
                paddingTop: 4, paddingBottom: 4,
                paddingLeft: 24, paddingRight: 24,
                border: "1px solid #e2e8f0",
              }}>
                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", width: 450 }}>
                  <IndicatorRow label="RSI 14" value={data.rsi14 !== null ? fmtNum(data.rsi14, 1) : "--"} status={rsiLabel(data.rsi14)} statusColor={rsiColor(data.rsi14)} />
                  <IndicatorRow label="SMA" value={data.smaStatus} />
                  <IndicatorRow label="ADX" value={data.adx !== null ? fmtNum(data.adx, 1) : "--"} status={adxLabel(data.adx)} statusColor={data.adx !== null && data.adx > 25 ? "#059669" : "#64748b"} />
                  <IndicatorRow label="BB" value={data.bbUpper !== null && data.bbLower !== null ? `${fmtNum(data.bbLower, 0)}-${fmtNum(data.bbUpper, 0)}` : "--"} />
                  {data.volume !== null && (
                    <IndicatorRow label="Volume" value={fmtVolume(data.volume)} />
                  )}
                </div>
                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", width: 450, marginLeft: 16 }}>
                  <IndicatorRow label="MACD" value={data.macdHist !== null ? (data.macdHist >= 0 ? "Bullish" : "Bearish") : "--"} status={data.macdHist !== null ? (data.macdHist >= 0 ? "Naik" : "Turun") : ""} statusColor={data.macdHist !== null && data.macdHist >= 0 ? "#059669" : "#dc2626"} />
                  <IndicatorRow label="Stoch" value={data.stochK !== null && data.stochD !== null ? `${fmtNum(data.stochK)}/${fmtNum(data.stochD)}` : "--"} status={data.stochK !== null && data.stochK < 20 ? "Oversold" : data.stochK !== null && data.stochK > 80 ? "Overbought" : ""} statusColor={data.stochK !== null && data.stochK < 20 ? "#059669" : data.stochK !== null && data.stochK > 80 ? "#dc2626" : "#64748b"} />
                  <IndicatorRow label="ATR" value={data.atr !== null ? `${fmtNum(data.atr, 0)} (${data.close !== null ? fmtNum((data.atr / data.close) * 100, 1) : ""}%)` : "--"} />
                  <IndicatorRow label="OBV" value={data.obvTrend ?? "--"} statusColor={data.obvTrend === "Accumulation" ? "#059669" : data.obvTrend === "Distribution" ? "#dc2626" : "#64748b"} />
                  <IndicatorRow label="Supertrend" value={data.supertrend !== null ? fmtPrice(data.supertrend) : "--"} statusColor="#64748b" />
                </div>
              </div>
            </div>

            {/* Spacer 16px */}
            <div style={{ height: 16 }} />

            {/* ── Trading Plan Section ── */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Section Header */}
              <div style={{ display: "flex", alignItems: "center", paddingBottom: 12 }}>
                <div style={{ height: 4, width: 36, backgroundColor: "#8b5cf6", borderRadius: 2 }} />
                <span style={{ color: "#334155", fontSize: 22, fontWeight: 800, marginLeft: 10, letterSpacing: "0.08em" }}>
                  TRADING PLAN
                </span>
              </div>

              {/* Card with purple top edge */}
              <div style={{
                display: "flex", flexDirection: "column",
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}>
                {/* Purple top edge */}
                <div style={{ display: "flex", height: 4, backgroundColor: "#8b5cf6" }} />

                <div style={{ display: "flex", flexDirection: "column", paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 }}>
                  {/* Strategy + Confidence */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#0f172a", fontSize: 28, fontWeight: 700 }}>
                      {data.tradingStrategy ?? "--"}
                    </span>
                    <div style={{
                      paddingTop: 6, paddingBottom: 6, paddingLeft: 16, paddingRight: 16,
                      borderRadius: 10,
                      backgroundColor: confidenceBg(data.confidence),
                      color: confidenceColor(data.confidence),
                      fontSize: 20, fontWeight: 700,
                    }}>
                      {confidenceLabel(data.confidence)}
                    </div>
                  </div>

                  {/* Spacer */}
                  <div style={{ height: 20 }} />

                  {/* Grid: Entry / TP1 / SL / R:R */}
                  <div style={{ display: "flex" }}>
                    {/* Entry */}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <span style={{ color: "#64748b", fontSize: 20, fontWeight: 600, letterSpacing: "0.06em" }}>ENTRY</span>
                      <span style={{ color: "#0f172a", fontSize: 36, fontWeight: 800, fontFamily: "monospace", marginTop: 6 }}>
                        {data.entryPrice !== null ? fmtPrice(data.entryPrice) : "--"}
                      </span>
                    </div>
                    {/* TP1 */}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <span style={{ color: "#64748b", fontSize: 20, fontWeight: 600, letterSpacing: "0.06em" }}>TP 1</span>
                      <span style={{ color: "#059669", fontSize: 36, fontWeight: 800, fontFamily: "monospace", marginTop: 6 }}>
                        {data.tp1 !== null ? fmtPrice(data.tp1) : "--"}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: 16, marginTop: 2 }}>{data.tp1Source}</span>
                    </div>
                    {/* SL */}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <span style={{ color: "#64748b", fontSize: 20, fontWeight: 600, letterSpacing: "0.06em" }}>STOP LOSS</span>
                      <span style={{ color: "#dc2626", fontSize: 36, fontWeight: 800, fontFamily: "monospace", marginTop: 6 }}>
                        {data.sl !== null ? fmtPrice(data.sl) : "--"}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: 16, marginTop: 2 }}>{data.slSource}</span>
                    </div>
                    {/* R:R */}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <span style={{ color: "#64748b", fontSize: 20, fontWeight: 600, letterSpacing: "0.06em" }}>R:R</span>
                      <span style={{ color: data.riskReward !== null && data.riskReward >= 2 ? "#059669" : "#d97706", fontSize: 36, fontWeight: 800, fontFamily: "monospace", marginTop: 6 }}>
                        {data.riskReward !== null ? `1:${fmtNum(data.riskReward, 1)}` : "--"}
                      </span>
                    </div>
                  </div>

                  {/* TP2 if available */}
                  {data.tp2 !== null && (
                    <div style={{ display: "flex", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ color: "#64748b", fontSize: 20, fontWeight: 600, letterSpacing: "0.06em", width: 100 }}>TP 2</span>
                      <span style={{ color: "#059669", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>{fmtPrice(data.tp2)}</span>
                    </div>
                  )}

                  {/* Warning */}
                  {data.tradingWarning && (
                    <div style={{ display: "flex", alignItems: "flex-start", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ color: "#d97706", fontSize: 18, fontWeight: 700, marginRight: 8 }}>!</span>
                      <span style={{ color: "#64748b", fontSize: 18, lineHeight: 1.4 }}>{data.tradingWarning}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Flex spacer — pushes footer to bottom of safe zone */}
            <div style={{ flex: 1 }} />

            {/* ── Footer ── */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ height: 2, width: 32, backgroundColor: "#2563eb", borderRadius: 1 }} />
                  <span style={{ color: "#64748b", fontSize: 24, fontWeight: 500, marginLeft: 10 }}>
                    teknikal.id/stocks/{stripJk(data.ticker)}
                  </span>
                </div>
                <span style={{ color: "#94a3b8", fontSize: 18 }}>Data tertunda ~5mnt</span>
              </div>
              <span style={{ color: "#94a3b8", fontSize: 18, marginTop: 6 }}>Bukan rekomendasi investasi. Lakukan riset mandiri.</span>
            </div>

          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[OG stock-story] Failed for ticker:", ticker, error);
    return fallbackImage(ticker);
  }
}
