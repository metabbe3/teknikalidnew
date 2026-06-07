"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuestionSubmit } from "@/hooks/use-faq";

const CATEGORIES = [
  { value: "indikator", label: "Indikator" },
  { value: "saham", label: "Saham" },
  { value: "trading", label: "Trading" },
  { value: "umum", label: "Umum" },
];

interface QuestionSubmitFormProps {
  onSuccess?: () => void;
}

export function QuestionSubmitForm({ onSuccess }: QuestionSubmitFormProps) {
  const { data: session, status } = useSession();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const submitMutation = useQuestionSubmit();

  const MAX_CHARS = 500;
  const remaining = MAX_CHARS - question.length;

  if (status === "loading") {
    return (
      <div className="border border-border rounded-lg bg-bg-card p-4">
        <div className="h-10 rounded bg-bg-hover animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="border border-border rounded-lg bg-bg-card p-4 text-center">
        <p className="text-sm text-text-secondary">
          <Link
            href="/auth/signin"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Login untuk bertanya
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || submitMutation.isPending) return;

    try {
      await submitMutation.mutateAsync({
        question: question.trim(),
        category: category || undefined,
      });
      setQuestion("");
      setCategory("");
      setSuccessMsg("Terima kasih! Pertanyaan Anda sedang ditinjau.");
      onSuccess?.();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch {
      // Error is handled by the mutation state
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="border border-border rounded-lg bg-bg-card p-4 space-y-3">
        <div>
          <textarea
            value={question}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setQuestion(e.target.value);
              }
            }}
            placeholder="Tulis pertanyaan Anda tentang analisis teknikal..."
            rows={3}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between mt-1">
            <span
              className={`text-[11px] font-mono ${
                remaining < 50
                  ? remaining < 0
                    ? "text-red-400"
                    : "text-amber-400"
                  : "text-text-tertiary"
              }`}
            >
              {remaining}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border bg-bg-hover px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer"
          >
            <option value="">Pilih kategori (opsional)</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!question.trim() || submitMutation.isPending}
            className="ml-auto px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitMutation.isPending ? "Mengirim..." : "Kirim Pertanyaan"}
          </button>
        </div>

        {submitMutation.error && (
          <p className="text-xs text-red-400">
            {submitMutation.error.message || "Terjadi kesalahan. Silakan coba lagi."}
          </p>
        )}

        {successMsg && (
          <p className="text-xs text-emerald-400">{successMsg}</p>
        )}
      </div>
    </form>
  );
}
