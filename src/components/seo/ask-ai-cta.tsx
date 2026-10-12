import Link from "next/link";

/**
 * Blok CTA "Tanya AI" untuk landing SEO — server component (no JS needed).
 * question: contoh pertanyaan spesifik halaman (muncul sebagai tombol sekunder).
 */
export function AskAiCta({ question }: { question: string }) {
  const href = `/stocks?view=screener&ask=${encodeURIComponent(question)}`;
  return (
    <div className="mt-8 rounded-lg border border-purple-200 bg-purple-50 p-5 dark:border-purple-900 dark:bg-purple-950">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>✨</span>
        <div className="flex-1">
          <p className="font-semibold">Tanya AI — gratis, tanpa login</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bingung mulai dari mana? Tanya langsung dalam bahasa sehari-hari — AI menjawab
            dari data pasar terbaru, bukan karangan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={href}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              ✨ {question}
            </Link>
            <Link
              href="/stocks?view=screener"
              className="rounded-lg border border-purple-300 px-4 py-2 text-sm font-semibold hover:bg-purple-100 dark:border-purple-800 dark:hover:bg-purple-900"
            >
              Lihat semua topik →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
