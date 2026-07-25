"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import html2canvas from "html2canvas-pro";

/**
 * TeknikalID Social Card Generator v3
 * ─────────────────────────────────────
 * Features:
 *  - Upload custom image
 *  - Edit headline, summary, date, source
 *  - Color picker for gradient + font colors
 *  - Save/load custom color presets (localStorage)
 *  - Generate PNG (1440×2560)
 */

// ── Types ──
interface CardData {
  imageUrl: string;
  headline: string;
  summary: string;
  source: string;
  date: string;
  url: string;
  colorStart: string;
  colorMid: string;
  colorEnd: string;
  fontHeadline: string;
  fontSummary: string;
  fontBadge: string;
  fontDate: string;
}

interface ColorPreset {
  name: string;
  colorStart: string;
  colorMid: string;
  colorEnd: string;
  fontHeadline: string;
  fontSummary: string;
  fontBadge: string;
  fontDate: string;
}

const DEFAULT_CARD: CardData = {
  imageUrl: "",
  headline: "",
  summary: "",
  source: "TEKNIKAL.ID",
  date: "",
  url: "teknikal.id",
  colorStart: "#5B21B6",
  colorMid: "#4338CA",
  colorEnd: "#1E3A8A",
  fontHeadline: "#FFFFFF",
  fontSummary: "rgba(255,255,255,0.72)",
  fontBadge: "#FFFFFF",
  fontDate: "rgba(255,255,255,0.72)",
};

const BUILTIN_PRESETS: ColorPreset[] = [
  { name: "Purple Blue", colorStart: "#5B21B6", colorMid: "#4338CA", colorEnd: "#1E3A8A", fontHeadline: "#FFFFFF", fontSummary: "rgba(255,255,255,0.72)", fontBadge: "#FFFFFF", fontDate: "rgba(255,255,255,0.72)" },
  { name: "Ocean Teal", colorStart: "#0F766E", colorMid: "#0E7490", colorEnd: "#164E63", fontHeadline: "#FFFFFF", fontSummary: "rgba(255,255,255,0.72)", fontBadge: "#FFFFFF", fontDate: "rgba(255,255,255,0.72)" },
  { name: "Sunset", colorStart: "#DC2626", colorMid: "#EA580C", colorEnd: "#9A3412", fontHeadline: "#FFFFFF", fontSummary: "rgba(255,255,255,0.72)", fontBadge: "#FFFFFF", fontDate: "rgba(255,255,255,0.72)" },
  { name: "Dark Noir", colorStart: "#18181B", colorMid: "#1F2937", colorEnd: "#111827", fontHeadline: "#FFFFFF", fontSummary: "rgba(255,255,255,0.72)", fontBadge: "#FFFFFF", fontDate: "rgba(255,255,255,0.72)" },
  { name: "Royal Gold", colorStart: "#7C2D12", colorMid: "#92400E", colorEnd: "#78350F", fontHeadline: "#FCD34D", fontSummary: "rgba(252,211,77,0.72)", fontBadge: "#FCD34D", fontDate: "rgba(252,211,77,0.72)" },
  { name: "Cyber Neon", colorStart: "#4C1D95", colorMid: "#6D28D9", colorEnd: "#312E81", fontHeadline: "#A5F3FC", fontSummary: "rgba(165,243,252,0.72)", fontBadge: "#A5F3FC", fontDate: "rgba(165,243,252,0.72)" },
  { name: "White Clean", colorStart: "#FFFFFF", colorMid: "#F3F4F6", colorEnd: "#E5E7EB", fontHeadline: "#111827", fontSummary: "rgba(17,24,39,0.72)", fontBadge: "#111827", fontDate: "rgba(17,24,39,0.72)" },
  { name: "Emerald", colorStart: "#065F46", colorMid: "#047857", colorEnd: "#064E3B", fontHeadline: "#FFFFFF", fontSummary: "rgba(255,255,255,0.72)", fontBadge: "#6EE7B7", fontDate: "rgba(255,255,255,0.72)" },
];

const STORAGE_KEY = "teknikalid-social-card-presets";

function loadCustomPresets(): ColorPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: ColorPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// ── Card Component ──
function SocialCardInner({ data }: { data: CardData }) {
  const hasImage = data.imageUrl && data.imageUrl.length > 0;

  return (
    <div
      style={{
        width: 1440,
        height: 2560,
        background: "#1E1B4B",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Photo top 45% */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 1173,
          overflow: "hidden",
          background: "#0F0A2A",
        }}
      >
        {hasImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              crossOrigin="anonymous"
            />
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.08)",
            }} />
          </>
        )}
        {!hasImage && (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${data.colorStart}, ${data.colorEnd})`,
          }}>
            <span style={{ fontSize: 120, opacity: 0.2 }}>📷</span>
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", top: 866, left: 0, right: 0, height: 533,
        background: `linear-gradient(to bottom, rgba(30,27,75,0) 0%, ${data.colorStart} 100%)`,
      }} />

      {/* Card */}
      <div style={{
        position: "absolute", top: 1173, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(180deg, ${data.colorStart} 0%, ${data.colorMid} 35%, ${data.colorEnd} 100%)`,
        padding: "67px 80px 107px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Badge + date */}
        <div style={{ display: "flex", alignItems: "center", gap: 27, marginBottom: 37 }}>
          <div style={{
            background: "rgba(255,255,255,0.15)",
            padding: "19px 37px", borderRadius: 11,
            fontSize: 27, fontWeight: 800, color: data.fontBadge,
            letterSpacing: 2.5,
            border: "1px solid rgba(255,255,255,0.2)",
          }}>
            {data.source}
          </div>
          <div style={{
            fontSize: 27, fontWeight: 700, color: data.fontDate,
            letterSpacing: 1.5,
          }}>
            {data.date}
          </div>
        </div>

        {/* Accent line */}
        <div style={{
          width: 93, height: 5, borderRadius: 3,
          background: "linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.15))",
          marginBottom: 40,
        }} />

        {/* Headline */}
        <div style={{
          fontSize: 69, fontWeight: 900, color: data.fontHeadline,
          lineHeight: 1.18, marginBottom: 32, letterSpacing: -0.5,
          textAlign: "center",
        }}>
          {data.headline}
        </div>

        {/* Summary */}
        <div style={{
          fontSize: 32, fontWeight: 500, color: data.fontSummary,
          lineHeight: 1.55,
          textAlign: "center",
        }}>
          {data.summary}
        </div>

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 27,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: 29, fontWeight: 700, color: data.fontHeadline }}>
            Selengkapnya ↗
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: data.fontSummary }}>
            {data.url}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function SocialCardGenerator({
  articles,
}: {
  articles: { id: string; title: string; excerpt: string; slug: string; publishedAt: string }[];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cardData, setCardData] = useState<CardData>({ ...DEFAULT_CARD });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<ColorPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Load custom presets from localStorage on mount
  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const months = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const toHook = (title: string): string => {
    if (title.includes("!") || title.includes("?")) return title.toUpperCase();
    return `${title.toUpperCase()} — YANG TERJADI DI BALIK LAYAR!`;
  };

  const selectArticle = (article: typeof articles[0]) => {
    setCardData((d) => ({
      ...d,
      headline: toHook(article.title),
      summary: article.excerpt.replace(/\*\*/g, "").slice(0, 350) + "...",
      date: formatDate(article.publishedAt),
    }));
    setPreview(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCardData((d) => ({ ...d, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const update = (key: keyof CardData, value: string) =>
    setCardData((d) => ({ ...d, [key]: value }));

  const applyPreset = (preset: ColorPreset) => {
    setCardData((d) => ({
      ...d,
      colorStart: preset.colorStart,
      colorMid: preset.colorMid,
      colorEnd: preset.colorEnd,
      fontHeadline: preset.fontHeadline,
      fontSummary: preset.fontSummary,
      fontBadge: preset.fontBadge,
      fontDate: preset.fontDate,
    }));
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: ColorPreset = {
      name: presetName.trim(),
      colorStart: cardData.colorStart,
      colorMid: cardData.colorMid,
      colorEnd: cardData.colorEnd,
      fontHeadline: cardData.fontHeadline,
      fontSummary: cardData.fontSummary,
      fontBadge: cardData.fontBadge,
      fontDate: cardData.fontDate,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setPresetName("");
    setShowSavePreset(false);
  };

  const handleDeletePreset = (name: string) => {
    const updated = customPresets.filter((p) => p.name !== name);
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  const handleGeneratePNG = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1, useCORS: true, allowTaint: false,
        width: 1440, height: 2560, backgroundColor: "#1E1B4B",
      });
      setPreview(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Generate failed:", err);
    } finally {
      setGenerating(false);
    }
  }, []);

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
  };

  // Helper: convert rgba string to hex for color input
  const toHex = (c: string) => {
    if (c.startsWith("#")) return c.slice(0, 7);
    const m = c.match(/[\d.]+/g);
    if (!m || m.length < 3) return "#ffffff";
    const r = Math.round(Number(m[0])).toString(16).padStart(2, "0");
    const g = Math.round(Number(m[1])).toString(16).padStart(2, "0");
    const b = Math.round(Number(m[2])).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">📱 Social Media Cards</h2>

      {/* ── Article Selector ── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">📰 Pilih Berita</label>
        <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => selectArticle(article)}
              className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                cardData.headline === toHook(article.title)
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:bg-gray-700/50"
              }`}
            >
              <div className="font-semibold text-white line-clamp-1">{article.title}</div>
              <div className="text-gray-400 text-xs mt-1">{formatDate(article.publishedAt)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Image Upload ── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">🖼️ Upload Gambar</label>
        <div className="flex gap-3">
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 transition">📁 Pilih File</button>
          {cardData.imageUrl && (
            <button onClick={() => update("imageUrl", "")} className="px-3 py-2 text-red-400 text-sm hover:text-red-300">✕ Hapus</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        {cardData.imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border border-gray-700 max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardData.imageUrl} alt="Preview" className="w-full" />
          </div>
        )}
      </div>

      {/* ── Edit Text ── */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">📌 Headline</label>
          <textarea value={cardData.headline} onChange={(e) => update("headline", e.target.value)} rows={3} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">📝 Summary</label>
          <textarea value={cardData.summary} onChange={(e) => update("summary", e.target.value)} rows={4} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">📅 Tanggal</label>
            <input value={cardData.date} onChange={(e) => update("date", e.target.value)} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">🏷️ Source</label>
            <input value={cardData.source} onChange={(e) => update("source", e.target.value)} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
          </div>
        </div>
      </div>

      {/* ── Color Presets ── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">🎨 Color Presets</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {BUILTIN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 hover:border-white/30 transition"
              style={{ background: `linear-gradient(135deg, ${preset.colorStart}, ${preset.colorEnd})`, color: preset.fontHeadline }}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {/* Custom saved presets */}
        {customPresets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs text-gray-500 w-full">💾 Saved:</span>
            {customPresets.map((preset) => (
              <div key={preset.name} className="flex items-center gap-1">
                <button
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-700/50 hover:border-yellow-500/50 transition"
                  style={{ background: `linear-gradient(135deg, ${preset.colorStart}, ${preset.colorEnd})`, color: preset.fontHeadline }}
                >
                  {preset.name}
                </button>
                <button onClick={() => handleDeletePreset(preset.name)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
        {/* Save preset button */}
        {!showSavePreset ? (
          <button onClick={() => setShowSavePreset(true)} className="text-xs text-blue-400 hover:text-blue-300">+ Save current as preset</button>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs w-40"
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
            />
            <button onClick={handleSavePreset} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Save</button>
            <button onClick={() => setShowSavePreset(false)} className="text-gray-400 text-xs hover:text-gray-300">Cancel</button>
          </div>
        )}
      </div>

      {/* ── Gradient Colors ── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">🌈 Background Gradient</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Atas</label>
            <input type="color" value={cardData.colorStart} onChange={(e) => update("colorStart", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tengah</label>
            <input type="color" value={cardData.colorMid} onChange={(e) => update("colorMid", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Bawah</label>
            <input type="color" value={cardData.colorEnd} onChange={(e) => update("colorEnd", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
        </div>
      </div>

      {/* ── Font Colors ── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">✏️ Font Colors</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Headline</label>
            <input type="color" value={toHex(cardData.fontHeadline)} onChange={(e) => update("fontHeadline", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Summary</label>
            <input type="color" value={toHex(cardData.fontSummary)} onChange={(e) => update("fontSummary", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Badge (Source)</label>
            <input type="color" value={toHex(cardData.fontBadge)} onChange={(e) => update("fontBadge", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Date</label>
            <input type="color" value={toHex(cardData.fontDate)} onChange={(e) => update("fontDate", e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" />
          </div>
        </div>
      </div>

      {/* ── Generate ── */}
      <button
        onClick={handleGeneratePNG}
        disabled={generating || !cardData.headline}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition"
      >
        {generating ? "⏳ Rendering..." : "🎴 Generate PNG"}
      </button>

      {/* ── Preview ── */}
      {preview && (
        <div className="space-y-3">
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="PNG preview" className="w-full" />
          </div>
          <button onClick={() => downloadFile(preview, "teknikalid-social-card.png")} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition">
            ⬇️ Download PNG (1440×2560)
          </button>
        </div>
      )}

      {/* ── Offscreen card ── */}
      {cardData.headline && (
        <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}>
          <div ref={cardRef}>
            <SocialCardInner data={cardData} />
          </div>
        </div>
      )}
    </div>
  );
}
