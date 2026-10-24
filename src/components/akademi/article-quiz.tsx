"use client";

/**
 * Mini quiz akhir artikel (owner 24 Okt: belajar aktif, bukan pasif).
 * Client-side murni — data quiz dari src/lib/akademi/learning-path.ts.
 */

import { useState } from "react";
import { ARTICLE_QUIZZES } from "@/lib/akademi/learning-path";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

export function ArticleQuiz({ slug }: { slug: string }) {
  const quiz = ARTICLE_QUIZZES[slug];
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [done, setDone] = useState(false);

  if (!quiz || quiz.length === 0) return null;

  const correct = picked.filter((p, i) => p !== null && p === quiz[i].answer).length;
  const allAnswered = picked.every((p) => p !== null);

  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null && picked[qi] !== undefined) return; // locked setelah pilih
    const next = [...picked];
    next[qi] = oi;
    setPicked(next);
  };

  return (
    <section className="mt-12 mb-8" aria-label="Quiz pemahaman materi">
      <div className="bg-bg-card rounded-xl depth-shadow border border-border p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 text-accent">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Uji Pemahaman</h2>
            <p className="text-xs text-text-tertiary">3 soal cepat — pastikan ilmunya nempel 🎯</p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {quiz.map((item, qi) => {
            const chosen = picked[qi];
            return (
              <div key={qi}>
                <p className="text-sm font-semibold text-text-primary mb-3">
                  {qi + 1}. {item.q}
                </p>
                <div className="grid gap-2">
                  {item.options.map((opt, oi) => {
                    const isChosen = chosen === oi;
                    const isAnswer = oi === item.answer;
                    const revealed = chosen !== null && chosen !== undefined;
                    let cls = "border-border bg-bg-primary hover:border-accent/50 hover:bg-accent/[0.04]";
                    if (revealed && isAnswer) cls = "border-bullish/50 bg-bullish/[0.08]";
                    else if (revealed && isChosen && !isAnswer) cls = "border-bearish/50 bg-bearish/[0.08]";
                    return (
                      <button
                        key={oi}
                        onClick={() => pick(qi, oi)}
                        disabled={revealed}
                        className={`flex items-center justify-between gap-3 text-left border rounded-lg px-4 py-2.5 text-sm transition-colors ${cls}`}
                      >
                        <span className="text-text-secondary">{opt}</span>
                        {revealed && isAnswer && <CheckCircle2 className="h-4 w-4 text-bullish shrink-0" />}
                        {revealed && isChosen && !isAnswer && <XCircle className="h-4 w-4 text-bearish shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {chosen !== null && chosen !== undefined && (
                  <p className="mt-2 text-xs text-text-secondary bg-bg-primary rounded-lg px-3 py-2 border border-border/60">
                    💡 {item.why}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {allAnswered && !done && (
          <div className="mt-6 p-4 rounded-lg bg-accent/[0.08] border border-accent/20 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-medium text-text-primary">
              Skor kamu: <span className="text-accent font-bold">{correct}/{quiz.length}</span>{" "}
              {correct === quiz.length ? "— sempurna! 🔥" : correct >= 2 ? "— bagus! Baca lagi bagian yang salah ya." : "— tidak apa-apa, ulangi baca pelan-pelan."}
            </p>
            <button
              onClick={() => { setPicked([]); setDone(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Ulangi
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
