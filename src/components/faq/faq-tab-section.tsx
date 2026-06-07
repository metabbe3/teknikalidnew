"use client";

import { useState, useCallback } from "react";
import { FAQSearch } from "./faq-search";
import { FAQAccordion } from "./faq-accordion";
import { QuestionSubmitForm } from "./question-submit-form";
import { useFAQList } from "@/hooks/use-faq";
import { MessageCircleQuestion } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "Semua" },
  { value: "indikator", label: "Indikator" },
  { value: "saham", label: "Saham" },
  { value: "trading", label: "Trading" },
  { value: "umum", label: "Umum" },
];

interface FAQTabSectionProps {
  initialFAQs: Array<{
    id: string;
    question: string;
    shortAnswer: string;
    slug: string;
    category: string;
    helpfulVotes: number;
  }>;
}

export function FAQTabSection({ initialFAQs }: FAQTabSectionProps) {
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useFAQList({
    category: category || undefined,
    q: searchQuery || undefined,
  });

  // Use fetched data if available, fall back to initial SSR data
  const faqs = data?.data
    ? Array.isArray(data.data)
      ? data.data
      : (data.data as { items: typeof initialFAQs }).items ?? initialFAQs
    : initialFAQs;

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search */}
      <FAQSearch onSearch={handleSearch} placeholder="Cari pertanyaan tentang saham, indikator, trading..." />

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
              category === cat.value
                ? "bg-accent text-white border-accent"
                : "bg-bg-card text-text-secondary border-border hover:border-accent/30 hover:text-accent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ list */}
      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg bg-bg-card p-4 animate-pulse">
              <div className="h-4 bg-bg-hover rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg-hover rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircleQuestion className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-secondary">
            {searchQuery
              ? `Tidak ada hasil untuk "${searchQuery}"`
              : "Belum ada pertanyaan. Jadilah yang pertama bertanya!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FAQAccordion
              key={faq.id}
              question={faq.question}
              shortAnswer={faq.shortAnswer}
              slug={faq.slug}
              category={faq.category}
              helpfulVotes={faq.helpfulVotes}
            />
          ))}
        </div>
      )}

      {/* Submit question */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircleQuestion className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Ada pertanyaan?
          </h3>
        </div>
        <QuestionSubmitForm />
      </div>
    </div>
  );
}
