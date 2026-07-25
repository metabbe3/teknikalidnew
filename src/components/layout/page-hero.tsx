import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

/**
 * PageHero — the canonical light "IDX Broadsheet" page header for public pages.
 * Section chrome (bordered, card-bg, max-w container) + a serif h1 via SectionHeading,
 * + an optional children slot (breath strip, pills, etc.).
 * Use this on every public page for a consistent header.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border bg-bg-card", className)}>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} className="mb-0" />
        {children && <div className="mt-5">{children}</div>}
      </div>
    </section>
  );
}
