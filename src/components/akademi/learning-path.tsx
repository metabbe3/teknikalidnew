"use client";

/**
 * Roadmap belajar 3 tingkat + progress bar (owner 24 Okt: pemula harus tahu
 * "mulai dari mana" dalam 3 detik). Progress = localStorage "✓ Selesai" per artikel.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEARNING_TRACKS } from "@/lib/akademi/learning-path";
import { GraduationCap, ChevronRight, Check } from "lucide-react";

const DONE_KEY = "akademi-done";

export function readDone(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function LearningPath() {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(readDone()), []);

  const toggle = (slug: string) => {
    const next = done.includes(slug) ? done.filter((s) => s !== slug) : [...done, slug];
    setDone(next);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(next));
    } catch {
      /* storage penuh — abaikan */
    }
  };

  const totalSteps = LEARNING_TRACKS.reduce((n, t) => n + t.steps.length, 0);
  const totalDone = LEARNING_TRACKS.reduce(
    (n, t) => n + t.steps.filter((s) => done.includes(s.slug)).length,
    0
  );
  const pct = Math.round((totalDone / totalSteps) * 100);

  return (
    <section className="mb-12" aria-label="Jalur belajar">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Jalur Belajar</h2>
          <p className="text-sm text-text-tertiary">Mulai dari sini — naik tingkat pelan-pelan</p>
        </div>
      </div>

      {/* Progress global */}
      <div className="mb-6 p-4 rounded-xl bg-bg-card border border-border depth-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-text-secondary">
            Progres kamu: <span className="font-bold text-text-primary">{totalDone}/{totalSteps} materi</span>
          </p>
          <span className="text-sm font-bold text-accent tabular-nums">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-bg-primary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {totalDone >= 1 && (
        <Link
          href="/portfolio"
          data-engagement="funnel_akademi_portfolio"
          className="mb-6 flex items-center justify-between gap-3 p-4 rounded-xl bg-accent/[0.07] border border-accent/25 hover:border-accent/50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary">Sudah {totalDone} materi selesai — langkah berikutnya?</p>
            <p className="text-xs text-text-tertiary mt-0.5">Simulasikan portofolio pertamamu di Portfolio Tracker.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-accent shrink-0" />
        </Link>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {LEARNING_TRACKS.map((track, ti) => {
          const trackDone = track.steps.filter((s) => done.includes(s.slug)).length;
          return (
            <div key={track.id} className="bg-bg-card rounded-xl border border-border depth-shadow p-5 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Tingkat {ti + 1}</p>
                <p className="text-[10px] font-medium text-text-tertiary tabular-nums">{trackDone}/{track.steps.length}</p>
              </div>
              <h3 className="font-bold text-text-primary">{track.label}</h3>
              <p className="text-xs text-text-tertiary mt-0.5 mb-4 leading-relaxed">{track.description}</p>

              <ol className="space-y-1.5 flex-1">
                {track.steps.map((step, si) => {
                  const isDone = done.includes(step.slug);
                  return (
                    <li key={step.slug} className="flex items-start gap-2 group">
                      <button
                        onClick={() => toggle(step.slug)}
                        aria-label={isDone ? `Tandai ${step.title} belum selesai` : `Tandai ${step.title} selesai`}
                        className={`mt-0.5 flex items-center justify-center w-[18px] h-[18px] rounded-full border text-[10px] font-bold shrink-0 transition-colors ${
                          isDone ? "bg-bullish border-bullish text-white" : "border-border text-text-tertiary hover:border-accent"
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3" /> : si + 1}
                      </button>
                      <Link
                        href={`/akademi/${step.slug}`}
                        className={`text-[13px] leading-tight hover:text-accent transition-colors ${
                          isDone ? "text-text-tertiary line-through" : "text-text-secondary"
                        }`}
                      >
                        {step.title}
                      </Link>
                    </li>
                  );
                })}
              </ol>

              {ti < LEARNING_TRACKS.length - 1 && (
                <div className="hidden md:flex items-center justify-center gap-1 mt-4 pt-3 border-t border-border/60 text-[10px] text-text-tertiary">
                  lanjut ke {LEARNING_TRACKS[ti + 1].label} <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
