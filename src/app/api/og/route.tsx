import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// --- Type badge colors ---

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  berita: { bg: "rgba(59,130,246,0.20)", text: "#60a5fa" },
  akademi: { bg: "rgba(168,85,247,0.20)", text: "#c084fc" },
  community: { bg: "rgba(13,148,136,0.20)", text: "#2dd4bf" },
  stocks: { bg: "rgba(245,158,11,0.20)", text: "#fbbf24" },
  default: { bg: "rgba(255,255,255,0.08)", text: "#94a3b8" },
};

function getTypeStyle(type: string) {
  return TYPE_STYLES[type.toLowerCase()] ?? TYPE_STYLES.default;
}

// --- Word-wrap helper for long titles ---

function wrapTitle(title: string, maxCharsPerLine: number): string[] {
  if (title.length <= maxCharsPerLine) return [title];

  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  return lines.slice(0, 4); // max 4 lines
}

// --- Route handler ---

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "teknikal.id";
  const type = searchParams.get("type") || "";

  const typeStyle = getTypeStyle(type);
  const typeLabel = type
    ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    : "";

  const titleLines = wrapTitle(title, 48);
  // Scale font size based on number of lines
  const titleFontSize = titleLines.length >= 3 ? 36 : titleLines.length === 2 ? 44 : 56;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0A111B",
          padding: 48,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              T
            </div>
            <span style={{ color: "#94a3b8", fontSize: 18, fontWeight: 600 }}>
              TeknikalID
            </span>
          </div>
          {typeLabel && (
            <span
              style={{
                padding: "4px 16px",
                borderRadius: 6,
                backgroundColor: typeStyle.bg,
                color: typeStyle.text,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {typeLabel}
            </span>
          )}
        </div>

        {/* Title block — centered vertically */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, justifyContent: "center" }}>
          {titleLines.map((line, i) => (
            <span
              key={i}
              style={{
                color: "white",
                fontSize: titleFontSize,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {line}
            </span>
          ))}
        </div>

        {/* Footer row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ height: 2, width: 40, backgroundColor: "#3b82f6", borderRadius: 1 }} />
            <span style={{ color: "#64748b", fontSize: 13 }}>teknikal.id</span>
          </div>
          <span style={{ color: "#475569", fontSize: 11 }}>Analisis Teknikal Saham Indonesia</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
