import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/constants";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Visual breadcrumbs + BreadcrumbList JSON-LD. Renders a compact mono nav and a
 * JSON-LD script for SERP rich results. The last item is the current page (no link).
 * JSON-LD is a static schema object (no user input), stringified into a raw script tag.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const itemListElement = items.map((it, i) => ({
    "@type": "ListItem" as const,
    position: i + 1,
    name: it.label,
    ...(it.href ? { item: `${SITE_URL}${it.href}` } : {}),
  }));
  const jsonLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <nav className="flex items-center gap-1.5 text-xs font-mono text-text-tertiary mb-6 overflow-hidden" aria-label="Breadcrumb">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
              {!last && it.href ? (
                <Link href={it.href} className="hover:text-accent transition-colors truncate">
                  {it.label}
                </Link>
              ) : (
                <span className="text-text-secondary truncate max-w-[220px]">{it.label}</span>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
