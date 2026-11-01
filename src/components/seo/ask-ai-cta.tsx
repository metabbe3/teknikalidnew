import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Blok CTA "Tanya AI" untuk landing SEO — server component (no JS needed).
 * question: contoh pertanyaan spesifik halaman (muncul sebagai tombol sekunder).
 */
export function AskAiCta({ question }: { question: string }) {
  const href = `/stocks?view=screener&ask=${encodeURIComponent(question)}`;
  return (
    <div className="mt-8 rounded-lg border border-border bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="text-2xl h-8 w-8 text-accent" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold">Tanya AI — gratis, tanpa login</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bingung mulai dari mana? Tanya langsung dalam bahasa sehari-hari — AI menjawab
            dari data pasar terbaru, bukan karangan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={href}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
            >
              {question}
            </Link>
            <Link
              href="/stocks?view=screener"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:bg-hover"
            >
              Lihat semua topik →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
