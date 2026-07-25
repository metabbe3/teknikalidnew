import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/** Build a /berita URL preserving active filters. */
export function buildBeritaUrl(page: number, trend?: string, q?: string): string {
  const params = new URLSearchParams();
  if (trend) params.set("trend", trend);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/berita?${qs}` : "/berita";
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

/** Server-rendered pagination for the /berita briefing (preserves trend + q). */
export function BeritaPagination({
  currentPage,
  totalPages,
  trend,
  q,
}: {
  currentPage: number;
  totalPages: number;
  trend?: string;
  q?: string;
}) {
  if (totalPages <= 1) return null;
  const safe = Math.min(Math.max(1, currentPage), totalPages);

  const edge = "p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-gray-100 transition-colors";
  const disabled = "pointer-events-none opacity-30";

  return (
    <nav className="flex items-center justify-center gap-1 mt-10 select-none" aria-label="Navigasi halaman">
      <Link href={buildBeritaUrl(1, trend, q)} aria-label="Halaman pertama" className={`${edge} ${safe === 1 ? disabled : ""}`}>
        <ChevronsLeft className="h-4 w-4" />
      </Link>
      <Link href={buildBeritaUrl(safe - 1, trend, q)} aria-label="Halaman sebelumnya" className={`${edge} ${safe === 1 ? disabled : ""}`}>
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pageNumbers(safe, totalPages).map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-text-tertiary">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildBeritaUrl(p as number, trend, q)}
            aria-current={safe === p ? "page" : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              safe === p ? "bg-accent text-white" : "text-text-secondary hover:bg-gray-100"
            }`}
          >
            {p}
          </Link>
        ),
      )}

      <Link href={buildBeritaUrl(safe + 1, trend, q)} aria-label="Halaman selanjutnya" className={`${edge} ${safe === totalPages ? disabled : ""}`}>
        <ChevronRight className="h-4 w-4" />
      </Link>
      <Link href={buildBeritaUrl(totalPages, trend, q)} aria-label="Halaman terakhir" className={`${edge} ${safe === totalPages ? disabled : ""}`}>
        <ChevronsRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
