import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { stripJk } from "@/lib/utils";
import QRCode from "qrcode";
import fs from "fs/promises";

export const runtime = "nodejs";

// --- Helpers ---

function fmtPrice(v: number): string {
  return "Rp" + Math.round(v).toLocaleString("en-US");
}

function fmtPercent(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

/** Badge sinyal — light theme (kartu putih-biru muda). */
function signalBadge(label: string | null) {
  switch (label) {
    case "Strong Bullish":
      return { bg: "rgba(5,150,105,0.10)", text: "#047857", label: "Strong Bullish", dot: "#059669" };
    case "Bullish":
      return { bg: "rgba(2,132,199,0.10)", text: "#0369a1", label: "Bullish", dot: "#0ea5e9" };
    case "Bearish":
      return { bg: "rgba(220,38,38,0.08)", text: "#b91c1c", label: "Bearish", dot: "#ef4444" };
    case "Strong Bearish":
      return { bg: "rgba(185,28,28,0.10)", text: "#991b1b", label: "Strong Bearish", dot: "#dc2626" };
    default:
      return { bg: "rgba(100,116,139,0.10)", text: "#475569", label: "Netral", dot: "#94a3b8" };
  }
}

/** QR data-URL — fallback null jika gagal. */
async function qrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 0,
      width: 480,
      color: { dark: "#0f172aff", light: "#ffffffff" },
    });
  } catch {
    return null;
  }
}

// --- Fallback image (light theme) ---

function fallbackImage(ticker: string) {
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
        <div style={{ display: "flex", width: 1080, height: 12, backgroundImage: "linear-gradient(90deg, #0ea5e9, #38bdf8, #818cf8, #38bdf8, #0ea5e9)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: 1080, height: 1908 }}>
          <span style={{ color: "#0f172a", fontSize: 110, fontWeight: 800, fontFamily: "monospace" }}>
            {stripJk(ticker)}
          </span>
          <span style={{ color: "#0284c7", fontSize: 34, fontWeight: 700, marginTop: 24 }}>teknikal.id</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}

// --- Main route handler ---

// Live quote overlay — harga story harus segar saat share (owner 26 Okt: "harga tidak update
// harga latest di kita"). Sumber sama dengan LivePrice (/api/live-quotes → TradingView+Yahoo,
// TTL memory 60s). Bila quote gagal/stale, harga EOD DB tetap dipakai (graceful).
async function freshQuote(ticker: string): Promise<{ close: number | null; change: number | null; changePercent: number | null } | null> {
  try {
    const { fetchQuotesBatch } = await import("@/lib/yahoo-finance");
    const rows = await fetchQuotesBatch([ticker]);
    const q = rows[0]?.quote;
    if (!q || q.regularMarketPrice == null) return null;
    return {
      close: q.regularMarketPrice,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return new Response("Missing ticker", { status: 400 });
  }

  try {
    const data = await stockMarketService.getStockOgData(ticker);

    // Overlay harga live (bila tersedia & lebih segar dari EOD)
    const quote = await freshQuote(ticker);
    if (quote && quote.close !== null) {
      data.close = quote.close;
      data.change = quote.change;
      data.changePercent = quote.changePercent;
    }

    const [qr, emitLogo, logoB64] = await Promise.all([
      qrDataUrl(`https://teknikal.id/stocks/${stripJk(data.ticker)}`),
      (async () => {
        if (!data.logoFile) return null;
        try {
          const buf = await fs.readFile(`public${data.logoFile}`);
          const mime = data.logoFile.endsWith(".svg")
            ? "image/svg+xml"
            : data.logoFile.endsWith(".jpg")
              ? "image/jpeg"
              : "image/png";
          return `data:${mime};base64,${buf.toString("base64")}`;
        } catch {
          return null;
        }
      })(),
      fs.readFile("public/logo.png").then((b) => b.toString("base64")).catch(() => null),
    ]);

    const isPositive = data.change !== null && data.change >= 0;
    const changeColor = isPositive ? "#059669" : "#dc2626";
    const sig = signalBadge(data.signalLabel);

    return new ImageResponse(
      (
        <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", backgroundColor: "#f8fafc", backgroundImage: "linear-gradient(170deg, #eff6ff 0%, #f8fafc 45%, #ffffff 100%)" }}>
          {/* === Top Accent Bar — biru muda brand === */}
          <div style={{ display: "flex", width: 1080, height: 12, backgroundImage: "linear-gradient(90deg, #0ea5e9, #38bdf8, #818cf8, #38bdf8, #0ea5e9)" }} />

          {/* === Ambient glow biru muda === */}
          <svg width="1080" height="1908" viewBox="0 0 1080 1908" style={{ position: "absolute", top: 12, left: 0 }}>
            <defs>
              <radialGradient id="glow" cx="50%" cy="22%" r="42%">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="hglow" cx="50%" cy="62%" r="46%">
                <stop offset="0%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity="0.16" />
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1080" height="1908" fill="url(#glow)" />
            <rect width="1080" height="1908" fill="url(#hglow)" />
            {/* Ikon arah besar transparan di belakang harga (polygon path — satori tanpa <text>) */}
            {isPositive ? (
              <path d="M540 880 L770 1160 L610 1160 L610 1330 L470 1330 L470 1160 L310 1160 Z" fill="#10b981" fillOpacity="0.06" />
            ) : (
              <path d="M540 1330 L310 1050 L470 1050 L470 880 L610 880 L610 1050 L770 1050 Z" fill="#ef4444" fillOpacity="0.06" />
            )}
          </svg>

          {/* === Safe Zone === */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "stretch",
            paddingTop: 140, paddingBottom: 200, paddingLeft: 64, paddingRight: 64,
            width: 1080, height: 1920,
          }}>

            {/* ── Brand header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, backgroundImage: "linear-gradient(135deg, #0ea5e9, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(14,165,233,0.30)" }}>
                  {logoB64 && <img src={`data:image/png;base64,${logoB64}`} width={44} height={44} style={{ borderRadius: 10 }} alt="" />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
                  <span style={{ color: "#0f172a", fontSize: 34, fontWeight: 800, letterSpacing: "-0.01em" }}>
                    teknikal<span style={{ color: "#0284c7" }}>.id</span>
                  </span>
                  <span style={{ color: "#64748b", fontSize: 20, fontWeight: 600, marginTop: 2 }}>Analisa Saham IDX</span>
                </div>
              </div>
              <span style={{ color: "#94a3b8", fontSize: 22, fontWeight: 700, letterSpacing: "0.14em" }}>SNAPSHOT</span>
            </div>

            {/* ── Spacer ── */}
            <div style={{ display: "flex", flex: 1 }} />

            {/* ── Stock hero: logo + ticker + nama ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {emitLogo && (
                <div style={{ width: 200, height: 200, borderRadius: 44, backgroundColor: "#ffffff", border: "3px solid #e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 48px rgba(2,132,199,0.14)" }}>
                  <img src={emitLogo} width={140} height={140} style={{ objectFit: "contain" }} alt="" />
                </div>
              )}
              <span style={{ color: "#0f172a", fontSize: 150, fontWeight: 800, fontFamily: "monospace", lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: emitLogo ? 40 : 0 }}>
                {stripJk(data.ticker)}
              </span>
              <span style={{ color: "#334155", fontSize: 38, fontWeight: 700, marginTop: 14, textAlign: "center" }}>
                {data.name}
              </span>
              <span style={{ color: "#64748b", fontSize: 28, fontWeight: 500, marginTop: 8 }}>
                {data.sector}
              </span>

              {/* ── Sinyal badge ── */}
              <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
                <div style={{
                  display: "flex", alignItems: "center",
                  paddingTop: 14, paddingBottom: 14, paddingLeft: 30, paddingRight: 30,
                  borderRadius: 999,
                  backgroundColor: sig.bg,
                  border: "2px solid rgba(14,165,233,0.22)",
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: sig.dot, marginRight: 14 }} />
                  <span style={{ color: sig.text, fontSize: 30, fontWeight: 800 }}>{sig.label}</span>
                </div>
                {data.isGorengan && (
                  <div style={{
                    display: "flex", alignItems: "center",
                    paddingTop: 12, paddingBottom: 12, paddingLeft: 22, paddingRight: 22,
                    borderRadius: 999,
                    backgroundColor: "rgba(217,119,6,0.10)",
                    border: "2px solid rgba(217,119,6,0.25)",
                    marginLeft: 16,
                  }}>
                    <span style={{ color: "#b45309", fontSize: 26, fontWeight: 800 }}>Gorengan</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Spacer ── */}
            <div style={{ display: "flex", flex: 1 }} />

            {/* ── Harga — HERO gradient besar ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 190, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.0, backgroundImage: `linear-gradient(180deg, ${isPositive ? "#047857 0%, #10b981 78%" : "#b91c1c 0%, #ef4444 78%"})`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" }}>
                {data.close !== null ? fmtPrice(data.close) : "--"}
              </span>
              <div style={{ display: "flex", alignItems: "center", marginTop: 18 }}>
                <span style={{ display: "flex", alignItems: "center", paddingTop: 10, paddingBottom: 10, paddingLeft: 24, paddingRight: 24, borderRadius: 999, backgroundColor: isPositive ? "rgba(5,150,105,0.10)" : "rgba(220,38,38,0.08)", color: changeColor, fontSize: 46, fontWeight: 800, letterSpacing: "-0.02em" }}>
                  <span style={{ fontSize: 34, marginRight: 12 }}>{isPositive ? "▲" : "▼"}</span>
                  {data.changePercent !== null ? fmtPercent(data.changePercent) : ""}
                  {data.change !== null && (
                    <span style={{ fontSize: 30, fontWeight: 600, marginLeft: 12, color: "#64748b" }}>
                      {data.change >= 0 ? "+" : ""}{fmtPrice(Math.abs(data.change))}
                    </span>
                  )}
                </span>
              </div>
              {/* Stamp tanggal — momen */}
              <div style={{ display: "flex", alignItems: "center", marginTop: 26, paddingTop: 10, paddingBottom: 10, paddingLeft: 22, paddingRight: 22, borderRadius: 12, border: "2px dashed #bae6fd", backgroundColor: "rgba(224,242,254,0.5)" }}>
                <span style={{ color: "#0369a1", fontSize: 24, fontWeight: 700, letterSpacing: "0.06em" }}>
                  SNAPSHOT {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
                </span>
              </div>
            </div>

            {/* ── Spacer ── */}
            <div style={{ display: "flex", flex: 1 }} />

            {/* ── Teaser: alasan ke web (BUKAN datanya) ── */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              paddingTop: 36, paddingBottom: 36, paddingLeft: 40, paddingRight: 40,
              borderRadius: 28,
              backgroundColor: "rgba(255,255,255,0.85)",
              border: "2px solid #e0f2fe",
            }}>
              <span style={{ color: "#0f172a", fontSize: 30, fontWeight: 700, textAlign: "center" }}>
                Chart live · 9 indikator teknikal · Trading plan otomatis
              </span>
              <span style={{ color: "#0284c7", fontSize: 30, fontWeight: 800, marginTop: 10 }}>
                Semua gratis di teknikal.id — tanpa login
              </span>
            </div>

            {/* ── Spacer ── */}
            <div style={{ display: "flex", height: 44 }} />

            {/* ── Footer: QR CTA ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingTop: 36, paddingBottom: 36, paddingLeft: 44, paddingRight: 44,
              borderRadius: 32,
              backgroundColor: "#ffffff",
              border: "2px solid #e0f2fe",
              boxShadow: "0 20px 60px rgba(2,132,199,0.12)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 28 }}>
                <span style={{ color: "#0f172a", fontSize: 40, fontWeight: 800 }}>
                  Lihat analisa lengkap
                </span>
                <span style={{ color: "#0284c7", fontSize: 32, fontWeight: 700, marginTop: 10, fontFamily: "monospace" }}>
                  teknikal.id/stocks/{stripJk(data.ticker)}
                </span>
                <span style={{ color: "#94a3b8", fontSize: 20, marginTop: 14 }}>Bukan rekomendasi investasi · Data tertunda ~5 mnt</span>
              </div>
              {qr && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ backgroundColor: "#ffffff", borderRadius: 20, padding: 12, display: "flex", border: "2px solid #e0f2fe" }}>
                    <img src={qr} width={172} height={172} alt="" />
                  </div>
                  <span style={{ color: "#0284c7", fontSize: 20, fontWeight: 800, marginTop: 10, letterSpacing: "0.12em" }}>SCAN ME</span>
                </div>
              )}
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
