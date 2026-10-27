"use client";

import { useEffect, useState } from "react";

/**
 * DailyBriefStrip — "Pasar dalam 1 kalimat" + chips Q&A pseudo-interaktif (owner 27 Okt).
 * Data: /api/brief/daily (file JSON harian, angka dari market API satu pintu — bukan LLM).
 * Chips = jawaban pre-generated; klik = expand instan (0 panggilan runtime).
 * 204 / error → render null (fallback diam, homepage tetap normal).
 */

interface Chip {
  q: string;
  a: string;
}
interface Brief {
  oneLiner: string;
  chips: Chip[];
  generatedWib: string;
}

export function DailyBriefStrip() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/brief/daily")
      .then((r) => (r.status === 204 ? null : r.json()))
      .then((d) => {
        if (alive && d?.oneLiner) setBrief(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!brief) return null;

  return (
    <section
      aria-label="Ringkasan pasar hari ini"
      className="rounded-xl border border-border bg-bg-card px-4 py-3"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
          Pasar Hari Ini
        </span>
        <span className="text-sm font-medium text-text-primary">{brief.oneLiner}</span>
      </div>
      {brief.chips?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {brief.chips.map((c, i) => (
            <span key={i} className="inline-flex flex-col">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-sky-400 hover:text-text-primary active:scale-[0.98]"
                aria-expanded={open === i}
              >
                {c.q}
              </button>
              {open === i && (
                <span className="mt-1.5 block rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-text-secondary">
                  {c.a}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
