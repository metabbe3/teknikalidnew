"use client";

import { useEffect, useState } from "react";

/**
 * DailyBriefStrip v2 — "Pasar dalam 1 kalimat" + chips Q&A (owner 27 Okt).
 * Redesign: eyebrow standalone + oneLiner besar + chips akordion full-width
 * dengan state aktif & jawaban terhubung (audit visual 27 Okt malam).
 * Data: /api/brief/daily (file JSON harian, angka dari market API satu pintu — bukan LLM).
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

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <section
      aria-label="Ringkasan pasar hari ini"
      className="rounded-xl border border-border bg-bg-card px-4 py-4"
    >
      {/* Eyebrow row */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          Pasar Hari Ini
        </span>
        <span className="text-[10px] font-mono text-text-tertiary">{dateLabel}</span>
      </div>

      {/* One-liner — hero kalimat */}
      <p className="mt-2 text-[15px] font-semibold leading-snug text-text-primary">
        {brief.oneLiner}
      </p>

      {/* Chips — akordion vertikal */}
      {brief.chips?.length > 0 && (
        <div className="mt-3.5 space-y-1.5">
          {brief.chips.map((c, i) => {
            const active = open === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(active ? null : i)}
                  aria-expanded={active}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-all active:scale-[0.99] ${
                    active
                      ? "border-accent/50 bg-sky-50 font-semibold text-accent"
                      : "border-border bg-bg-primary text-text-secondary hover:border-accent/30 hover:text-text-primary"
                  }`}
                >
                  {c.q}
                  <svg
                    aria-hidden
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className={`shrink-0 transition-transform duration-200 ${active ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {active && (
                  <p className="mt-1.5 rounded-lg border border-l-2 border-border border-l-accent bg-bg-primary px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
                    {c.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
