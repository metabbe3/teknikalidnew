import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") || "TeknikalID";
  const ticker = searchParams.get("ticker");
  const type = searchParams.get("type") || "berita";

  const typeLabel = type === "akademi" ? "Akademi" : type === "stock" ? "Analisis Saham" : "Berita Pasar";
  const fontSize = title.length > 60 ? 36 : title.length > 40 ? 42 : 48;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 60,
          backgroundColor: "#0f172a",
        }}
      >
        {/* Top section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              T
            </div>
            <span style={{ color: "#94a3b8", fontSize: 20, fontWeight: 600 }}>TeknikalID</span>
          </div>
          <span style={{ color: "#64748b", fontSize: 16 }}>{typeLabel}</span>
        </div>

        {/* Middle section: ticker + title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {ticker && (
            <div
              style={{
                display: "flex",
                padding: "6px 16px",
                borderRadius: 8,
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "monospace",
                alignSelf: "flex-start",
              }}
            >
              {ticker}
            </div>
          )}
          <div
            style={{
              color: "white",
              fontSize,
              fontWeight: 700,
              lineHeight: 1.2,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom section */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ height: 2, width: 60, backgroundColor: "#3b82f6", borderRadius: 1 }} />
          <span style={{ color: "#64748b", fontSize: 14 }}>teknikalid.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
