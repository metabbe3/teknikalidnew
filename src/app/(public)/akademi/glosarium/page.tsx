import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";
import { BookOpen, Search } from "lucide-react";
import { GlossarySearch } from "./glossary-search";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Glosarium Istilah Saham — TeknikalID",
  description:
    "Kamus lengkap istilah-istilah saham dan analisis teknikal. Pelajari arti RSI, MACD, Support, Resistance, dan istilah trading lainnya.",
  alternates: { canonical: "/akademi/glosarium" },
};

const CATEGORY_ORDER = ["teknikal", "fundamental", "pasar", "strategi"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  teknikal: "Analisis Teknikal",
  fundamental: "Analisis Fundamental",
  pasar: "Istilah Pasar",
  strategi: "Strategi Trading",
};

const CATEGORY_COLORS: Record<string, string> = {
  teknikal: "#8b5cf6",
  fundamental: "#2563eb",
  pasar: "#0d9488",
  strategi: "#f59e0b",
};

export default function GlossaryPage() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    color: CATEGORY_COLORS[cat],
    terms: GLOSSARY_TERMS.filter((t) => t.category === cat).sort((a, b) =>
      a.term.localeCompare(b.term)
    ),
  }));

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                Glosarium Istilah Saham
              </h1>
              <p className="text-sm text-text-tertiary mt-1">
                {GLOSSARY_TERMS.length} istilah dalam kamus
              </p>
            </div>
          </div>
          <p className="text-base text-text-secondary leading-relaxed max-w-2xl">
            Panduan lengkap istilah-istilah yang sering digunakan di dunia investasi dan analisis teknikal saham Indonesia.
          </p>
        </header>

        {/* Search */}
        <div className="mb-8">
          <GlossarySearch />
        </div>

        {/* Terms grouped by category */}
        <div id="glossary-list" className="space-y-10">
          {grouped.map(({ category, label, color, terms }) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <h2 className="text-lg font-semibold text-text-primary">
                  {label}
                </h2>
                <span className="text-xs font-mono text-text-tertiary">
                  ({terms.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {terms.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/akademi/glosarium/${t.slug}`}
                    className="group flex items-start gap-3 p-3.5 rounded-xl bg-bg-card border border-border hover:border-accent/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {t.term}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2 leading-relaxed">
                        {t.definition.slice(0, 100)}
                        {t.definition.length > 100 ? "..." : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
