"use client";

import { useMemo, useState } from "react";

/**
 * Parse output MLX terstruktur (RINGKASAN/INSIGHT/KEY DRIVERS/LEVEL) → React.
 * Fallback: teks polos kalau section tidak ditemukan.
 */

export interface ParsedAi {
  ringkasan: string | null;
  insights: string[];
  drivers: string[];
  level: string | null;
  raw: string;
}

export function parseAiText(raw: string): ParsedAi {
  const clean = raw.replace(/\*\*/g, "").trim();
  const grabSection = (name: string): string | null => {
    const m = clean.match(new RegExp(`${name}\\s*\\n+([\\s\\S]*?)(?=\\n\\s*(?:INSIGHT|KEY DRIVERS|LEVEL)\\s*\\n|$)`, "i"));
    return m ? m[1].trim() : null;
  };
  const bulletList = (s: string | null): string[] =>
    (s ?? "")
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

  return {
    ringkasan: grabSection("RINGKASAN"),
    insights: bulletList(grabSection("INSIGHT")),
    drivers: bulletList(grabSection("KEY DRIVERS")),
    level: grabSection("LEVEL")?.split("\n")[0] ?? null,
    raw: clean,
  };
}

/** Bagikan ringkasan — Web Share API, fallback copy-to-clipboard + dialog native share teks. */
export async function shareAiStock(name: string, ticker: string, parsed: ParsedAi): Promise<"shared" | "copied" | "failed"> {
  const lines = [
    `✨ Analisa AI — ${name} (${ticker})`,
    "",
    parsed.ringkasan ?? "",
    "",
    "INSIGHT:",
    ...parsed.insights.map((i) => `• ${i}`),
    "",
    "KEY DRIVERS:",
    ...parsed.drivers.map((d) => `• ${d}`),
    parsed.level ? `\n${parsed.level}` : "",
    "",
    "— teknikal.id · data teknikal, bukan rekomendasi beli",
  ].filter((l) => l !== "" || true);
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: `Analisa AI ${name}`, text });
      return "shared";
    }
  } catch {
    // user cancel / error → fallback copy
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
