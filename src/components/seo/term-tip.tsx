import type { ReactNode } from "react";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { TermTipClient } from "./term-tip-client";

/**
 * TermTip — tooltip definisi istilah inline (PRD im-2026-10-29-2 / prd-2026-10-31-02).
 *
 * Server component: lookup GLOSSARY_TERMS di server (import tunggal — DILARANG
 * salinan definisi ke-2, AC1), fail-diam saat istilah tak dikenal (AC4: render
 * children polos, 0 error console — pola fail-closed screener-data). Props kecil
 * (slug/term/definition/fallbackText) diteruskan ke TermTipClient yang membungkus
 * Tooltip UI existing; definisi ikut dikirim agar SSR HTML punya teks (AC5).
 */
export function TermTip({ term, children }: { term: string; children: ReactNode }) {
  const entry = GLOSSARY_TERMS.find((t) => t.slug === term);
  if (!entry) return <>{children}</>;
  return (
    <TermTipClient
      slug={entry.slug}
      term={entry.term}
      definition={entry.definition}
      fallbackText={typeof children === "string" ? children : entry.term}
    />
  );
}
